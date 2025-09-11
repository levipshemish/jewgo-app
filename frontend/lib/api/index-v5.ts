/**
 * V5 API Client - Main Export
 * 
 * Re-exports all v5 API client modules for easy importing.
 */

// Main client
export { ApiClientV5, apiClient } from './client-v5';

// Types
export type {
  ApiResponse,
  PaginatedResponse,
  EntityType,
  ApiError,
  RequestOptions,
  PaginationOptions,
  FilterOptions,
  SortOptions
} from './types-v5';

// Auth
export { AuthTokenManager } from './auth-v5';
export type { TokenPair, UserProfile } from './auth-v5';

// Cache
export { CacheManager } from './cache-v5';
export type { CacheEntry, CacheOptions } from './cache-v5';

// Retry
export { RetryManager } from './retry-v5';
export type { RetryOptions, RetryResult } from './retry-v5';

// Metrics
export { MetricsCollector, metricsCollector } from './metrics-v5';
export type { 
  Metric, 
  UsageMetric, 
  ErrorMetric, 
  MetricsConfig,
  PerformanceMetric
} from './metrics-v5';

// Utils
export {
  generateCorrelationId,
  buildQueryString,
  parseQueryString,
  deepMerge,
  debounce,
  throttle,
  retry,
  formatError,
  isEmpty,
  sanitizeForLogging,
  createUrl,
  parseResponseHeaders,
  isSuccessfulResponse,
  isClientError,
  isServerError,
  getErrorType,
  formatBytes,
  formatDuration
} from './utils-v5';

// Route factory
export { createRouteHandler } from './route-factory';

// Validation
export { 
  validateApiResponse, 
  validateRequestData, 
  safeValidate,
  EntitySchemas,
  getEntitySchema
} from './validation-v5';

// Circuit breaker
export { 
  CircuitBreaker, 
  CircuitBreakerManager, 
  circuitBreakerManager,
  CircuitState 
} from './circuit-breaker-v5';

// Request deduplication
export { 
  RequestDeduplicator, 
  EnhancedRequestDeduplicator, 
  requestDeduplicator,
  createRequestKey 
} from './request-deduplicator-v5';

// Performance monitoring
export { 
  PerformanceMonitor, 
  performanceMonitor
} from './performance-monitor-v5';

export type { 
  PerformanceThreshold,
  PerformanceAlert,
  PerformanceReport 
} from './performance-monitor-v5';