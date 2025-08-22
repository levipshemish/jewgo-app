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
} from './upstash-redis';



// Export backend information for debugging
export const rateLimitBackend = {
  type: 'upstash-redis',
  isProduction: true,
  standardRedisConfigured: true
};
