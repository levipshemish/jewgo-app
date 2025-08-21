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
  getCORSHeaders,
  FEATURE_FLAGS
} from '@/lib/config/environment';
import { initializeServer } from '@/lib/server-init';

export const runtime = 'nodejs';

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
  const origin = request.headers.get('origin');
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
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
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
    
    if (getUserError || !user) {
      console.error(`No authenticated user for email upgrade correlation ID: ${correlationId}`, {
        error: getUserError,
        correlationId
      });
      
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
    
    // Update user email
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email: email
    });
    
    if (updateError) {
      console.error(`Email upgrade failed for correlation ID: ${correlationId}`, {
        error: updateError,
        user_id: user.id,
        correlationId
      });
      
      // Handle specific error cases
      if (updateError.message.includes('already registered') || updateError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'EMAIL_IN_USE' },
          { 
            status: 400,
            headers: {
              ...getCORSHeaders(origin || undefined),
              'Cache-Control': 'no-store'
            }
          }
        );
      }
      
      if (updateError.message.includes('requires re-authentication')) {
        return NextResponse.json(
          { error: 'REQUIRES_REAUTH' },
          { 
            status: 401,
            headers: {
              ...getCORSHeaders(origin || undefined),
              'Cache-Control': 'no-store'
            }
          }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'EMAIL_UPGRADE_FAILED',
          details: updateError.message,
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
    
    console.log(`Email upgrade successful for correlation ID: ${correlationId}`, {
      user_id: user.id,
      new_email: email,
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        ok: true,
        user: updateData.user,
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
    console.error(`Unexpected error in email upgrade for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
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
