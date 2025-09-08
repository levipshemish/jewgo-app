/**
 * Rate limiting barrel exports
 * Re-exports all rate limiting functions from the main implementation
 */

export {
  checkRateLimit,
  clearRateLimit,
  checkIdempotency,
  storeIdempotencyResult,
  generateIdempotencyKey
} from './redis';

// Export backend information for debugging
export const rateLimitBackend = {
  type: 'redis-cloud',
  isProduction: true,
  standardRedisConfigured: true
};

// Centralized rate limit configuration
export const RATE_LIMIT_CONFIG = {
  email_auth: {
    max_requests: 5, // Reduced from 10
    window: 300, // 5 minutes
    max_requests_daily: 25, // Reduced from 50 for additional security
    window_daily: 86400, // 24 hours
  },
  anonymous_auth: {
    max_requests: 3, // Reduced from 5
    window: 300, // 5 minutes
    max_requests_daily: 25, // Reduced from 50
    window_daily: 86400, // 24 hours
  },
  password_reset: {
    max_requests: 3,
    window: 300, // 5 minutes
    max_requests_daily: 10,
    window_daily: 86400, // 24 hours
  },
} as const;
