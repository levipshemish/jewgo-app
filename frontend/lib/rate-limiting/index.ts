/**
 * Rate limiting module index
 * Re-exports all rate limiting functions from the upstash-redis backend
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
