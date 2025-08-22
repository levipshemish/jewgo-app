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
  extractIsAnonymous,
  validateSupabaseFeatureSupport
} from '@/lib/utils/auth-utils';
import { 
  validateCSRFServer, 
  hashIPForPrivacy,
  validateSupabaseFeaturesWithLogging
} from '@/lib/utils/auth-utils.server';
import { 
  ALLOWED_ORIGINS, 
  getCORSHeaders,
  FEATURE_FLAGS
} from '@/lib/config/environment.public';
import { initializeServer, isAnonymousAuthSupported } from '@/lib/server-init';

/**
 * Runtime choice documentation:
 * 
 * Using 'nodejs' runtime for server-side features:
 * - HMAC-based CSRF validation requires Node.js crypto
 * - Server initialization and feature guard
 * - Complex rate limiting with Redis operations (ioredis/standard Redis)
 * - Comprehensive logging and error handling
 * 
 * Alternative: 'edge' runtime could be used when:
 * - Using Upstash Redis REST API exclusively
 * - No Node.js-specific crypto operations needed
 * - Simplified rate limiting with Upstash REST calls
 * 
 * Performance considerations:
 * - Edge runtime: Lower latency, better cold start performance
 * - Node.js runtime: Full Node.js ecosystem, better for complex operations
 * 
 * Current choice: Node.js for production reliability and feature completeness
 */
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
  
  // Initialize server-side functionality
  const serverInitialized = await initializeServer();
  if (!serverInitialized) {
    console.error(`Server initialization failed for correlation ID: ${correlationId}`, {
      correlationId
    });
    
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  // Check cached anonymous auth support
  if (!isAnonymousAuthSupported()) {
    console.error(`Anonymous auth not supported for correlation ID: ${correlationId}`, {
      correlationId
    });
    
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }

  // Feature support validation
  const featuresSupported = await validateSupabaseFeaturesWithLogging();
  if (!featuresSupported) {
    console.error(`CRITICAL: Supabase features not supported for correlation ID: ${correlationId}`, {
      correlationId
    });
    
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
      { 
        status: 503,
        headers: {
          ...getCORSHeaders(origin || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
  }
  

  

  
  // Kill switch check for anonymous auth feature flag
  if (!FEATURE_FLAGS.ANONYMOUS_AUTH) {
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
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
    const platformIP = (request as any).ip || (request as any).cf?.connectingIP;
    const realIPHeader = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIP = platformIP || realIPHeader || 'unknown';
    
    // Trusted IP validation with left-most X-Forwarded-For parsing
    const validatedIP = validateTrustedIP(realIP, forwardedFor || undefined);
    const ipHash = hashIPForPrivacy(validatedIP);
    
    // Comprehensive CSRF validation with signed token fallback
    // Skip CSRF validation in development/Docker environments
    if (process.env.NODE_ENV === 'development' || process.env.DOCKER === 'true') {
      console.log(`Development/Docker mode: Skipping CSRF validation for correlation ID: ${correlationId}`);
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
    
    // Parse request body for captcha token
    const body = await request.json().catch(() => ({}));
    const { turnstileToken, recaptchaToken } = body;
    const captchaToken = turnstileToken || recaptchaToken;
    
    // Rate limiting for anonymous auth
    const rateLimitResult = await checkRateLimit(
      `anonymous_auth:${ipHash}`,
      'anonymous_auth',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for anonymous auth IP hash: ${ipHash}`, {
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
    
    // Validate Turnstile token if rate limit exceeded
    // Skip Turnstile validation in development/Docker environments
    if (process.env.NODE_ENV === 'development' || process.env.DOCKER === 'true') {
      console.log(`Development/Docker mode: Skipping Turnstile validation for correlation ID: ${correlationId}`);
    } else if (rateLimitResult.remaining_attempts === 0) {
      if (!turnstileToken) {
        console.warn(`Turnstile token required for anonymous auth IP hash: ${ipHash}`, {
          correlationId,
          ipHash
        });
        
        return NextResponse.json(
          { error: 'TURNSTILE_REQUIRED' },
          { 
            status: 400,
            headers: {
              ...getCORSHeaders(origin || undefined),
              'Cache-Control': 'no-store'
            }
          }
        );
      }
      
      // Verify Turnstile token server-side
      try {
        const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: validatedIP
          })
        });
        
        const turnstileResult = await turnstileResponse.json();
        
        if (!turnstileResult.success) {
          console.warn(`Turnstile verification failed for anonymous auth IP hash: ${ipHash}`, {
            correlationId,
            ipHash,
            turnstileErrors: turnstileResult['error-codes']
          });
          
          return NextResponse.json(
            { error: 'TURNSTILE_FAILED' },
            { 
              status: 400,
              headers: {
                ...getCORSHeaders(origin || undefined),
                'Cache-Control': 'no-store'
              }
            }
          );
        }
      } catch (turnstileError) {
        console.error(`Turnstile verification error for anonymous auth IP hash: ${ipHash}`, {
          correlationId,
          ipHash,
          error: turnstileError
        });
        
        return NextResponse.json(
          { error: 'TURNSTILE_FAILED' },
          { 
            status: 400,
            headers: {
              ...getCORSHeaders(origin || undefined),
              'Cache-Control': 'no-store'
            }
          }
        );
      }
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
    
    // Check for existing anonymous session before creating new one
    const { data: { user: existingUser }, error: getUserError } = await supabase.auth.getUser();
    
    if (!getUserError && existingUser && extractIsAnonymous(existingUser)) {
      console.log(`User already has anonymous session for correlation ID: ${correlationId}`, {
        user_id: existingUser.id,
        correlationId
      });
      
      return NextResponse.json(
        { 
          ok: true, 
          user_id: existingUser.id,
          message: 'Anonymous session already exists'
        },
        { 
          status: 200,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Create anonymous user
    // In development/Docker mode, don't pass captcha token to Supabase
    const signInOptions = process.env.NODE_ENV === 'development' || process.env.DOCKER === 'true' 
      ? {}
      : { options: { captchaToken: turnstileToken } };
    
    const { data, error: signInError } = await supabase.auth.signInAnonymously(signInOptions);
    
    if (signInError) {
      console.error(`Anonymous signin failed for correlation ID: ${correlationId}`, {
        error: signInError,
        correlationId
      });
      
      return NextResponse.json(
        { 
          error: 'ANON_SIGNIN_FAILED',
          details: signInError.message,
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
    
    console.log(`Anonymous signin successful for correlation ID: ${correlationId}`, {
      user_id: data.user?.id,
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        ok: true, 
        user_id: data.user?.id,
        message: 'Anonymous signin successful'
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
    console.error(`Unexpected error in anonymous auth for correlation ID: ${correlationId}`, {
      error: scrubPII(error),
      correlationId,
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        error: 'ANON_SIGNIN_FAILED',
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
