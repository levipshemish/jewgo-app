import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateSupabaseFeatureSupport, validateCSRFServer, hashIPForPrivacy } from '@/lib/utils/auth-utils.server';
import { getCORSHeaders, ALLOWED_ORIGINS } from '@/lib/config/environment';
import { extractIsAnonymous, validateTrustedIP } from '@/lib/utils/auth-utils';
import { checkRateLimit } from '@/lib/rate-limiting';
import { verifyTurnstile } from '@/lib/utils/turnstile';

/**
 * Simplified anonymous authentication endpoint
 * Node.js runtime required for cookies and Supabase SSR
 * 
 * Runtime Choice: Using Node.js instead of Edge Runtime because:
 * - Supabase SSR client requires Node.js for cookie handling
 * - Feature validation and CSRF checks need Node.js crypto APIs
 * - Rate limiting module uses Node.js-specific features
 * - Better compatibility with existing auth utilities
 */
export const runtime = 'nodejs';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin || undefined)
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Anonymous auth POST request received');
    
    // Get origin for CORS
    const origin = request.headers.get('origin');
    
    // Feature support validation with logging
    const featuresSupported = validateSupabaseFeatureSupport();
    if (!featuresSupported) {
      console.error('Anonymous signin not supported - feature validation failed');
      return NextResponse.json(
        { error: 'ANON_SIGNIN_UNSUPPORTED' },
        { 
          status: 500,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Parse request body to get Turnstile token
    const body = await request.json();
    const turnstileToken = body.turnstileToken || body.recaptchaToken; // Support both for backward compatibility
    
    // Verify Turnstile token
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstile(turnstileToken, 'anonymous_signin', 0.5);
      if (!turnstileResult.success) {
        console.error('Turnstile verification failed:', turnstileResult.errors);
        return NextResponse.json(
          { error: 'TURNSTILE_FAILED', details: turnstileResult.errors },
          { 
            status: 400,
            headers: {
              ...getCORSHeaders(origin || undefined),
              'Cache-Control': 'no-store'
            }
          }
        );
      }
      console.log('Turnstile verification successful, score:', turnstileResult.score);
    } else {
      console.warn('No Turnstile token provided');
      return NextResponse.json(
        { error: 'TURNSTILE_REQUIRED', message: 'Turnstile token is required for anonymous sign-in' },
        { 
          status: 400,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // CSRF validation
    const referer = request.headers.get('referer');
    const csrfToken = request.headers.get('x-csrf-token');
    
    if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
      console.error('CSRF validation failed for anonymous signin');
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
    
    // Rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const reqIp = (request as any).ip || request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-ip') || 'unknown';
    const validatedIP = validateTrustedIP(reqIp, forwardedFor || undefined);
    const ipHash = hashIPForPrivacy(validatedIP);
    
    const rateLimitResult = await checkRateLimit(
      `anonymous_auth:${ipHash}`,
      'anonymous_auth',
      validatedIP,
      forwardedFor || undefined
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for anonymous auth IP hash: ${ipHash}`);
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          remaining_attempts: rateLimitResult.remaining_attempts,
          reset_in_seconds: rateLimitResult.reset_in_seconds,
          retry_after: rateLimitResult.retry_after
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
    
    // Basic environment validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
      return NextResponse.json(
        { error: 'CONFIGURATION_ERROR' },
        { 
          status: 500,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Create Supabase SSR client
    const cookieStore = await cookies();
    
    console.log('Creating Supabase client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    
    // Check for existing anonymous session
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    if (!getUserError && user && extractIsAnonymous(user)) {
      console.log('User already has anonymous session:', user.id);
      return NextResponse.json(
        { ok: true },
        { 
          status: 200,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    console.log('Attempting anonymous signin...');
    
    // Create anonymous user with CAPTCHA token
    const { data, error: signInError } = await supabase.auth.signInAnonymously({
      options: {
        captchaToken: turnstileToken
      }
    });
    
    if (signInError) {
      console.error('Anonymous signin failed:', signInError);
      console.error('Error details:', {
        message: signInError.message,
        status: signInError.status,
        name: signInError.name
      });
      return NextResponse.json(
        { error: 'ANON_SIGNIN_FAILED', details: signInError.message },
        { 
          status: 500,
          headers: {
            ...getCORSHeaders(origin || undefined),
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    console.log('Anonymous signin successful:', data.user?.id);
    
    // Success response
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
    console.error('Unexpected error in anonymous auth:', error);
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          ...getCORSHeaders(request.headers.get('origin') || undefined),
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
