import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Error message to return
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      const entry = this.store[key];
      if (entry && entry.resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(request: NextRequest, prefix: string = ''): string {
    // Get client IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    return `${prefix}:${ip}`;
  }

  async checkLimit(
    request: NextRequest,
    config: RateLimitConfig,
    keyPrefix: string = 'global'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(request, keyPrefix);
    const now = Date.now();
    
    let entry = this.store[key];
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      this.store[key] = entry;
    } else {
      // Increment count
      entry.count++;
    }
    
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  // Clean up method for testing or graceful shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store = {};
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Preset configurations
export const rateLimitConfigs = {
  // Strict limit for registration/login
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // Increased from 5 to 20
    message: 'Too many authentication attempts. Please try again later.'
  },
  // Much more lenient for API calls
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000, // Increased from 200 to 1000
    message: 'Too many requests. Please slow down.'
  },
  // Very strict for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // Increased from 3 to 10
    message: 'Too many password reset attempts. Please try again later.'
  }
};

// Middleware helper
export async function withRateLimit(
  request: NextRequest, config: RateLimitConfig, keyPrefix: string = 'global'): Promise<Response | null> {
  const { allowed, remaining, resetTime } = await rateLimiter.checkLimit(
    request,
    config,
    keyPrefix
  );

  if (!allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        message: config.message || 'Too many requests',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  return null; // Continue with request
}
