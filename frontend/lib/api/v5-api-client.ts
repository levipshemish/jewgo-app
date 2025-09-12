/**
 * V5 API Client
 * 
 * This client provides a unified interface for all v5 API endpoints,
 * replacing the need for separate clients for different entity types.
 */

import { 
  V5_API_CONFIG, 
  V5_API_ENDPOINTS, 
  V5_ENTITY_TYPES,
  V5ApiResponse,
  V5SearchParams,
  V5EntityParams,
  V5EntityType,
  V5_API_ENABLED
} from './v5-api-config';

// Request options interface
export interface V5ApiRequestOptions extends RequestInit {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cache?: RequestCache;
}

// Error handling
export class V5ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: Response
  ) {
    super(message);
    this.name = 'V5ApiError';
  }
}

/**
 * V5 API Client Class
 */
export class V5ApiClient {
  private baseUrl: string;
  private defaultOptions: V5ApiRequestOptions;

  constructor(baseUrl: string = V5_API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      timeout: V5_API_CONFIG.TIMEOUT,
      retryAttempts: V5_API_CONFIG.RETRY_ATTEMPTS,
      retryDelay: V5_API_CONFIG.RETRY_DELAY,
      cache: 'default',
    };
  }

  /**
   * Clean up duplicate query parameters in URL
   */
  private cleanDuplicateParams(url: string): string {
    try {
      const [baseUrl, queryString] = url.split('?');
      if (!queryString) return url;
      
      const params = new URLSearchParams(queryString);
      const cleanedParams = new URLSearchParams();
      
      // Use set() to automatically deduplicate parameters
      for (const [key, value] of params.entries()) {
        cleanedParams.set(key, value);
      }
      
      return `${baseUrl}?${cleanedParams.toString()}`;
    } catch (error) {
      console.warn('Failed to clean duplicate params:', error);
      return url;
    }
  }

  /**
   * Make a request to the V5 API with retry logic
   */
  public async makeRequest<T>(
    endpoint: string,
    options: V5ApiRequestOptions = {}
  ): Promise<V5ApiResponse<T>> {
    const {
      timeout = this.defaultOptions.timeout,
      retryAttempts = this.defaultOptions.retryAttempts,
      retryDelay = this.defaultOptions.retryDelay,
      ...fetchOptions
    } = { ...this.defaultOptions, ...options };

    const url = this.cleanDuplicateParams(`${this.baseUrl}${endpoint}`);
    console.log('V5 API Client making request to:', url);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new V5ApiError(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code,
            response
          );
          return {
            success: false,
            data: null as any,
            error: error.message,
            message: 'Request failed'
          };
        }

        const data = await response.json();
        console.log('V5 API Client response data:', data);
        
        // Backend returns {data: [], next_cursor: null, prev_cursor: null, total_count: 207}
        // Extract the actual data array and return in expected frontend format
        return {
          success: true,
          data: data.data || data, // Use data.data if it exists, otherwise use data directly
          message: 'Request successful',
          next_cursor: data.next_cursor,
          prev_cursor: data.prev_cursor,
          total_count: data.total_count
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retryAttempts!) {
          await new Promise(resolve => setTimeout(resolve, retryDelay! * (attempt + 1)));
        }
      }
    }

    // Return error in expected format
    const error = lastError || new V5ApiError('Request failed after all retry attempts');
    return {
      success: false,
      data: null as any,
      error: error.message,
      message: 'Request failed'
    };
  }

  /**
   * Get entities (restaurants, synagogues, mikvah, stores)
   */
  async getEntities(params: V5EntityParams = {}): Promise<V5ApiResponse> {
    if (!params.entityType) {
      throw new V5ApiError('entityType is required');
    }
    
    const searchParams = new URLSearchParams();
    
    if (params.location) {
      // Align with backend: latitude/longitude
      searchParams.set('latitude', params.location.lat.toString());
      searchParams.set('longitude', params.location.lng.toString());
      if (params.location.radius) {
        searchParams.set('radius', params.location.radius.toString());
      }
    }
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Backend expects flat filter keys - use set to prevent duplicates
          searchParams.set(key, value.toString());
        }
      });
    }
    
    // Handle pagination parameters
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.cursor) searchParams.set('cursor', params.cursor);
    
    // Handle sort parameter - prioritize params.sort over filters.sort
    if (params.sort) {
      searchParams.set('sort', params.sort);
    } else if (params.filters && (params.filters as any).sort) {
      searchParams.set('sort', String((params.filters as any).sort));
    }
    
    if (params.order) searchParams.set('order', params.order);

    const endpoint = `${V5_API_ENDPOINTS.ENTITIES(params.entityType)}?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  /**
   * Get a specific entity by ID
   */
  async getEntity(id: string, entityType: V5EntityType): Promise<V5ApiResponse> {
    const endpoint = V5_API_ENDPOINTS.ENTITY_DETAILS(entityType, id);
    return this.makeRequest(endpoint);
  }

  /**
   * Search across all entities
   */
  async search(params: V5SearchParams): Promise<V5ApiResponse> {
    const searchParams = new URLSearchParams();
    // Align with backend: q, types, latitude/longitude
    if (params.query) searchParams.set('q', params.query);
    
    if (params.entityType) {
      const types = Array.isArray(params.entityType) ? params.entityType : [params.entityType];
      searchParams.set('types', types.join(','));
    }
    
    if (params.location) {
      searchParams.set('latitude', params.location.lat.toString());
      searchParams.set('longitude', params.location.lng.toString());
      if (params.location.radius) {
        searchParams.set('radius', params.location.radius.toString());
      }
    }
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(`filters[${key}]`, value.toString());
        }
      });
    }
    
    // Handle pagination parameters
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    
    // Handle sort parameter - prioritize params.sort over filters.sort
    if (params.sort) {
      searchParams.set('sort', params.sort);
    } else if (params.filters && (params.filters as any).sort) {
      searchParams.set('sort', String((params.filters as any).sort));
    }
    
    if (params.order) searchParams.set('order', params.order);

    const endpoint = `${V5_API_ENDPOINTS.SEARCH}?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, entityType?: V5EntityType): Promise<V5ApiResponse> {
    const searchParams = new URLSearchParams();
    // Align with backend: q and type
    searchParams.set('q', query);
    if (entityType) searchParams.set('type', entityType);
    
    const endpoint = `${V5_API_ENDPOINTS.SEARCH_SUGGESTIONS}?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  /**
   * Admin API methods
   */
  async getAdminUsers(params: Record<string, any> = {}): Promise<V5ApiResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `${V5_API_ENDPOINTS.ADMIN_USERS}?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  async getAdminUser(id: string): Promise<V5ApiResponse> {
    return this.makeRequest(V5_API_ENDPOINTS.ADMIN_USER_DETAILS(id));
  }

  async getAdminEntities(entityType: V5EntityType, params: Record<string, any> = {}): Promise<V5ApiResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `${V5_API_ENDPOINTS.ADMIN_ENTITIES(entityType)}?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  async getAdminEntity(entityType: V5EntityType, id: string): Promise<V5ApiResponse> {
    return this.makeRequest(V5_API_ENDPOINTS.ADMIN_ENTITY_DETAILS(entityType, id));
  }

  async getAdminAnalytics(params: Record<string, any> = {}): Promise<V5ApiResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `${V5_API_ENDPOINTS.ADMIN_ANALYTICS}?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  async getAdminSystemStatus(): Promise<V5ApiResponse> {
    return this.makeRequest(V5_API_ENDPOINTS.ADMIN_SYSTEM);
  }

  /**
   * Monitoring API methods
   */
  async getHealth(): Promise<V5ApiResponse> {
    return this.makeRequest(V5_API_ENDPOINTS.HEALTH);
  }

  async getMetrics(): Promise<V5ApiResponse> {
    return this.makeRequest(V5_API_ENDPOINTS.METRICS);
  }

  async getSystemStatus(): Promise<V5ApiResponse> {
    return this.makeRequest(V5_API_ENDPOINTS.SYSTEM_STATUS);
  }

  /**
   * Convenience methods for specific entity types
   */
  async getRestaurants(params: Omit<V5EntityParams, 'entityType'> = {}): Promise<V5ApiResponse> {
    return this.getEntities({ ...params, entityType: V5_ENTITY_TYPES.RESTAURANTS });
  }

  async getSynagogues(params: Omit<V5EntityParams, 'entityType'> = {}): Promise<V5ApiResponse> {
    return this.getEntities({ ...params, entityType: V5_ENTITY_TYPES.SYNAGOGUES });
  }

  async getMikvah(params: Omit<V5EntityParams, 'entityType'> = {}): Promise<V5ApiResponse> {
    return this.getEntities({ ...params, entityType: V5_ENTITY_TYPES.MIKVAH });
  }

  async getStores(params: Omit<V5EntityParams, 'entityType'> = {}): Promise<V5ApiResponse> {
    return this.getEntities({ ...params, entityType: V5_ENTITY_TYPES.STORES });
  }
}

