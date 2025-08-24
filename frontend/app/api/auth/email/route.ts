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
} from '@/lib/config/environment';
import { initializeServer, getFeatureValidationCache } from '@/lib/server-init';

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
  
  console.log(`Email auth request received for correlation ID: ${correlationId}`, {
    method: request.method,
    origin,
    correlationId
  });
  
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

  // Feature support validation - check cache first
  const cachedValidation = getFeatureValidationCache();
  if (cachedValidation === false) {
    console.error(`CRITICAL: Supabase features not supported (cached) for correlation ID: ${correlationId}`, {
      correlationId
    });
    
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
  
  // If cache is null (not initialized) or true, run validation
  if (cachedValidation === null) {
    const featuresSupported = await validateSupabaseFeaturesWithLogging();
    if (!featuresSupported) {
      console.error(`CRITICAL: Supabase features not supported for correlation ID: ${correlationId}`, {
        correlationId
      });
      
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
      // Development bypass
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
    
    // Parse request body for email, password, and captcha token
    const body = await request.json().catch(() => ({}));
    const { email, password, turnstileToken } = body;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { 
          status: 400,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Rate limiting for email auth
    const rateLimitResult = await checkRateLimit(
      `email_auth:${ipHash}`,
      'email_auth',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for email auth IP hash: ${ipHash}`, {
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
    
    // Validate Turnstile token - required for email sign-in
    if (!turnstileToken) {
      console.warn(`Turnstile token required for email auth IP hash: ${ipHash}`, {
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
    const isTestKey = process.env.TURNSTILE_SECRET_KEY === '1x0000000000000000000000000000000AA';
    const isDevelopmentBypass = turnstileToken === 'DEVELOPMENT_BYPASS';
    
    if (isDevelopmentBypass) {
      console.log(`Development bypass detected for email auth IP hash: ${ipHash}`, {
        correlationId,
        ipHash
      });
    } else if (!isTestKey) {
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
          console.warn(`Turnstile verification failed for email auth IP hash: ${ipHash}`, {
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
        console.error(`Turnstile verification error for email auth IP hash: ${ipHash}`, {
          correlationId,
          ipHash,
          error: turnstileError
        });
        
        return NextResponse.json(
          { error: 'TURNSTILE_ERROR' },
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
    
    // Create Supabase server client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    // Attempt email sign-in with Supabase
    // For development, return mock response to bypass CAPTCHA issues
    if (process.env.NODE_ENV === 'development' && isDevelopmentBypass) {
      console.log(`Development bypass: Mocking successful email auth for ${scrubPII(email)}`);
      
      // Return a mock successful response for development
      return NextResponse.json(
        { 
          ok: true,
          user: {
            id: 'dev-user-id',
            email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            app_metadata: { provider: 'email' },
            user_metadata: {},
            aud: 'authenticated',
            role: 'authenticated'
          },
          session: {
            access_token: 'dev-access-token',
            refresh_token: 'dev-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
              id: 'dev-user-id',
              email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              app_metadata: { provider: 'email' },
              user_metadata: {},
              aud: 'authenticated',
              role: 'authenticated'
            }
          },
          correlation_id: correlationId
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
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.warn(`Email auth failed for IP hash: ${ipHash}`, {
        correlationId,
        ipHash,
        error: error.message,
        email: scrubPII(email)
      });
      
      return NextResponse.json(
        { error: error.message },
        { 
          status: 400,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Success - return user data
    console.log(`Email auth successful for IP hash: ${ipHash}`, {
      correlationId,
      ipHash,
      email: scrubPII(email),
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { 
        ok: true,
        user: data.user,
        session: data.session,
        correlation_id: correlationId
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
    console.error(`Unexpected error in email auth for correlation ID: ${correlationId}`, {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    });
    
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
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
