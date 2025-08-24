import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  checkRateLimit
} from '@/lib/rate-limiting';
import { 
  validateTrustedIP,
  generateCorrelationId,
  scrubPII
} from '@/lib/utils/auth-utils';
import { 
  validateCSRFServer,
  hashIPForPrivacy
} from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders
} from '@/lib/config/environment';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: {
      ...getCORSHeaders(origin || undefined),
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  const origin = request.headers.get('origin');
  
  try {
    // Get request details for security validation
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const platformIP = (request as any).ip || (request as any).cf?.connectingIP;
    const realIPHeader = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIP = platformIP || realIPHeader || 'unknown';
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const validatedIP = validateTrustedIP(realIP, forwardedFor || undefined);
    const ipHash = hashIPForPrivacy(validatedIP);
    
    // Comprehensive CSRF validation with signed token fallback
    // Skip CSRF validation in development/Docker environments
    if (process.env.NODE_ENV === 'development' || process.env.DOCKER === 'true') {

    } else if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
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
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { email } = body;
    
    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_EMAIL' },
        { 
          status: 400,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL' },
        { 
          status: 400,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Rate limiting for email upgrade
    const rateLimitResult = await checkRateLimit(
      `email_upgrade:${ipHash}`,
      'email_upgrade',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      // Rate limit exceeded - log for monitoring
      // console.warn(`Rate limit exceeded for email upgrade IP hash: ${ipHash}`, {
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
          correlation_id: correlationId
        },
        { 
          status: 429,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
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
    
    // Get current session to verify authentication
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !user) {
      // Authentication error - log for debugging
      // console.error(`Authentication error for email upgrade correlation ID: ${correlationId}`, {
      //   error: getUserError,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR' },
        { 
          status: 401,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Get current session for token rotation verification
    const { data: { session: preUpgradeSession }, error: getSessionError } = await supabase.auth.getSession();
    
    if (getSessionError) {
      // Failed to get pre-upgrade session - log for debugging
      // console.error(`Failed to get pre-upgrade session for correlation ID: ${correlationId}`, {
      //   error: getSessionError,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'SESSION_ERROR' },
        { 
          status: 500,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Update user email
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({ email });
    
    if (updateError) {
      // Email upgrade failed - log for debugging
      // console.error(`Email upgrade failed for correlation ID: ${correlationId}`, {
      //   error: updateError,
      //   correlationId
      // });
      
      // Map Supabase errors to normalized error codes
      let errorCode = 'EMAIL_UPGRADE_FAILED';
      if (updateError.message.includes('already registered') || updateError.message.includes('already exists')) {
        errorCode = 'EMAIL_IN_USE';
      } else if (updateError.message.includes('invalid email') || updateError.message.includes('malformed')) {
        errorCode = 'INVALID_EMAIL';
      }
      
      return NextResponse.json(
        { 
          error: errorCode,
          details: updateError.message,
          correlation_id: correlationId
        },
        { 
          status: 400,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Get post-upgrade session for token rotation verification
    const { data: { session: postUpgradeSession }, error: getPostSessionError } = await supabase.auth.getSession();
    
    if (getPostSessionError) {
      // Failed to get post-upgrade session - log for debugging
      // console.error(`Failed to get post-upgrade session for correlation ID: ${correlationId}`, {
      //   error: getPostSessionError,
      //   correlationId
      // });
      
      return NextResponse.json(
        { error: 'SESSION_ERROR' },
        { 
          status: 500,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Verify token rotation
    const { verifyTokenRotation } = await import('@/lib/utils/auth-utils');
    const tokenRotated = verifyTokenRotation(preUpgradeSession, postUpgradeSession);
    
    if (!tokenRotated) {
      // Token rotation verification failed - log for monitoring
      // console.warn(`Token rotation verification failed for email upgrade correlation ID: ${correlationId}`, {
      //   correlationId
      // });
      
      // Don't fail the request, but log the warning
    }
    
    // Email upgrade successful - log for monitoring
    // console.log(`Email upgrade successful for correlation ID: ${correlationId}`, {
    //   user_id: updateData.user?.id,
    //   correlationId,
    //   token_rotated: tokenRotated,
    //   duration_ms: Date.now() - startTime
    // });
    
    return NextResponse.json(
      { 
        ok: true, 
        user: updateData.user,
        token_rotated: tokenRotated,
        message: 'Email upgrade successful'
      },
      { 
        status: 200,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
    
  } catch (error) {
    // Unexpected error - log for debugging
    // console.error(`Unexpected error in email upgrade for correlation ID: ${correlationId}`, {
    //   error: scrubPII(error),
    //   correlationId,
    //   duration_ms: Date.now() - startTime
    // });
    
    return NextResponse.json(
      { 
        error: 'EMAIL_UPGRADE_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlation_id: correlationId
      },
      { 
        status: 500,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
