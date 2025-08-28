import { NextRequest, NextResponse} from 'next/server';
import { createServerClient} from '@supabase/ssr';
import { cookies} from 'next/headers';
import { 
  checkRateLimit} from '@/lib/rate-limiting';
import { 
  validateTrustedIP, generateCorrelationId, extractIsAnonymous} from '@/lib/utils/auth-utils';
import { validateCSRFServer, signMergeCookieVersioned, hashIPForPrivacy} from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, getCORSHeaders, getCookieOptions, FEATURE_FLAGS} from '@/lib/config/environment';
import { initializeServer} from '@/lib/server-init';

// export const runtime = 'nodejs';

/**
 * Prepare merge API with versioned HMAC cookie generation
 * Handles OPTIONS/CORS preflight and POST requests for merge preparation
 */
export async function OPTIONS(request: NextRequest) {
  const _origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin || undefined)
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  // const _startTime = Date.now();
  
  // Initialize server-side functionality
  const serverInitialized = await initializeServer();
  if (!serverInitialized) {
    console.error(`Server initialization failed for correlation ID: ${correlationId}`, {
      correlationId
    });
    
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE' },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  // Validate origin against allowlist
  const _origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      { error: 'CSRF' },
      { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  // Kill switch check for anonymous auth feature flag
  if (!FEATURE_FLAGS.ANONYMOUS_AUTH) {
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE' },
      { 
        status: 503,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  
  try {
    // Get request details for security validation
    const _origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const validatedIP = validateTrustedIP(realIP, forwardedFor || undefined);
    const ipHash = hashIPForPrivacy(validatedIP);
    
    // Comprehensive CSRF validation with signed token fallback
    if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
      console.error(`CSRF validation failed for correlation ID: ${correlationId}`, {
        origin,
        referer,
        ipHash,
        correlationId,
        hasCSRFToken: !!csrfToken
      });
      
      return NextResponse.json(
        { error: 'CSRF' },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Rate limiting for merge operations
    const rateLimitResult = await checkRateLimit(
      `merge_prepare:${ipHash}`,
      'merge_operations',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      // Rate limit exceeded - log for monitoring
      // console.warn(`Rate limit exceeded for merge prepare IP hash: ${ipHash}`, {
      //   correlationId,
      //   remaining_attempts: rateLimitResult.remaining_attempts,
      //   reset_in_seconds: rateLimitResult.reset_in_seconds
      // });
      
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          remaining_attempts: rateLimitResult.remaining_attempts,
          reset_in_seconds: rateLimitResult.reset_in_seconds,
          retry_after: rateLimitResult.retry_after,
          correlationid: correlationId
        },
        { 
          status: 429,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Create Supabase SSR client with cookie adapter
    const _cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(_name: string) {
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
      // Failed to get user - log for debugging
      // console.error(`Failed to get user for merge prepare correlation ID: ${correlationId}`, {
      //   error: getUserError,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    if (!user) {
      // No user found - log for debugging
      // console.error(`No user found for merge prepare correlation ID: ${correlationId}`, {
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR' },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify user is anonymous
    if (!extractIsAnonymous(user)) {
      // Non-anonymous user attempted merge prepare - log for security monitoring
      // console.error(`Non-anonymous user attempted merge prepare for correlation ID: ${correlationId}`, {
      //   userid: user.id,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'USER_NOT_ANONYMOUS' },
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
    
    const _signedCookie = signMergeCookieVersioned(cookiePayload);
    
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
    // console.log(`Merge preparation successful for correlation ID: ${correlationId}`, {
    //   userid: user.id,
    //   correlationId,
    //   duration_ms: Date.now() - startTime
    // });
    
    return response;
    
  } catch (error) {
    // Unexpected error - log for debugging
    // console.error(`Unexpected error in merge prepare for correlation ID: ${correlationId}`, {
    //   error: scrubPII(error),
    //   correlationId,
    //   duration_ms: Date.now() - startTime
    // });
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        correlationid: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
