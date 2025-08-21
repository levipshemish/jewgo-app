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
  extractIsAnonymous,
  isSupabaseConfigured,
  generateSecurePassword
} from '@/lib/utils/auth-utils';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders,
  IS_PRODUCTION 
} from '@/lib/config/environment';

export const runtime = 'nodejs';

// Normalized error codes
const ERROR_CODES = {
  ANON_SIGNIN_UNSUPPORTED: 'ANON_SIGNIN_UNSUPPORTED',
  ANON_SIGNIN_FAILED: 'ANON_SIGNIN_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF: 'CSRF',
  SESSION_ERROR: 'SESSION_ERROR',
  USER_EXISTS: 'USER_EXISTS',
  ANON_EXISTS: 'ANON_EXISTS',
  SIGNUP_FAILED: 'SIGNUP_FAILED'
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
      'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer',
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  try {
    // Early feature support validation
    if (!isSupabaseConfigured()) {
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
        { error: ERROR_CODES.CSRF },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const validatedIP = validateTrustedIP(realIP, forwardedFor || undefined);
    
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
    
    // Check if anonymous user already exists
    if (user && extractIsAnonymous(user)) {
      console.warn(`Anonymous user already exists for correlation ID: ${correlationId}`, {
        userId: user.id,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.ANON_EXISTS },
        { 
          status: 409,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create anonymous user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@anonymous.local`,
      password: generateSecurePassword(),
      options: {
        data: {
          is_anonymous: true,
          correlation_id: correlationId
        }
      }
    });
    
    if (signUpError) {
      console.error(`Anonymous signup failed for correlation ID: ${correlationId}`, {
        error: signUpError,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.SIGNUP_FAILED },
        { 
          status: 500,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Success response
    return NextResponse.json(
      {
        success: true,
        user: signUpData.user,
        correlation_id: correlationId
      },
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