// Default V5 API client instance
export const v5ApiClient = new V5ApiClient();

// Legacy API client that automatically routes to V5 when enabled
export class LegacyApiClient {
  private v5Client: V5ApiClient;
  private useV5: boolean;

  constructor() {
    this.v5Client = new V5ApiClient();
    this.useV5 = V5_API_ENABLED;
  }

  /**
   * Get restaurants (legacy endpoint) - REMOVED DUPLICATE METHOD
   * Using the main getRestaurants method from V5ApiClient instead
   */

  /**
   * Get synagogues (legacy endpoint)
   */
  async getSynagogues(params: any = {}): Promise<V5ApiResponse> {
    if (this.useV5) {
      return this.v5Client.getSynagogues(params);
    }
    
    // Fallback to legacy endpoint
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `/api/synagogues?${searchParams.toString()}`;
    return this.v5Client.makeRequest(endpoint);
  }

  /**
   * Get mikvah (legacy endpoint)
   */
  async getMikvah(params: any = {}): Promise<V5ApiResponse> {
    if (this.useV5) {
      return this.v5Client.getMikvah(params);
    }
    
    // Fallback to legacy endpoint
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `/api/mikvah?${searchParams.toString()}`;
    return this.v5Client.makeRequest(endpoint);
  }

  /**
   * Get stores (legacy endpoint)
   */
  async getStores(params: any = {}): Promise<V5ApiResponse> {
    if (this.useV5) {
      return this.v5Client.getStores(params);
    }
    
    // Fallback to legacy endpoint
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `/api/stores?${searchParams.toString()}`;
    return this.v5Client.makeRequest(endpoint);
  }

  /**
   * Search (legacy endpoint)
   */
  async search(params: any = {}): Promise<V5ApiResponse> {
    if (this.useV5) {
      return this.v5Client.search(params);
    }
    
    // Fallback to legacy endpoint
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    const endpoint = `/api/search?${searchParams.toString()}`;
    return this.v5Client.makeRequest(endpoint);
  }
}

// Default legacy API client instance
export const legacyApiClient = new LegacyApiClient();
