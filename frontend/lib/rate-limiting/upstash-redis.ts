import { validateTrustedIP } from '@/lib/utils/auth-utils';

// Re-export validateTrustedIP for convenience
export { validateTrustedIP };

// Rate limiting configuration
const RATE_LIMITS = {
  anonymous_auth: {
    window: 3600, // 1 hour
    max_requests: 3,
    window_daily: 86400, // 24 hours
    max_requests_daily: 10
  },
  merge_operations: {
    window: 3600, // 1 hour
    max_requests: 5,
    window_daily: 86400, // 24 hours
    max_requests_daily: 20
  }
};

// Initialize Redis client with fallback for missing environment variables
let redis: any = null;

try {
  // Use standard Redis configuration from environment variables
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0;

  if (redisUrl) {
    // Use Redis URL if available
    const Redis = require('redis');
    redis = Redis.createClient({ url: redisUrl });
    redis.connect();
  } else if (redisHost) {
    // Use individual Redis configuration
    const Redis = require('redis');
    redis = Redis.createClient({
      socket: {
        host: redisHost,
        port: redisPort
      },
      password: redisPassword,
      database: redisDb
    });
    redis.connect();
  } else {
    console.warn('Redis environment variables not configured. Rate limiting will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Redis client:', error);
  redis = null;
}

/**
 * Enhanced rate limiting with improved UX responses
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
  // If Redis is not available, allow all requests (fail open for security)
  if (!redis) {
    console.warn('Redis not available, allowing request without rate limiting');
    return { allowed: true };
  }

  try {
    const config = RATE_LIMITS[limitType];
    const realIP = validateTrustedIP(requestIP, forwardedFor);
    const now = Math.floor(Date.now() / 1000);
    
    // Create rate limit keys
    const windowKey = `rate_limit:${limitType}:${realIP}:window`;
    const dailyKey = `rate_limit:${limitType}:${realIP}:daily`;
    
    // Check window limit
    const windowCount = await redis.get(windowKey) || 0;
    const windowExpiry = await redis.ttl(windowKey);
    
    // Check daily limit
    const dailyCount = await redis.get(dailyKey) || 0;
    const dailyExpiry = await redis.ttl(dailyKey);
    
    // Check if limits exceeded
    if (windowCount >= config.max_requests) {
      const resetInSeconds = windowExpiry > 0 ? windowExpiry : config.window;
      return {
        allowed: false,
        remaining_attempts: 0,
        reset_in_seconds: resetInSeconds,
        retry_after: new Date((now + resetInSeconds) * 1000).toISOString(),
        error: 'RATE_LIMITED'
      };
    }
    
    if (dailyCount >= config.max_requests_daily) {
      const resetInSeconds = dailyExpiry > 0 ? dailyExpiry : config.window_daily;
      return {
        allowed: false,
        remaining_attempts: 0,
        reset_in_seconds: resetInSeconds,
        retry_after: new Date((now + resetInSeconds) * 1000).toISOString(),
        error: 'RATE_LIMITED'
      };
    }
    
    // Increment counters
    const multi = redis.multi();
    
    // Window counter
    if (windowCount === 0) {
      multi.setEx(windowKey, config.window, '1');
    } else {
      multi.incr(windowKey);
    }
    
    // Daily counter
    if (dailyCount === 0) {
      multi.setEx(dailyKey, config.window_daily, '1');
    } else {
      multi.incr(dailyKey);
    }
    
    await multi.exec();
    
    // Get updated counts
    const newWindowCount = (windowCount || 0) + 1;
    const newDailyCount = (dailyCount || 0) + 1;
    
    return {
      allowed: true,
      remaining_attempts: Math.max(0, config.max_requests - newWindowCount),
      reset_in_seconds: windowExpiry > 0 ? windowExpiry : config.window
    };
    
      } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open for security - allow request to proceed when Redis is unavailable
      return { allowed: true };
    }
  }

/**
 * Generate idempotency key for merge operations
 */
export function generateIdempotencyKey(operation: string, userId: string): string {
  return `idempotency:${operation}:${userId}:${Date.now()}`;
}

/**
 * Check idempotency key to prevent duplicate operations
 */
export async function checkIdempotency(key: string, ttl: number = 3600): Promise<{
  exists: boolean;
  result?: any;
}> {
  if (!redis) {
    console.warn('Redis not available, skipping idempotency check');
    return { exists: false };
  }

  try {
    const result = await redis.get(key);
    if (result) {
      return { exists: true, result };
    }
    
    // Set placeholder to prevent race conditions
    await redis.setex(key, ttl, JSON.stringify({ processing: true }));
    return { exists: false };
  } catch (error) {
    console.error('Idempotency check error:', error);
    return { exists: false };
  }
}

/**
 * Store idempotency result
 */
export async function storeIdempotencyResult(key: string, result: any, ttl: number = 3600): Promise<void> {
  if (!redis) {
    console.warn('Redis not available, skipping idempotency result storage');
    return;
  }

  try {
    await redis.setEx(key, ttl, JSON.stringify(result));
  } catch (error) {
    console.error('Store idempotency result error:', error);
  }
}

/**
 * Clear rate limit for testing
 */
export async function clearRateLimit(key: string): Promise<void> {
  if (!redis) {
    console.warn('Redis not available, skipping rate limit clear');
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Clear rate limit error:', error);
  }
}
