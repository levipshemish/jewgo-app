/**
 * Rate limiting module with environment-based backend selection
 * Uses standard Redis in production, in-memory storage for development
 */

import { IS_PRODUCTION } from '@/lib/config/environment';

// Import docker-redis implementation
import * as dockerRedis from './docker-redis';

// Use docker-redis for now (simplified)
const selectedBackend = dockerRedis;

// Export functions from the selected backend
export const checkRateLimit = selectedBackend.checkRateLimit;
export const clearRateLimit = selectedBackend.clearRateLimit;
export const checkIdempotency = selectedBackend.checkIdempotency;
export const storeIdempotencyResult = selectedBackend.storeIdempotencyResult;
export const generateIdempotencyKey = selectedBackend.generateIdempotencyKey;

// Export utility functions
export * from './utils';

// Export backend information for debugging
export const rateLimitBackend = {
  type: IS_PRODUCTION ? 'standard-redis' : 'in-memory',
  isProduction: IS_PRODUCTION,
  standardRedisConfigured: !!(process.env.REDIS_URL || (process.env.REDIS_HOST && process.env.REDIS_PASSWORD))
};
