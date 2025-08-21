/**
 * Rate limiting and idempotency utilities
 * Provides Redis-based rate limiting and idempotency checking for API endpoints
 */

import { Redis } from 'ioredis';
import { IS_PRODUCTION } from '@/lib/config/environment';

// Redis client configuration
let redisClient: Redis | null = null;

/**
 * Initialize Redis client
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
      redisClient = new Redis(redisUrl);
    } else if (redisHost && redisPassword) {
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });
    } else {
      console.warn('Redis configuration not found - using in-memory fallback');
      return null;
    }

    // Handle Redis connection events
    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * In-memory fallback for rate limiting when Redis is unavailable
 */
class InMemoryRateLimiter {
  private limits = new Map<string, { count: number; resetTime: number }>();

  async checkLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining_attempts: number;
    reset_in_seconds: number;
    retry_after?: number;
  }> {
    const now = Date.now();
    const resetTime = now + (windowSeconds * 1000);
    
    const current = this.limits.get(key);
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      this.limits.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining_attempts: maxRequests - 1,
        reset_in_seconds: windowSeconds
      };
    }
    
    if (current.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      return {
        allowed: false,
        remaining_attempts: 0,
        reset_in_seconds: Math.ceil((current.resetTime - now) / 1000),
        retry_after: retryAfter
      };
    }
    
    // Increment counter
    current.count++;
    this.limits.set(key, current);
    
    return {
      allowed: true,
      remaining_attempts: maxRequests - current.count,
      reset_in_seconds: Math.ceil((current.resetTime - now) / 1000)
    };
  }
}

// In-memory fallback instance
const inMemoryLimiter = new InMemoryRateLimiter();

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  anonymous_auth: { maxRequests: 5, windowSeconds: 300 }, // 5 requests per 5 minutes
  merge_operations: { maxRequests: 3, windowSeconds: 3600 }, // 3 requests per hour
  email_upgrade: { maxRequests: 10, windowSeconds: 3600 }, // 10 requests per hour
  default: { maxRequests: 100, windowSeconds: 3600 } // 100 requests per hour
} as const;

/**
 * Check rate limit for a given key and operation type
 */
export async function checkRateLimit(
  key: string,
  operationType: keyof typeof RATE_LIMITS,
  ip?: string,
  forwardedFor?: string
): Promise<{
  allowed: boolean;
  remaining_attempts: number;
  reset_in_seconds: number;
  retry_after?: number;
}> {
  const redis = getRedisClient();
  const limit = RATE_LIMITS[operationType] || RATE_LIMITS.default;
  
  if (!redis) {
    // Fallback to in-memory rate limiting
    return inMemoryLimiter.checkLimit(key, limit.maxRequests, limit.windowSeconds);
  }

  try {
    const now = Date.now();
    const windowMs = limit.windowSeconds * 1000;
    const resetTime = now + windowMs;
    
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Get current count
    pipeline.get(key);
    // Set expiry if key doesn't exist
    pipeline.expire(key, limit.windowSeconds);
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }
    
    const currentCount = parseInt(results[0][1] as string) || 0;
    
    if (currentCount >= limit.maxRequests) {
      // Rate limit exceeded
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : limit.windowSeconds;
      
      return {
        allowed: false,
        remaining_attempts: 0,
        reset_in_seconds: ttl > 0 ? ttl : limit.windowSeconds,
        retry_after: retryAfter
      };
    }
    
    // Increment counter
    await redis.incr(key);
    
    return {
      allowed: true,
      remaining_attempts: limit.maxRequests - currentCount - 1,
      reset_in_seconds: limit.windowSeconds
    };
    
  } catch (error) {
    console.error('Redis rate limiting failed, falling back to in-memory:', error);
    return inMemoryLimiter.checkLimit(key, limit.maxRequests, limit.windowSeconds);
  }
}

/**
 * Generate idempotency key for operations
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
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback for idempotency
    const stored = inMemoryLimiter['limits'].get(key);
    if (stored && Date.now() < stored.resetTime) {
      return { exists: true };
    }
    return { exists: false };
  }

  try {
    const result = await redis.get(key);
    
    if (result) {
      try {
        const parsed = JSON.parse(result);
        return { exists: true, result: parsed };
      } catch {
        return { exists: true };
      }
    }
    
    return { exists: false };
    
  } catch (error) {
    console.error('Redis idempotency check failed:', error);
    return { exists: false };
  }
}

/**
 * Store idempotency result
 */
export async function storeIdempotencyResult(
  key: string,
  result: any,
  ttlSeconds: number = 3600
): Promise<void> {
  const redis = getRedisClient();
  
  if (!redis) {
    // In-memory fallback
    const resetTime = Date.now() + (ttlSeconds * 1000);
    inMemoryLimiter['limits'].set(key, { count: 1, resetTime });
    return;
  }

  try {
    const serialized = JSON.stringify(result);
    await redis.setex(key, ttlSeconds, serialized);
  } catch (error) {
    console.error('Redis idempotency storage failed:', error);
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
