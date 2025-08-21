import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  checkRateLimit
} from '@/lib/rate-limiting/upstash-redis';
import { 
  validateCSRF, 
  validateTrustedIP,
  generateCorrelationId,
  scrubPII,
  extractIsAnonymous
} from '@/lib/utils/auth-utils';
import { signMergeCookieVersioned } from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders,
  getCookieOptions 
} from '@/lib/config/environment';

export const runtime = 'nodejs';

/**
 * Prepare merge API with versioned HMAC cookie generation
 * Handles OPTIONS/CORS preflight and POST requests for merge preparation
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Validate origin against allowlist
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer, x-csrf-token',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  try {
    // Get request details for security validation
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    // Comprehensive CSRF validation with token fallback
    if (!validateCSRF(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
      console.error(`CSRF validation failed for correlation ID: ${correlationId}`, {
        origin,
        referer,
        realIP,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const validatedIP = validateTrustedIP(realIP, forwardedFor || undefined);
    
    // Rate limiting for merge operations
    const rateLimitResult = await checkRateLimit(
      `merge_prepare:${validatedIP}`,
      'merge_operations',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for merge prepare IP: ${validatedIP}`, {
        correlationId,
        remaining_attempts: rateLimitResult.remaining_attempts,
        reset_in_seconds: rateLimitResult.reset_in_seconds
      });
      
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          remaining_attempts: rateLimitResult.remaining_attempts,
          reset_in_seconds: rateLimitResult.reset_in_seconds,
          retry_after: rateLimitResult.retry_after,
          correlation_id: correlationId
        },
        { 
          status: 429,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create Supabase SSR client with cookie adapter
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );
    
    // Get current user session
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError) {
      console.error(`Failed to get user for merge prepare correlation ID: ${correlationId}`, {
        error: getUserError,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'Authentication error' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    if (!user) {
      console.error(`No user found for merge prepare correlation ID: ${correlationId}`, {
        correlationId
      });
      
      return NextResponse.json(
        { error: 'No authenticated user' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify user is anonymous
    if (!extractIsAnonymous(user)) {
      console.error(`Non-anonymous user attempted merge prepare for correlation ID: ${correlationId}`, {
        user_id: user.id,
        correlationId
      });
      
      return NextResponse.json(
        { error: 'User is not anonymous' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Generate versioned HMAC cookie with reduced expiration (10 minutes)
    const cookiePayload = {
      anon_uid: user.id,
      exp: Math.floor(Date.now() / 1000) + 600 // 10 minutes expiration
    };
    
    const signedCookie = signMergeCookieVersioned(cookiePayload);
    
    // Set HttpOnly cookie with environment-specific domain and security attributes
    const cookieOptions = getCookieOptions();
    const response = new NextResponse(null, { 
      status: 204,
      headers: getCORSHeaders(origin || undefined)
    });
    
    response.cookies.set('merge_token', signedCookie, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      domain: cookieOptions.domain,
      maxAge: cookieOptions.maxAge,
      path: '/'
    });
    
    // Log successful merge preparation
    console.log(`Merge preparation successful for correlation ID: ${correlationId}`, {
      user_id: user.id,
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return response;
    
  } catch (error) {
    console.error(`Unexpected error in merge prepare for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
