/**
 * Rate limiting and idempotency module
 * Provides Redis-based rate limiting with in-memory fallback
 * Implements idempotency checks and result storage
 */

import Redis from 'ioredis';
import { IS_PRODUCTION } from '@/lib/config/environment';

// Redis client with connection pooling and error handling
let redisClient: Redis | null = null;
let inMemoryStore = new Map<string, { value: any; expires: number }>();

// Rate limit configurations
const RATE_LIMITS = {
  anonymous_auth: { max_attempts: 5, window_seconds: 300 }, // 5 attempts per 5 minutes
  merge_operations: { max_attempts: 3, window_seconds: 600 }, // 3 attempts per 10 minutes
  email_upgrade: { max_attempts: 3, window_seconds: 300 }, // 3 attempts per 5 minutes
  default: { max_attempts: 10, window_seconds: 60 } // 10 attempts per minute
} as const;

/**
 * Initialize Redis client with connection pooling
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0;

    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
    } else if (redisHost && redisPassword) {
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
    } else {
      console.warn('Redis configuration not found, using in-memory fallback');
      return null;
    }

    // Handle Redis connection events
    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
      if (IS_PRODUCTION) {
        console.error('🚨 CRITICAL: Redis connection failed in production');
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready for commands');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * Check rate limit for a given key and operation type
 */
export async function checkRateLimit(
  key: string,
  operationType: keyof typeof RATE_LIMITS,
  clientIP?: string,
  forwardedFor?: string
): Promise<{
  allowed: boolean;
  remaining_attempts: number;
  reset_in_seconds: number;
  retry_after?: number;
}> {
  const config = RATE_LIMITS[operationType] || RATE_LIMITS.default;
  const windowMs = config.window_seconds * 1000;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const redis = getRedisClient();
    
    if (redis) {
      // Redis-based rate limiting
      const multi = redis.multi();
      
      // Remove expired entries
      multi.zremrangebyscore(key, 0, windowStart);
      
      // Count current attempts
      multi.zcard(key);
      
      // Add current attempt
      multi.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration on the key
      multi.expire(key, config.window_seconds);
      
      const results = await multi.exec();
      
      if (!results) {
        throw new Error('Redis multi-exec failed');
      }
      
      const currentAttempts = results[1] as number;
      const remainingAttempts = Math.max(0, config.max_attempts - currentAttempts);
      const allowed = currentAttempts < config.max_attempts;
      
      // Calculate reset time
      const oldestAttempt = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldestAttempt.length > 0 ? parseInt(oldestAttempt[1]) + windowMs : now + windowMs;
      const resetInSeconds = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed,
        remaining_attempts: remainingAttempts,
        reset_in_seconds: resetInSeconds,
        retry_after: allowed ? undefined : resetInSeconds
      };
    } else {
      // In-memory fallback
      const inMemoryKey = `rate_limit:${key}`;
      const attempts = inMemoryStore.get(inMemoryKey);
      
      if (!attempts || attempts.expires < now) {
        // No attempts or expired window
        inMemoryStore.set(inMemoryKey, {
          value: [now],
          expires: now + windowMs
        });
        
        return {
          allowed: true,
          remaining_attempts: config.max_attempts - 1,
          reset_in_seconds: config.window_seconds
        };
      }
      
      // Filter out expired attempts
      const validAttempts = (attempts.value as number[]).filter(timestamp => timestamp > windowStart);
      
      if (validAttempts.length >= config.max_attempts) {
        const oldestAttempt = Math.min(...validAttempts);
        const resetTime = oldestAttempt + windowMs;
        const resetInSeconds = Math.ceil((resetTime - now) / 1000);
        
        return {
          allowed: false,
          remaining_attempts: 0,
          reset_in_seconds: resetInSeconds,
          retry_after: resetInSeconds
        };
      }
      
      // Add current attempt
      validAttempts.push(now);
      inMemoryStore.set(inMemoryKey, {
        value: validAttempts,
        expires: now + windowMs
      });
      
      return {
        allowed: true,
        remaining_attempts: config.max_attempts - validAttempts.length,
        reset_in_seconds: config.window_seconds
      };
    }
  } catch (error) {
    console.error('Rate limit check failed:', error);
    
    // Fail open in case of Redis errors (allow the request)
    return {
      allowed: true,
      remaining_attempts: config.max_attempts,
      reset_in_seconds: config.window_seconds
    };
  }
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(operation: string, identifier: string): string {
  return `idempotency:${operation}:${identifier}`;
}

/**
 * Check if an idempotency key exists and return stored result
 */
export async function checkIdempotency(
  key: string,
  ttlSeconds: number = 3600
): Promise<{
  exists: boolean;
  result?: any;
}> {
  try {
    const redis = getRedisClient();
    
    if (redis) {
      // Redis-based idempotency check
      const result = await redis.get(key);
      
      if (result) {
        try {
          const parsedResult = JSON.parse(result);
          return {
            exists: true,
            result: parsedResult
          };
        } catch {
          return { exists: true };
        }
      }
      
      return { exists: false };
    } else {
      // In-memory fallback
      const stored = inMemoryStore.get(key);
      
      if (stored && stored.expires > Date.now()) {
        return {
          exists: true,
          result: stored.value
        };
      }
      
      return { exists: false };
    }
  } catch (error) {
    console.error('Idempotency check failed:', error);
    return { exists: false };
  }
}

/**
 * Store idempotency result with TTL
 */
export async function storeIdempotencyResult(
  key: string,
  result: any,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const redis = getRedisClient();
    
    if (redis) {
      // Redis-based storage
      await redis.setex(key, ttlSeconds, JSON.stringify(result));
    } else {
      // In-memory fallback
      inMemoryStore.set(key, {
        value: result,
        expires: Date.now() + (ttlSeconds * 1000)
      });
      
      // Clean up expired entries periodically
      if (inMemoryStore.size > 1000) {
        const now = Date.now();
        for (const [k, v] of inMemoryStore.entries()) {
          if (v.expires < now) {
            inMemoryStore.delete(k);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to store idempotency result:', error);
  }
}

/**
 * Clean up Redis connection on process exit
 */
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    if (redisClient) {
      redisClient.disconnect();
    }
  });
  
  process.on('SIGTERM', () => {
    if (redisClient) {
      redisClient.disconnect();
    }
  });
}
