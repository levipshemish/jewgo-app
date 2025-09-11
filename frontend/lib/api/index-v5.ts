/**
 * V5 API client exports and singleton instance.
 */

export { ApiClientV5 } from './client-v5';
export { AuthTokenManager } from './auth-v5';
export { CacheManager } from './cache-v5';
export { RetryManager } from './retry-v5';
export { MetricsCollector } from './metrics-v5';
export { circuitBreakerManager } from './circuit-breaker-v5';
export { performanceMonitor } from './performance-monitor-v5';

// Export types
export type {
  EntityType,
  ApiResponse,
  PaginatedResponse,
  ApiError,
  RequestOptions,
  EntityFilters,
  PaginationOptions
} from './types-v5';

// Create and export singleton API client instance
import { ApiClientV5 } from './client-v5';

export const apiClient = new ApiClientV5();