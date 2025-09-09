/**
 * Unified API utility for consistent API calls across all pages
 * 
 * This utility provides:
 * - Request deduplication
 * - Consistent caching
 * - Error handling
 * - Performance monitoring
 * - Unified response format
 */

import { deduplicatedFetch } from './request-deduplication';

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 2 * 60 * 1000, // 2 minutes
  LONG_TTL: 5 * 60 * 1000,    // 5 minutes
  SHORT_TTL: 30 * 1000,       // 30 seconds
} as const;

// In-memory cache for API responses
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Performance monitoring
const performanceMetrics = {
  requestCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
};

export interface UnifiedApiOptions {
  /** Cache TTL in milliseconds */
  ttl?: number;
  /** Whether to use request deduplication */
  deduplicate?: boolean;
  /** Custom cache key */
  cacheKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to retry on failure */
  retry?: boolean;
  /** Number of retry attempts */
  retryAttempts?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

export interface UnifiedApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  cached?: boolean;
  performance?: {
    requestTime: number;
    cacheHit: boolean;
    retryCount: number;
  };
}

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options?: UnifiedApiOptions): string {
  if (options?.cacheKey) {
    return options.cacheKey;
  }
  
  const method = 'GET'; // We only support GET for now
  const params = new URL(url).searchParams.toString();
  return `${method}:${url.split('?')[0]}:${params}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached: { data: any; timestamp: number; ttl: number }): boolean {
  return Date.now() - cached.timestamp < cached.ttl;
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  responseCache.forEach((value, key) => {
    if (now - value.timestamp >= value.ttl) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    responseCache.delete(key);
  });
}

/**
 * Unified API call function
 */
export async function unifiedApiCall<T = any>(
  url: string,
  options: UnifiedApiOptions = {}
): Promise<UnifiedApiResponse<T>> {
  const startTime = Date.now();
  const {
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    deduplicate = true,
    timeout = 10000,
    retry = true,
    retryAttempts = 2,
    retryDelay = 1000,
  } = options;

  // Clean up expired cache entries periodically
  if (performanceMetrics.requestCount % 10 === 0) {
    cleanupCache();
  }

  performanceMetrics.requestCount++;

  const cacheKey = generateCacheKey(url, options);
  
  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    performanceMetrics.cacheHits++;
    return {
      success: true,
      data: cached.data,
      cached: true,
      performance: {
        requestTime: Date.now() - startTime,
        cacheHit: true,
        retryCount: 0,
      },
    };
  }

  performanceMetrics.cacheMisses++;

  // Perform the API call with retry logic
  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= (retry ? retryAttempts : 0); attempt++) {
    try {
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(timeout),
      };

      let response: any;
      
      if (deduplicate) {
        response = await deduplicatedFetch<T>(url, fetchOptions);
      } else {
        const res = await fetch(url, fetchOptions);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        response = await res.json();
      }

      // Cache the successful response
      responseCache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
        ttl,
      });

      return {
        success: true,
        data: response,
        cached: false,
        performance: {
          requestTime: Date.now() - startTime,
          cacheHit: false,
          retryCount,
        },
      };

    } catch (error) {
      lastError = error as Error;
      retryCount = attempt;
      
      if (attempt < (retry ? retryAttempts : 0)) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  performanceMetrics.errors++;

  return {
    success: false,
    data: null as T,
    error: lastError?.message || 'Unknown error occurred',
    cached: false,
    performance: {
      requestTime: Date.now() - startTime,
      cacheHit: false,
      retryCount,
    },
  };
}

/**
 * Specialized function for restaurant data with unified endpoint
 */
export async function getUnifiedRestaurantData(params: Record<string, any> = {}): Promise<UnifiedApiResponse> {
  const searchParams = new URLSearchParams();
  
  // Add all relevant parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });

  const url = `/api/restaurants/unified?${searchParams.toString()}`;
  
  return unifiedApiCall(url, {
    ttl: CACHE_CONFIG.DEFAULT_TTL,
    deduplicate: true,
    cacheKey: `unified-restaurants:${searchParams.toString()}`,
  });
}

/**
 * Specialized function for synagogues data
 */
export async function getUnifiedSynagogueData(params: Record<string, any> = {}): Promise<UnifiedApiResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `/api/synagogues/unified?${searchParams.toString()}`;
  
  return unifiedApiCall(url, {
    ttl: CACHE_CONFIG.LONG_TTL, // Synagogues change less frequently
    deduplicate: true,
  });
}

/**
 * Specialized function for marketplace data
 */
export async function getUnifiedMarketplaceData(params: Record<string, any> = {}): Promise<UnifiedApiResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `/api/marketplace?${searchParams.toString()}`;
  
  return unifiedApiCall(url, {
    ttl: CACHE_CONFIG.SHORT_TTL, // Marketplace data changes frequently
    deduplicate: true,
  });
}

/**
 * Specialized function for shtel listings
 */
export async function getUnifiedShtelData(params: Record<string, any> = {}): Promise<UnifiedApiResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `/api/shtel-listings?${searchParams.toString()}`;
  
  return unifiedApiCall(url, {
    ttl: CACHE_CONFIG.DEFAULT_TTL,
    deduplicate: true,
  });
}

/**
 * Specialized function for mikvah data
 */
export async function getUnifiedMikvahData(params: Record<string, any> = {}): Promise<UnifiedApiResponse> {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `/api/mikvah?${searchParams.toString()}`;
  
  return unifiedApiCall(url, {
    ttl: CACHE_CONFIG.LONG_TTL, // Mikvah data changes infrequently
    deduplicate: true,
  });
}

/**
 * Clear all cached data
 */
export function clearUnifiedApiCache(): void {
  responseCache.clear();
}

/**
 * Get performance metrics
 */
export function getUnifiedApiMetrics() {
  return {
    ...performanceMetrics,
    cacheHitRate: performanceMetrics.requestCount > 0 
      ? `${(performanceMetrics.cacheHits / performanceMetrics.requestCount * 100).toFixed(2)}%`
      : '0%',
    cacheSize: responseCache.size,
  };
}

/**
 * Preload data for better performance
 */
export async function preloadUnifiedData(
  endpoints: Array<{ url: string; params?: Record<string, any> }>
): Promise<void> {
  const promises = endpoints.map(({ url, params = {} }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    const fullUrl = `${url}?${searchParams.toString()}`;
    return unifiedApiCall(fullUrl, { ttl: CACHE_CONFIG.DEFAULT_TTL });
  });

  await Promise.allSettled(promises);
}
