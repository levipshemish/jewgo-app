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
  },
  email_upgrade: {
    window: 3600, // 1 hour
    max_requests: 3,
    window_daily: 86400, // 24 hours
    max_requests_daily: 10
  }
};

// Initialize Upstash Redis client
let redis: any = null;

// Initialize Upstash Redis client asynchronously
async function initializeRedis() {
  try {
    const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashRedisUrl || !upstashRedisToken) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }

    // Import Upstash Redis client
    const { Redis } = await import('@upstash/redis');
    return new Redis({
      url: upstashRedisUrl,
      token: upstashRedisToken,
    });
  } catch (error) {
    console.error('Failed to initialize Upstash Redis client:', error);
    throw error; // Fail fast - don't allow requests without rate limiting
  }
}

// Initialize Redis client
initializeRedis().then(client => {
  redis = client;
}).catch(error => {
  console.error('Failed to initialize Upstash Redis client:', error);
  // Don't set redis to null - let the error propagate
});

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
  // If Redis is not available, throw error (fail closed for security)
  if (!redis) {
    throw new Error('Upstash Redis not available - rate limiting required');
  }

  try {
    const config = RATE_LIMITS[limitType];
    const realIP = validateTrustedIP(requestIP, forwardedFor);
    const now = Math.floor(Date.now() / 1000);
    
    // Create rate limit keys
    const windowKey = `rate_limit:${limitType}:${realIP}:window`;
    const dailyKey = `rate_limit:${limitType}:${realIP}:daily`;
    
    // Check window limit
    const windowCount = parseInt(await redis.get(windowKey) || '0', 10);
    const windowExpiry = await redis.ttl(windowKey);
    
    // Check daily limit
    const dailyCount = parseInt(await redis.get(dailyKey) || '0', 10);
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
    
    // Increment counters using Upstash Redis commands
    const multi = redis.pipeline();
    
    // Window counter
    if (windowCount === 0) {
      multi.setex(windowKey, config.window, '1');
    } else {
      multi.incr(windowKey);
    }
    
    // Daily counter
    if (dailyCount === 0) {
      multi.setex(dailyKey, config.window_daily, '1');
    } else {
      multi.incr(dailyKey);
    }
    
    await multi.exec();
    
    // Get updated counts
    const newWindowCount = windowCount + 1;
    const newDailyCount = dailyCount + 1;
    
    return {
      allowed: true,
      remaining_attempts: Math.max(0, config.max_requests - newWindowCount),
      reset_in_seconds: windowExpiry > 0 ? windowExpiry : config.window
    };
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail closed for security - reject request when Redis is unavailable
    throw error;
  }
}

/**
 * Generate idempotency key for merge operations
 */
export function generateIdempotencyKey(operation: string, userKey: string): string {
  return `idempotency:${operation}:${userKey}`;
}

/**
 * Check idempotency key to prevent duplicate operations
 */
export async function checkIdempotency(key: string, ttl: number = 3600): Promise<{
  exists: boolean;
  result?: any;
}> {
  if (!redis) {
    throw new Error('Upstash Redis not available - idempotency check required');
  }

  try {
    const result = await redis.get(key);
    if (result) {
      // Parse the stored JSON value before returning
      return { exists: true, result: JSON.parse(result) };
    }
    
    // Set placeholder to prevent race conditions
    await redis.setex(key, ttl, JSON.stringify({ processing: true }));
    return { exists: false };
  } catch (error) {
    console.error('Idempotency check error:', error);
    throw error;
  }
}

/**
 * Store idempotency result
 */
export async function storeIdempotencyResult(key: string, result: any, ttl: number = 3600): Promise<void> {
  if (!redis) {
    throw new Error('Upstash Redis not available - idempotency result storage required');
  }

  try {
    await redis.setex(key, ttl, JSON.stringify(result));
  } catch (error) {
    console.error('Store idempotency result error:', error);
    throw error;
  }
}

/**
 * Clear rate limit for testing
 */
export async function clearRateLimit(key: string): Promise<void> {
  if (!redis) {
    throw new Error('Upstash Redis not available - rate limit clear required');
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Clear rate limit error:', error);
    throw error;
  }
}
