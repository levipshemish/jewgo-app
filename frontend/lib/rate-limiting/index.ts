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
