import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  checkRateLimit
} from '@/lib/rate-limiting';
import { 
  validateTrustedIP,
  generateCorrelationId,
  scrubPII,
  extractIsAnonymous
} from '@/lib/utils/auth-utils';
import { validateCSRFServer } from '@/lib/utils/auth-utils.server';
import { validateSupabaseFeatureSupport, getCachedFeatureSupport } from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders
} from '@/lib/config/environment';

/**
 * RUNTIME: Node.js is required for this endpoint due to dependencies:
 * - crypto module for HMAC operations in auth-utils.server.ts
 * - cookies from next/headers for Supabase SSR client
 * - @upstash/redis for rate limiting via REST API
 * - Server-side Supabase client with cookie adapter
 * 
 * Edge runtime is not compatible with these Node.js-specific features.
 * Upstash Redis is accessed via REST API, so Edge performance benefits
 * are not applicable here.
 */
export const runtime = 'nodejs';

// Normalized error codes
const ERROR_CODES = {
  ANON_SIGNIN_UNSUPPORTED: 'ANON_SIGNIN_UNSUPPORTED',
  ANON_SIGNIN_FAILED: 'ANON_SIGNIN_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF: 'CSRF',
  SESSION_ERROR: 'SESSION_ERROR',
  USER_EXISTS: 'USER_EXISTS'
} as const;

/**
 * Anonymous authentication API with comprehensive security measures
 * Handles OPTIONS/CORS preflight and POST requests with rate limiting
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
    // Check cached feature support first, then fallback to validation
    let featuresSupported = getCachedFeatureSupport();
    if (featuresSupported === null) {
      // No cached result, perform validation
      featuresSupported = validateSupabaseFeatureSupport();
    }
    
    if (!featuresSupported) {
      console.error(`Supabase feature support validation failed for correlation ID: ${correlationId}`);
      
      return NextResponse.json(
        { error: ERROR_CODES.ANON_SIGNIN_UNSUPPORTED },
        { 
          status: 500,
          headers: getCORSHeaders(request.headers.get('origin') || undefined)
        }
      );
    }

    // Get request details for security validation
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const reqIp = (request as any).ip || request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-ip');
    const validatedIP = validateTrustedIP(reqIp, request.headers.get('x-forwarded-for') || undefined);
    
    // Comprehensive CSRF validation with signed token fallback
    if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
      console.error(`CSRF validation failed for correlation ID: ${correlationId}`, {
        origin,
        referer,
        validatedIP,
        correlationId,
        hasCSRFToken: !!csrfToken
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.CSRF },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Rate limiting with enhanced UX
    const rateLimitResult = await checkRateLimit(
      `anonymous_auth:${validatedIP}`,
      'anonymous_auth',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP: ${validatedIP}`, {
        correlationId,
        remaining_attempts: rateLimitResult.remaining_attempts,
        reset_in_seconds: rateLimitResult.reset_in_seconds
      });
      
      return NextResponse.json(
        {
          error: ERROR_CODES.RATE_LIMITED,
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
    
    // Server-side duplicate prevention using SSR client
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError) {
      console.error(`Failed to get user for correlation ID: ${correlationId}`, {
        error: getUserError,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.SESSION_ERROR },
        { 
          status: 500,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Check if user already exists (non-anonymous)
    if (user && !extractIsAnonymous(user)) {
      console.warn(`Non-anonymous user already exists for correlation ID: ${correlationId}`, {
        userId: user.id,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.USER_EXISTS },
        { 
          status: 409,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Check if anonymous user already exists - short-circuit with success
    if (user && extractIsAnonymous(user)) {
      console.log(`Anonymous user already exists for correlation ID: ${correlationId}`, {
        userId: user.id,
        correlationId
      });
      
      return NextResponse.json(
        { ok: true, correlation_id: correlationId },
        { 
          status: 200,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create anonymous user using signInAnonymously
    const { error: signInError } = await supabase.auth.signInAnonymously();
    
    if (signInError) {
      console.error(`Anonymous signin failed for correlation ID: ${correlationId}`, {
        error: signInError,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.ANON_SIGNIN_FAILED },
        { 
          status: 500,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Success response
    return NextResponse.json(
      { ok: true, correlation_id: correlationId },
      { 
        status: 200,
        headers: getCORSHeaders(origin || undefined)
      }
    );
    
  } catch (error) {
    console.error(`Unexpected error in anonymous auth for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: ERROR_CODES.ANON_SIGNIN_FAILED,
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
