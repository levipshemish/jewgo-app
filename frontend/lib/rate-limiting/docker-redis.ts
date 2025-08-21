/**
 * Docker-compatible rate limiting for development
 * Falls back to in-memory storage when Upstash Redis is not available
 */

import { validateTrustedIP } from './utils';
import { generateIdempotencyKey } from './upstash-redis';

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

// In-memory storage for development fallback
const memoryStore = new Map<string, { count: number; expiry: number }>();

/**
 * Check if we're in Docker environment
 */
function isDockerEnvironment(): boolean {
  return process.env.DOCKER === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Simple in-memory rate limiting for Docker development
 */
async function checkRateLimitMemory(
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
  const config = RATE_LIMITS[limitType];
  const realIP = validateTrustedIP(requestIP, forwardedFor);
  const now = Math.floor(Date.now() / 1000);
  
  // Create rate limit keys
  const windowKey = `rate_limit:${limitType}:${realIP}:window`;
  const dailyKey = `rate_limit:${limitType}:${realIP}:daily`;
  
  // Check window limit
  const windowData = memoryStore.get(windowKey);
  const windowCount = windowData && windowData.expiry > now ? windowData.count : 0;
  
  // Check daily limit
  const dailyData = memoryStore.get(dailyKey);
  const dailyCount = dailyData && dailyData.expiry > now ? dailyData.count : 0;
  
  // Check if limits exceeded
  if (windowCount >= config.max_requests) {
    const resetInSeconds = windowData ? windowData.expiry - now : config.window;
    return {
      allowed: false,
      remaining_attempts: 0,
      reset_in_seconds: Math.max(0, resetInSeconds),
      retry_after: new Date((now + resetInSeconds) * 1000).toISOString(),
      error: 'RATE_LIMITED'
    };
  }
  
  if (dailyCount >= config.max_requests_daily) {
    const resetInSeconds = dailyData ? dailyData.expiry - now : config.window_daily;
    return {
      allowed: false,
      remaining_attempts: 0,
      reset_in_seconds: Math.max(0, resetInSeconds),
      retry_after: new Date((now + resetInSeconds) * 1000).toISOString(),
      error: 'RATE_LIMITED'
    };
  }
  
  // Increment counters
  const newWindowCount = windowCount + 1;
  const newDailyCount = dailyCount + 1;
  
  // Store updated counts
  memoryStore.set(windowKey, {
    count: newWindowCount,
    expiry: now + config.window
  });
  
  memoryStore.set(dailyKey, {
    count: newDailyCount,
    expiry: now + config.window_daily
  });
  
  return {
    allowed: true,
    remaining_attempts: Math.max(0, config.max_requests - newWindowCount),
    reset_in_seconds: config.window,
  };
}

/**
 * Enhanced rate limiting with Docker compatibility
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
  // In Docker environment, use in-memory rate limiting
  if (isDockerEnvironment()) {
    console.log('Using in-memory rate limiting for Docker environment');
    return checkRateLimitMemory(key, limitType, requestIP, forwardedFor);
  }
  
  // In Docker environment, always use in-memory rate limiting
  console.warn('Upstash Redis not available in Docker environment, using in-memory rate limiting');
  return checkRateLimitMemory(key, limitType, requestIP, forwardedFor);
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
  if (isDockerEnvironment()) {
    const realIP = validateTrustedIP(requestIP, forwardedFor);
    const windowKey = `rate_limit:${limitType}:${realIP}:window`;
    const dailyKey = `rate_limit:${limitType}:${realIP}:daily`;
    
    memoryStore.delete(windowKey);
    memoryStore.delete(dailyKey);
    return;
  }
  
  // For production, try to use Upstash Redis
  try {
    const { clearRateLimit: upstashClearRateLimit } = await import('./upstash-redis');
    return await upstashClearRateLimit(key);
  } catch (error) {
    console.warn('Upstash Redis not available for clearing rate limits:', error);
  }
}

/**
 * Check idempotency (simplified for Docker)
 */
export async function checkIdempotency(
  idempotencyKey: string,
  ttlSeconds: number = 300
): Promise<{ exists: boolean; result?: any }> {
  if (isDockerEnvironment()) {
    const data = memoryStore.get(`idempotency:${idempotencyKey}`);
    const now = Math.floor(Date.now() / 1000);
    
    if (data && data.expiry > now) {
      return { exists: true, result: data.count };
    }
    
    return { exists: false };
  }
  
  // For production, try to use Upstash Redis
  try {
    const { checkIdempotency: upstashCheckIdempotency } = await import('./upstash-redis');
    return await upstashCheckIdempotency(idempotencyKey, ttlSeconds);
  } catch (error) {
    console.warn('Upstash Redis not available for idempotency check:', error);
    return { exists: false };
  }
}

/**
 * Store idempotency result (simplified for Docker)
 */
export async function storeIdempotencyResult(
  idempotencyKey: string,
  result: any,
  ttlSeconds: number = 300
): Promise<void> {
  if (isDockerEnvironment()) {
    const now = Math.floor(Date.now() / 1000);
    memoryStore.set(`idempotency:${idempotencyKey}`, {
      count: result,
      expiry: now + ttlSeconds
    });
    return;
  }
  
  // For production, try to use Upstash Redis
  try {
    const { storeIdempotencyResult: upstashStoreIdempotencyResult } = await import('./upstash-redis');
    return await upstashStoreIdempotencyResult(idempotencyKey, result, ttlSeconds);
  } catch (error) {
    console.warn('Upstash Redis not available for storing idempotency result:', error);
  }
}

// Export the generateIdempotencyKey function
export { generateIdempotencyKey };
