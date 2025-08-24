/**
 * Rate Limiting Middleware
 * Provides consistent rate limiting with proper headers and error responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rate-limiting';

export interface RateLimitConfig {
  key: string;
  type: 'email_auth' | 'anonymous_auth' | 'password_reset';
  identifier: string;
  fallbackIdentifier?: string;
}

export async function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  try {
    const result = await checkRateLimit(
      config.type,
      config.key,
      config.identifier,
      config.fallbackIdentifier || ''
    );

    // Add rate limit headers
    const response = NextResponse.next();
    const limit = RATE_LIMIT_CONFIG[config.type]?.max_requests || 10;
    const remaining = result.remaining_attempts || 0;
    const resetTime = result.reset_in_seconds || 300;
    
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());

    if (!result.allowed) {
      // Return rate limit exceeded response
      const errorResponse = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );

      // Copy rate limit headers
      errorResponse.headers.set('X-RateLimit-Limit', limit.toString());
      errorResponse.headers.set('X-RateLimit-Remaining', '0');
      errorResponse.headers.set('X-RateLimit-Reset', resetTime.toString());
      errorResponse.headers.set('Retry-After', Math.ceil(resetTime).toString());

      return errorResponse;
    }

    return null; // Continue with request
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request to continue if rate limiting fails
    return null;
  }
}

// Convenience functions for common rate limiting scenarios
export async function rateLimitEmailAuth(
  request: NextRequest,
  email: string
): Promise<NextResponse | null> {
  return rateLimitMiddleware(request, {
    key: 'email_auth',
    type: 'email_auth',
    identifier: email
  });
}

export async function rateLimitAnonymousAuth(
  request: NextRequest,
  ip: string
): Promise<NextResponse | null> {
  return rateLimitMiddleware(request, {
    key: 'anonymous_auth',
    type: 'anonymous_auth',
    identifier: ip
  });
}

export async function rateLimitPasswordReset(
  request: NextRequest,
  email: string
): Promise<NextResponse | null> {
  return rateLimitMiddleware(request, {
    key: 'password_reset',
    type: 'password_reset',
    identifier: email
  });
}
