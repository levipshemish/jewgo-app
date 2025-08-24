import { createHash } from "crypto";

/**
 * Atomic token consumption using Redis GETDEL for replay protection
 */
export async function consumeCaptchaTokenOnce(token: string, ttlSec = 120): Promise<void> {
  const key = "captcha:token:" + createHash("sha256").update(token).digest("hex").slice(0, 32);
  
  try {
    // Import Redis client dynamically to avoid build issues
    const Redis = await import('ioredis');
    
    // Parse Redis URL if available, otherwise use individual config
    let redisConfig: any = {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      retryDelayOnClusterDown: 300,
    };
    
    if (process.env.REDIS_URL) {
      // Clean up Redis URL (remove trailing % if present)
      const cleanRedisUrl = process.env.REDIS_URL.replace(/%$/, '');
      redisConfig = Redis.default.parseURL(cleanRedisUrl);
      Object.assign(redisConfig, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
      });
    } else {
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
      };
    }
    
    const redis = new Redis.default(redisConfig);
    
    // Atomic check-and-set using Lua script
    const luaScript = `
      local key = KEYS[1]
      local ttl = ARGV[1]
      
      if redis.call('EXISTS', key) == 1 then
        return 0  -- Token already used
      else
        redis.call('SETEX', key, ttl, '1')
        return 1  -- Token consumed successfully
      end
    `;
    
    const result = await redis.eval(luaScript, 1, key, ttlSec) as number;
    
    if (result === 0) {
      throw new Error("Replay detected");
    }
    
    await redis.disconnect();
  } catch (error) {
    if (error instanceof Error && error.message === "Replay detected") {
      throw error;
    }
    // In development, allow bypassing Redis for testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('Anti-replay Redis error (development mode - allowing):', error);
      return; // Allow the request to proceed in development
    }
    // Fail secure - reject requests when replay protection unavailable
    console.error('Anti-replay Redis error:', error);
    throw new Error("Security verification unavailable");
  }
}

/**
 * Clear replay tokens for testing
 */
export async function clearReplayTokens(pattern = "captcha:token:*"): Promise<void> {
  try {
    const Redis = await import('ioredis');
    const redis = new Redis.default({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    await redis.disconnect();
  } catch (error) {
    console.error('Failed to clear replay tokens:', error);
  }
}
