/**
 * Consolidated v5 API client with enhanced error handling and caching.
 * 
 * This client provides a unified interface to all v5 backend APIs with
 * automatic retry, caching, authentication, and comprehensive error handling.
 * Replaces multiple individual API clients and provides consistent patterns.
 */

import { ApiResponse, PaginatedResponse, EntityType, ApiError, RequestOptions, EntityFilters, PaginationOptions } from './types-v5';
import { AuthTokenManager, TokenPair, UserProfile } from './auth-v5';
import { CacheManager } from './cache-v5';
import { RetryManager } from './retry-v5';
import { MetricsCollector } from './metrics-v5';
import { validateApiResponse, EntitySchemas } from './validation-v5';
import { circuitBreakerManager } from './circuit-breaker-v5';
import { requestDeduplicator, createRequestKey } from './request-deduplicator-v5';
import { performanceMonitor } from './performance-monitor-v5';

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTtl: number;
  enableMetrics: boolean;
  enableEtag: boolean;
}

// Types are imported from types-v5.ts to avoid duplication

export class ApiClientV5 {
  private config: ApiClientConfig;
  private authManager: AuthTokenManager;
  private cacheManager: CacheManager;
  private retryManager: RetryManager;
  private metricsCollector: MetricsCollector;
  private requestId: number = 0;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTtl: 300000, // 5 minutes
      enableMetrics: true,
      enableEtag: true,
      ...config
    };

    this.authManager = AuthTokenManager;
    this.cacheManager = CacheManager;
    this.retryManager = RetryManager;
    this.metricsCollector = MetricsCollector.getInstance();
  }

  /**
   * Make a raw HTTP request with full feature support
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const requestId = ++this.requestId;
    const startTime = Date.now();
    
    try {
      // Build request configuration
      const requestConfig = await this.buildRequestConfig(endpoint, options);
      
      // Create request key for deduplication
      const requestKey = createRequestKey(requestConfig.url, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: requestConfig.body
      });

      // Use request deduplication for GET requests
      if (options.method === 'GET' || !options.method) {
        const deduplicationResult = await requestDeduplicator.deduplicateWithCorrelation(
          requestKey,
          async () => {
            // Check cache first
            const cachedResponse = await this.getCachedResponse<T>(requestConfig.url, requestConfig.headers);
            if (cachedResponse) {
              return cachedResponse;
            }

            // Execute request with circuit breaker and retry logic
            return circuitBreakerManager.execute(
              `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
              async () => {
                const retryResult = await RetryManager.execute(async () => {
                  return this.executeRequest(requestConfig);
                });

                if (!retryResult.success) {
                  throw new Error(retryResult.error || 'Request failed after retries');
                }

                return retryResult.data!;
              }
            );
          }
        );

        // Parse and validate response
        const apiResponse = deduplicationResult.result instanceof Response 
          ? await this.parseResponse<T>(deduplicationResult.result, requestConfig)
          : deduplicationResult.result as ApiResponse<T>;

        // Cache successful responses
        if (options.cache !== false) {
          await this.cacheResponse(requestConfig.url, apiResponse, options.cacheTtl);
        }

        // Record performance metrics
        const duration = Date.now() - startTime;
        performanceMonitor.recordApiCall(
          endpoint,
          requestConfig.method || 'GET',
          duration,
          apiResponse.status,
          JSON.stringify(apiResponse.data).length,
          {
            request_id: requestId.toString(),
            correlation_id: deduplicationResult.correlationId,
            was_deduplicated: deduplicationResult.wasDeduplicated.toString()
          }
        );

        return apiResponse;
      } else {
        // For non-GET requests, use circuit breaker and retry without deduplication
        const response = await circuitBreakerManager.execute(
          `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
          async () => {
            const retryResult = await RetryManager.execute(async () => {
              return this.executeRequest(requestConfig);
            });

            if (!retryResult.success) {
              throw new Error(retryResult.error || 'Request failed after retries');
            }

            return retryResult.data!;
          }
        );

        // Parse and validate response
        const apiResponse = await this.parseResponse<T>(response, requestConfig);

        // Record performance metrics
        const duration = Date.now() - startTime;
        performanceMonitor.recordApiCall(
          endpoint,
          requestConfig.method || 'GET',
          duration,
          apiResponse.status,
          JSON.stringify(apiResponse.data).length,
          {
            request_id: requestId.toString()
          }
        );

        return apiResponse;
      }

    } catch (error) {
      // Record error metrics
      const duration = Date.now() - startTime;
      performanceMonitor.recordApiCall(
        endpoint,
        options.method || 'GET',
        duration,
        0, // Error status
        0, // No response size
        {
          request_id: requestId.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      
      // Transform and throw API error
      throw this.transformError(error, endpoint, requestId);
    }
  }

  /**
   * Convenience methods for HTTP verbs
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Get entities with filtering and pagination
   */
  async getEntities<T = any>(
    entityType: EntityType,
    filters: EntityFilters = {},
    pagination: PaginationOptions = {},
    options: RequestOptions = {}
  ): Promise<PaginatedResponse<T>> {
    // Validate entity type
    if (!Object.keys(EntitySchemas).includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }
    const queryParams = new URLSearchParams();

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'location' && typeof value === 'object') {
          queryParams.append('latitude', value.latitude.toString());
          queryParams.append('longitude', value.longitude.toString());
          if (value.radius) {
            queryParams.append('radius', value.radius.toString());
          }
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    // Add pagination
    if (pagination.cursor) queryParams.append('cursor', pagination.cursor);
    if (pagination.limit) queryParams.append('limit', pagination.limit.toString());
    if (pagination.sort) queryParams.append('sort', pagination.sort);

    const endpoint = `/api/v5/${entityType}?${queryParams.toString()}`;
    
    const response = await this.request<PaginatedResponse<T>>(endpoint, {
      method: 'GET',
      ...options
    });
    
    // Ensure pagination property exists
    if (response.data && !response.data.pagination) {
      response.data.pagination = {
        has_more: false,
        cursor: undefined,
        next_cursor: undefined
      };
    }
    
    return response.data;
  }

  /**
   * Get single entity by ID
   */
  async getEntity<T = any>(
    entityType: EntityType,
    entityId: number | string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const endpoint = `/api/v5/${entityType}/${entityId}`;
    
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Create new entity
   */
  async createEntity<T = any>(
    entityType: EntityType,
    data: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const endpoint = `/api/v5/${entityType}`;
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data,
      cache: false,
      idempotencyKey: options.idempotencyKey || this.generateIdempotencyKey(),
      ...options
    });
  }

  /**
   * Update existing entity
   */
  async updateEntity<T = any>(
    entityType: EntityType,
    entityId: number | string,
    data: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const endpoint = `/api/v5/${entityType}/${entityId}`;
    
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
      cache: false,
      idempotencyKey: options.idempotencyKey || this.generateIdempotencyKey(),
      ...options
    });
  }

  /**
   * Delete entity
   */
  async deleteEntity(
    entityType: EntityType,
    entityId: number | string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<void>> {
    const endpoint = `/api/v5/${entityType}/${entityId}`;
    
    return this.request<void>(endpoint, {
      method: 'DELETE',
      cache: false,
      ...options
    });
  }

  /**
   * Unified search across all entity types
   */
  async search<T = any>(
    query: string,
    entityTypes?: EntityType[],
    options: {
      location?: { latitude: number; longitude: number; radius?: number };
      includeFacets?: boolean;
      filters?: Record<string, any>;
      pagination?: PaginationOptions;
    } = {},
    requestOptions: RequestOptions = {}
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('q', query);
    
    if (entityTypes?.length) {
      queryParams.append('types', entityTypes.join(','));
    }
    
    if (options.location) {
      queryParams.append('latitude', options.location.latitude.toString());
      queryParams.append('longitude', options.location.longitude.toString());
      if (options.location.radius) {
        queryParams.append('radius', options.location.radius.toString());
      }
    }
    
    if (options.includeFacets) {
      queryParams.append('facets', 'true');
    }
    
    // Add filters
    Object.entries(options.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    // Add pagination
    if (options.pagination?.cursor) {
      queryParams.append('cursor', options.pagination.cursor);
    }
    if (options.pagination?.limit) {
      queryParams.append('limit', options.pagination.limit.toString());
    }

    const endpoint = `/api/v5/search?${queryParams.toString()}`;
    
    return this.request<T>(endpoint, {
      method: 'GET',
      ...requestOptions
    });
  }

  /**
   * Search within specific entity type
   */
  async searchEntity<T = any>(
    entityType: EntityType,
    query: string,
    options: {
      location?: { latitude: number; longitude: number; radius?: number };
      includeFacets?: boolean;
      filters?: Record<string, any>;
      pagination?: PaginationOptions;
    } = {},
    requestOptions: RequestOptions = {}
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('q', query);
    
    if (options.location) {
      queryParams.append('latitude', options.location.latitude.toString());
      queryParams.append('longitude', options.location.longitude.toString());
      if (options.location.radius) {
        queryParams.append('radius', options.location.radius.toString());
      }
    }
    
    if (options.includeFacets) {
      queryParams.append('facets', 'true');
    }
    
    // Add filters
    Object.entries(options.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    // Add pagination
    if (options.pagination?.cursor) {
      queryParams.append('cursor', options.pagination.cursor);
    }
    if (options.pagination?.limit) {
      queryParams.append('limit', options.pagination.limit.toString());
    }

    const endpoint = `/api/v5/search/${entityType}?${queryParams.toString()}`;
    
    return this.request<T>(endpoint, {
      method: 'GET',
      ...requestOptions
    });
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(
    query: string,
    entityType?: EntityType,
    limit?: number,
    options: RequestOptions = {}
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    
    if (entityType) queryParams.append('type', entityType);
    if (limit) queryParams.append('limit', limit.toString());

    const endpoint = `/api/v5/search/suggestions?${queryParams.toString()}`;
    
    return this.request(endpoint, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Authentication methods
   */
  async login(email: string, password: string, rememberMe?: boolean): Promise<ApiResponse<any>> {
    return this.request('/api/v5/auth/login', {
      method: 'POST',
      body: { email, password, remember_me: rememberMe },
      cache: false
    });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/v5/auth/register', {
      method: 'POST',
      body: userData,
      cache: false
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request('/api/v5/auth/logout', {
      method: 'POST',
      cache: false
    });
  }

  async refreshToken(): Promise<ApiResponse<any>> {
    const refreshToken = AuthTokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError('No refresh token available', 401, 'AUTH_REQUIRED');
    }

    return this.request('/api/v5/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      cache: false
    });
  }

  /**
   * Review methods
   */
  async getReviews(
    entityType: EntityType,
    entityId: number,
    options: {
      rating?: number;
      verifiedOnly?: boolean;
      pagination?: PaginationOptions;
    } = {},
    requestOptions: RequestOptions = {}
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    if (options.rating) queryParams.append('rating', options.rating.toString());
    if (options.verifiedOnly) queryParams.append('verified', 'true');
    if (options.pagination?.cursor) queryParams.append('cursor', options.pagination.cursor);
    if (options.pagination?.limit) queryParams.append('limit', options.pagination.limit.toString());

    const endpoint = `/api/v5/reviews/${entityType}/${entityId}?${queryParams.toString()}`;
    
    return this.request(endpoint, {
      method: 'GET',
      ...requestOptions
    });
  }

  async createReview(
    entityType: EntityType,
    entityId: number,
    reviewData: {
      rating: number;
      content: string;
      title?: string;
      visitDate?: string;
      tags?: string[];
      wouldRecommend?: boolean;
    },
    options: RequestOptions = {}
  ): Promise<ApiResponse<any>> {
    const endpoint = `/api/v5/reviews/${entityType}/${entityId}`;
    
    return this.request(endpoint, {
      method: 'POST',
      body: reviewData,
      cache: false,
      idempotencyKey: options.idempotencyKey || this.generateIdempotencyKey(),
      ...options
    });
  }

  /**
   * Metrics methods
   */
  async getHealthMetrics(): Promise<ApiResponse<any>> {
    return this.request('/api/v5/metrics/health', {
      method: 'GET',
      cache: false // Health metrics should be real-time
    });
  }

  async getPublicStats(): Promise<ApiResponse<any>> {
    return this.request('/api/v5/metrics/public/stats', {
      method: 'GET',
      cacheTtl: 300000 // 5 minutes cache for public stats
    });
  }

  /**
   * Private helper methods
   */
  private async buildRequestConfig(endpoint: string, options: RequestOptions): Promise<{
    url: string;
    headers: Record<string, string>;
    method: string;
    body?: string;
    signal?: AbortSignal;
  }> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': 'v5',
      'X-Request-ID': this.generateRequestId(),
      ...options.headers
    };

    // Add authentication header
    const accessToken = AuthTokenManager.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add idempotency key for non-GET requests
    if (options.idempotencyKey && options.method !== 'GET') {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    // Add ETag support for GET requests
    if (this.config.enableEtag && (options.method === 'GET' || !options.method)) {
      const cachedEtag = CacheManager.getEtag(url);
      if (cachedEtag) {
        headers['If-None-Match'] = cachedEtag;
      }
    }

    return {
      url,
      headers,
      method: options.method || 'GET',
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.abortSignal
    };
  }

  private async executeRequest(config: {
    url: string;
    headers: Record<string, string>;
    method: string;
    body?: string;
    signal?: AbortSignal;
  }): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: config.signal || controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async parseResponse<T>(response: Response, config: any): Promise<ApiResponse<T>> {
    // Handle 304 Not Modified
    if (response.status === 304) {
      const cachedResponse = CacheManager.get<ApiResponse<T>>(config.url);
      if (cachedResponse) {
        return cachedResponse.data;
      }
    }

    // Handle non-JSON responses
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (response.ok) {
        return {
          data: null as T,
          success: true,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
      } else {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          'HTTP_ERROR'
        );
      }
    }

    const responseData = await response.json();

    if (!response.ok) {
      throw new ApiError(
        responseData.error || `HTTP ${response.status}`,
        response.status,
        responseData.code || 'API_ERROR',
        responseData
      );
    }

    return {
      data: responseData,
      success: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  private async getCachedResponse<T>(url: string, _headers: Record<string, string>): Promise<ApiResponse<T> | null> {
    if (!this.config.enableEtag) {
      const cached = CacheManager.get<ApiResponse<T>>(url);
      return cached ? cached.data : null;
    }

    // Check if we have a cached response with ETag
    const cachedResponse = CacheManager.get<ApiResponse<T>>(url);
    const cachedEtag = CacheManager.getEtag(url);

    if (cachedResponse && cachedEtag) {
      return cachedResponse.data;
    }

    return null;
  }

  private async cacheResponse<T>(url: string, response: ApiResponse<T>, ttl?: number): Promise<void> {
    const cacheTtl = ttl || this.config.cacheTtl;
    
    // Cache the response
    CacheManager.set(url, response, undefined, cacheTtl);

    // Cache ETag if present
    if (this.config.enableEtag && response.headers?.etag) {
      CacheManager.setEtag(url, response.headers.etag, cacheTtl);
    }
  }

  private transformError(error: any, endpoint: string, requestId: number): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new ApiError('Request timeout', 408, 'TIMEOUT', { endpoint, requestId });
    }

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return new ApiError('Network error', 0, 'NETWORK_ERROR', { endpoint, requestId });
    }

    return new ApiError(
      error.message || 'Unknown error',
      500,
      'UNKNOWN_ERROR',
      { endpoint, requestId, originalError: error }
    );
  }

  private recordMetrics(
    type: 'performance' | 'error' | 'usage',
    endpoint: string,
    duration: number,
    statusCode?: number,
    error?: any
  ): void {
    if (!this.config.enableMetrics) return;

    if (type === 'error') {
      this.metricsCollector.recordError(
        error?.constructor?.name || 'UnknownError',
        error?.message,
        error?.stack,
        { endpoint, statusCode: statusCode?.toString() || 'unknown' }
      );
    } else if (type === 'performance') {
      this.metricsCollector.recordPerformance(
        endpoint,
        duration,
        { statusCode: statusCode?.toString() || 'unknown' }
      );
    } else {
      this.metricsCollector.recordUsage(
        endpoint,
        'api_call',
        true,
        { statusCode: statusCode?.toString() || 'unknown' }
      );
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Utility methods for cache management
   */
  clearCache(): void {
    CacheManager.clear();
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      CacheManager.invalidate(pattern);
    }
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken?: string): void {
    const tokens: TokenPair = {
      access_token: accessToken,
      refresh_token: refreshToken || '',
      expires_in: 3600, // Default 1 hour
      token_type: 'Bearer'
    };
    
    const user: UserProfile = {
      id: 0, // Placeholder
      email: '',
      name: '',
      roles: ['user'],
      is_active: true
    };
    
    AuthTokenManager.setTokens(tokens, user);
  }

  /**
   * Clear authentication tokens
   */
  clearAuth(): void {
    AuthTokenManager.clearTokens();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return AuthTokenManager.isAuthenticated();
  }

  /**
   * Get current user info from token
   */
  getCurrentUser(): any {
    return AuthTokenManager.getCurrentUser();
  }
}

// Export singleton instance
export const apiClient = new ApiClientV5();
export default apiClient;