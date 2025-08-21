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
import { validateCSRFServer, hashIPForPrivacy, validateSupabaseFeatureSupport } from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders,
  FEATURE_FLAGS
} from '@/lib/config/environment';

export const runtime = 'nodejs';

// Normalized error codes
const ERROR_CODES = {
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  INVALID_EMAIL: 'INVALID_EMAIL',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF: 'CSRF',
  SESSION_ERROR: 'SESSION_ERROR',
  ANONYMOUS_USER: 'ANONYMOUS_USER'
} as const;

/**
 * Email upgrade API for anonymous users
 * Handles OPTIONS/CORS preflight and POST requests with rate limiting
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin || undefined)
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  // Validate origin against allowlist
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      { error: 'FORBIDDEN' },
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
    const origin = request.headers.get('origin');
    
    // Feature support validation
    const featuresSupported = validateSupabaseFeatureSupport();
    if (!featuresSupported) {
      console.error('Email upgrade not supported - feature validation failed');
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE' },
        { 
          status: 503,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const reqIp = (request as any).ip || request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-ip');
    const validatedIP = validateTrustedIP(reqIp, request.headers.get('x-forwarded-for') || undefined);
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
        { error: ERROR_CODES.CSRF },
        { 
          status: 403,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Rate limiting for email upgrade operations
    const rateLimitResult = await checkRateLimit(
      `email_upgrade:${ipHash}`,
      'email_upgrade',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for email upgrade IP hash: ${ipHash}`, {
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
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    const { email } = requestBody;
    
    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: ERROR_CODES.INVALID_EMAIL },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: ERROR_CODES.INVALID_EMAIL },
        { 
          status: 400,
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
      console.error(`Failed to get user for email upgrade correlation ID: ${correlationId}`, {
        error: getUserError,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.AUTHENTICATION_ERROR },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    if (!user) {
      console.error(`No user found for email upgrade correlation ID: ${correlationId}`, {
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.AUTHENTICATION_ERROR },
        { 
          status: 401,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify user is anonymous
    if (!extractIsAnonymous(user)) {
      console.error(`Non-anonymous user attempted email upgrade for correlation ID: ${correlationId}`, {
        user_id: user.id,
        correlationId
      });
      
      return NextResponse.json(
        { error: ERROR_CODES.ANONYMOUS_USER },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Attempt to update user email
    const { error: updateError } = await supabase.auth.updateUser({ email });
    
    if (updateError) {
      console.error(`Email upgrade failed for correlation ID: ${correlationId}`, {
        error: updateError,
        correlationId
      });
      
      // Handle specific Supabase error codes
      if (updateError.message.includes('already registered') || updateError.message.includes('already exists')) {
        return NextResponse.json(
          { error: ERROR_CODES.EMAIL_IN_USE },
          { 
            status: 409,
            headers: getCORSHeaders(origin || undefined)
          }
        );
      }
      
      if (updateError.message.includes('invalid email') || updateError.message.includes('email format')) {
        return NextResponse.json(
          { error: ERROR_CODES.INVALID_EMAIL },
          { 
            status: 400,
            headers: getCORSHeaders(origin || undefined)
          }
        );
      }
      
      // Default error response
      return NextResponse.json(
        { error: ERROR_CODES.AUTHENTICATION_ERROR },
        { 
          status: 500,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Success response
    console.log(`Email upgrade successful for correlation ID: ${correlationId}`, {
      user_id: user.id,
      email,
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        ok: true, 
        message: 'Email upgrade initiated. Please check your email for verification.',
        correlation_id: correlationId
      },
      { 
        status: 200,
        headers: getCORSHeaders(origin || undefined)
      }
    );
    
  } catch (error) {
    console.error(`Unexpected error in email upgrade for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: ERROR_CODES.AUTHENTICATION_ERROR,
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
