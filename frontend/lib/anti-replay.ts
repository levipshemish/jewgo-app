import { createHash } from "crypto";

/**
 * Atomic token consumption using Redis GETDEL for replay protection
 */
export async function consumeCaptchaTokenOnce(token: string, ttlSec = 120): Promise<void> {
  const key = "captcha:token:" + createHash("sha256").update(token).digest("hex").slice(0, 32);
  
  try {
    // Import Redis client dynamically to avoid build issues
    const { getRedisClient } = await import('@/lib/rate-limiting/redis');
    const redis = await getRedisClient();
    
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
  } catch (error) {
    if (error instanceof Error && error.message === "Replay detected") {
      throw error;
    }
    // Log Redis errors but fail secure
    console.error('Anti-replay Redis error:', error);
    throw new Error("Replay protection unavailable");
  }
}

/**
 * Clear replay tokens for testing
 */
export async function clearReplayTokens(pattern = "captcha:token:*"): Promise<void> {
  try {
    const { getRedisClient } = await import('@/lib/rate-limiting/redis');
    const redis = await getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Failed to clear replay tokens:', error);
  }
}
