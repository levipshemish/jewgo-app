import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limit store for development
const RATE_LIMIT_STORE = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyGenerator?: (req: NextRequest) => string;
}

/**
 * Rate limiting middleware for admin API routes
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const { limit, windowMs, keyGenerator } = config;
    
    // Generate rate limit key
    const key = keyGenerator 
      ? keyGenerator(request)
      : `admin_api:${getClientIP(request)}:${request.nextUrl.pathname}`;
    
    const now = Date.now();
    const rateLimitData = RATE_LIMIT_STORE.get(key);
    
    if (rateLimitData && now < rateLimitData.resetTime) {
      if (rateLimitData.count >= limit) {
        return NextResponse.json(
          { 
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitData.resetTime - now) / 1000).toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString(),
            }
          }
        );
      }
      rateLimitData.count++;
    } else {
      RATE_LIMIT_STORE.set(key, { 
        count: 1, 
        resetTime: now + windowMs 
      });
    }
    
    return null; // Continue with request
  };
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // General admin API rate limits
  DEFAULT: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  STRICT: { limit: 30, windowMs: 60 * 1000 },   // 30 requests per minute
  BULK: { limit: 10, windowMs: 60 * 1000 },     // 10 bulk operations per minute
  
  // Auth-specific rate limits
  AUTH: { limit: 5, windowMs: 60 * 1000 },      // 5 auth attempts per minute
  
  // Export rate limits
  EXPORT: { limit: 5, windowMs: 5 * 60 * 1000 }, // 5 exports per 5 minutes
} as const;

/**
 * Helper to get client IP for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * Helper to generate rate limit key based on user ID and action
 */
export function generateUserRateLimitKey(request: NextRequest, action: string): string {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = getClientIP(request);
  return `admin_user:${ip}:${action}:${userAgent}`;
}
