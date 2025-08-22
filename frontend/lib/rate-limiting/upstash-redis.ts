/**
 * Upstash/Redis rate limiting backend for production
 * Uses standard Redis or Upstash KV for persistent rate limiting
 */

import { validateTrustedIP } from './utils';
import { REDIS_URL, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_DB } from '@/lib/config/environment';

// Rate limit configurations
const RATE_LIMITS = {
  anonymous_auth: {
    max_requests: 5,
    window: 300, // 5 minutes
    max_requests_daily: 50,
    window_daily: 86400, // 24 hours
  },
  merge_operations: {
    max_requests: 3,
    window: 300, // 5 minutes
    max_requests_daily: 20,
    window_daily: 86400, // 24 hours
  },
  email_upgrade: {
    max_requests: 3,
    window: 300, // 5 minutes
    max_requests_daily: 20,
    window_daily: 86400, // 24 hours
  },
} as const;

// Redis client instance
let redisClient: any = null;

/**
 * Initialize Redis client
 */
async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Try to use Upstash Redis REST API first
    if (REDIS_URL && REDIS_URL.includes('upstash.com')) {
      const { Redis } = await import('@upstash/redis');
      redisClient = new Redis({
        url: REDIS_URL,
        token: REDIS_PASSWORD || '',
      });
      console.log('✅ Using Upstash Redis REST API');
    } else {
      // Use standard Redis client
      const Redis = await import('ioredis');
      redisClient = new Redis.default({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        db: REDIS_DB,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      console.log('✅ Using standard Redis client');
    }

    // Test connection
    await redisClient.ping();
    console.log('✅ Redis connection successful');
    
    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw new Error('Redis connection failed - rate limiting unavailable');
  }
}

/**
 * Check rate limit using Redis
 */
export async function checkRateLimit(
  key: string,
  limitType: keyof typeof RATE_LIMITS,
  requestIP: string,
  forwardedFor?: string
): Promise<{
  allowed: boolean;
  remaining_attempts?: number;
  reset_in_seconds?: number;
  retry_after?: string;
  error?: string;
}> {
  try {
    const config = RATE_LIMITS[limitType];
    const realIP = validateTrustedIP(requestIP, forwardedFor);
    const now = Math.floor(Date.now() / 1000);
    
    const redis = await getRedisClient();
    
    // Create rate limit keys
    const windowKey = `rate_limit:${limitType}:${realIP}:window`;
    const dailyKey = `rate_limit:${limitType}:${realIP}:daily`;
    
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Get current counts
    pipeline.get(windowKey);
    pipeline.get(dailyKey);
    pipeline.ttl(windowKey);
    pipeline.ttl(dailyKey);
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }
    
    const windowCount = parseInt(results[0][1] as string) || 0;
    const dailyCount = parseInt(results[1][1] as string) || 0;
    const windowTTL = results[2][1] as number;
    const dailyTTL = results[3][1] as number;
    
    // Check if limits exceeded
    if (windowCount >= config.max_requests) {
      const resetInSeconds = windowTTL > 0 ? windowTTL : config.window;
      return {
        allowed: false,
        remaining_attempts: 0,
        reset_in_seconds: Math.max(0, resetInSeconds),
        retry_after: new Date((now + resetInSeconds) * 1000).toISOString(),
        error: 'RATE_LIMITED'
      };
    }
    
    if (dailyCount >= config.max_requests_daily) {
      const resetInSeconds = dailyTTL > 0 ? dailyTTL : config.window_daily;
      return {
        allowed: false,
        remaining_attempts: 0,
        reset_in_seconds: Math.max(0, resetInSeconds),
        retry_after: new Date((now + resetInSeconds) * 1000).toISOString(),
        error: 'RATE_LIMITED'
      };
    }
    
    // Increment counters atomically
    const incrementPipeline = redis.pipeline();
    
    // Increment window counter
    incrementPipeline.incr(windowKey);
    incrementPipeline.expire(windowKey, config.window);
    
    // Increment daily counter
    incrementPipeline.incr(dailyKey);
    incrementPipeline.expire(dailyKey, config.window_daily);
    
    const incrementResults = await incrementPipeline.exec();
    
    if (!incrementResults) {
      throw new Error('Redis increment pipeline failed');
    }
    
    const newWindowCount = incrementResults[0][1] as number;
    const newDailyCount = incrementResults[2][1] as number;
    
    return {
      allowed: true,
      remaining_attempts: Math.max(0, config.max_requests - newWindowCount),
      reset_in_seconds: config.window,
    };
    
  } catch (error) {
    console.error('Redis rate limiting error:', error);
    
    // Fallback to deny in case of Redis failure
    return {
      allowed: false,
      remaining_attempts: 0,
      reset_in_seconds: 300,
      retry_after: new Date(Date.now() + 300000).toISOString(),
      error: 'RATE_LIMITED'
    };
  }
}

/**
 * Clear rate limits for testing
 */
export async function clearRateLimit(
  key: string,
  limitType: keyof typeof RATE_LIMITS,
  requestIP: string,
  forwardedFor?: string
): Promise<void> {
  try {
    const realIP = validateTrustedIP(requestIP, forwardedFor);
    const redis = await getRedisClient();
    
    const windowKey = `rate_limit:${limitType}:${realIP}:window`;
    const dailyKey = `rate_limit:${limitType}:${realIP}:daily`;
    
    await redis.del(windowKey, dailyKey);
  } catch (error) {
    console.error('Failed to clear rate limits:', error);
  }
}

/**
 * Check idempotency using Redis
 */
export async function checkIdempotency(
  idempotencyKey: string,
  ttlSeconds: number = 300
): Promise<{ exists: boolean; result?: any }> {
  try {
    const redis = await getRedisClient();
    const key = `idempotency:${idempotencyKey}`;
    
    const result = await redis.get(key);
    
    if (result) {
      return { exists: true, result };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Redis idempotency check error:', error);
    return { exists: false };
  }
}

/**
 * Store idempotency result using Redis
 */
export async function storeIdempotencyResult(
  idempotencyKey: string,
  result: any,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = `idempotency:${idempotencyKey}`;
    
    await redis.setex(key, ttlSeconds, JSON.stringify(result));
  } catch (error) {
    console.error('Redis idempotency store error:', error);
  }
}

/**
 * Generate idempotency key for request deduplication
 */
export function generateIdempotencyKey(operation: string, identifier: string): string {
  return `${operation}:${identifier}:${Date.now()}`;
}
