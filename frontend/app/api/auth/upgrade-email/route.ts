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
  verifyTokenRotation,
  extractJtiFromToken
} from '@/lib/utils/auth-utils';
import { validateCSRFServer, hashIPForPrivacy } from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders
} from '@/lib/config/environment';

export const runtime = 'nodejs';

// Normalized error codes
const ERROR_CODES = {
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  INVALID_EMAIL: 'INVALID_EMAIL',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF: 'CSRF',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  REQUIRES_REAUTH: 'REQUIRES_REAUTH'
};

/**
 * Email upgrade API with normalized error codes
 * Handles OPTIONS/CORS preflight and POST requests for email upgrades
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
  
  try {
    // Get request details for security validation
    const origin = request.headers.get('origin');
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
    const body = await request.json();
    const { email } = body;
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: ERROR_CODES.INVALID_EMAIL },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Basic email validation
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
    
    // Get current user session and store pre-upgrade state for token rotation verification
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !user) {
      console.error(`Authentication error for email upgrade correlation ID: ${correlationId}`, {
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
    
    // Store pre-upgrade session for token rotation verification
    const { data: { session: preUpgradeSession } } = await supabase.auth.getSession();
    
    // Attempt to update user with email
    const { data, error } = await supabase.auth.updateUser({ email });
    
    if (error) {
      // Normalize error codes based on Supabase error messages
      let normalizedError = ERROR_CODES.INTERNAL_ERROR;
      
      if (error.message.includes('EMAIL_IN_USE') || 
          error.message.includes('already registered') ||
          error.message.includes('already exists')) {
        normalizedError = ERROR_CODES.EMAIL_IN_USE;
      } else if (error.message.includes('invalid') || 
                 error.message.includes('format')) {
        normalizedError = ERROR_CODES.INVALID_EMAIL;
      }
      
      console.error(`Email upgrade failed for correlation ID: ${correlationId}`, {
        error: error.message,
        normalizedError,
        correlationId
      });
      
      return NextResponse.json(
        { 
          error: normalizedError,
          details: error.message,
          correlation_id: correlationId
        },
        { 
          status: 400,
          headers: getCORSHeaders(origin || undefined)
        }
      );
    }
    
    // Verify token rotation after successful email update
    if (preUpgradeSession) {
      const { data: { session: postUpgradeSession } } = await supabase.auth.getSession();
      
      if (postUpgradeSession) {
        const rotationValid = verifyTokenRotation(preUpgradeSession, postUpgradeSession);
        
        if (!rotationValid) {
          console.warn(`Token rotation failed for email upgrade correlation ID: ${correlationId}`, {
            correlationId,
            preUpgradeJti: extractJtiFromToken(preUpgradeSession.access_token),
            postUpgradeJti: extractJtiFromToken(postUpgradeSession.access_token),
            refreshTokenChanged: preUpgradeSession.refresh_token !== postUpgradeSession.refresh_token
          });
          
          return NextResponse.json(
            { 
              error: ERROR_CODES.REQUIRES_REAUTH,
              requires_reauth: true,
              correlation_id: correlationId
            },
            { 
              status: 401,
              headers: getCORSHeaders(origin || undefined)
            }
          );
        }
      }
    }
    
    // Success response
    return NextResponse.json(
      { 
        ok: true, 
        user: data.user,
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
        error: ERROR_CODES.INTERNAL_ERROR,
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: getCORSHeaders(request.headers.get('origin') || undefined)
      }
    );
  }
}
