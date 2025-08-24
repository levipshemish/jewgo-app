import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { getCORSHeaders, ALLOWED_ORIGINS } from '@/lib/config/environment';
import { validateCSRFServer, validateSupabaseFeaturesWithLogging } from '@/lib/utils/auth-utils.server';
import { checkRateLimit } from '@/lib/rate-limiting';
import { verifyTurnstile } from '@/lib/turnstile';
import { consumeCaptchaTokenOnce } from '@/lib/anti-replay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin)
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const csrfToken = request.headers.get('x-csrf-token');
  const forwardedFor = request.headers.get('x-forwarded-for') || undefined;
  const realIP = request.headers.get('x-real-ip') || forwardedFor?.split(',')[0]?.trim() || '0.0.0.0';

  // Always include consistent CORS + caching headers
  const baseHeaders = getCORSHeaders(origin || undefined);

  // Feature guard: ensure required Supabase methods exist
  const featureOk = await validateSupabaseFeaturesWithLogging();
  if (!featureOk) {
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
      { status: 503, headers: baseHeaders }
    );
  }

  // CSRF and origin checks
  if (!validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken)) {
    return NextResponse.json(
      { error: 'CSRF' },
      { status: 403, headers: baseHeaders }
    );
  }

  // Rate limit by IP (left-most XFF handled inside backend)
  const rl = await checkRateLimit('', 'anonymous_auth', realIP, forwardedFor);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        remaining_attempts: rl.remaining_attempts ?? 0,
        reset_in_seconds: rl.reset_in_seconds ?? 300,
        retry_after: rl.retry_after
      },
      { status: 429, headers: baseHeaders }
    );
  }

  // Parse body for optional Turnstile token
  const body = await request.json().catch(() => ({} as any));
  const turnstileToken: string | undefined = body?.turnstileToken || body?.token;

  // Always require Turnstile token since it's configured for localhost
  if (!turnstileToken || turnstileToken.length < 10) {
    return NextResponse.json(
      { error: 'TURNSTILE_REQUIRED' },
      { status: 400, headers: baseHeaders }
    );
  }

  // If Turnstile token provided, verify and consume it
  if (turnstileToken) {
    try {
      const result = await verifyTurnstile(turnstileToken);

      // Require success
      if (!result.success) {
        return NextResponse.json(
          { error: 'TURNSTILE_INVALID' },
          { status: 400, headers: baseHeaders }
        );
      }

      // In production, require hostname assertion to be present
      if (process.env.NODE_ENV === 'production' && !result.hostname) {
        return NextResponse.json(
          { error: 'TURNSTILE_INVALID' },
          { status: 400, headers: baseHeaders }
        );
      }

      // One-shot replay protection
      await consumeCaptchaTokenOnce(turnstileToken);
    } catch (_err) {
      // Verification or replay protection failed
      return NextResponse.json(
        { error: 'TURNSTILE_INVALID' },
        { status: 400, headers: baseHeaders }
      );
    }
  }

  // Create SSR Supabase client bound to response cookies
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
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  // Attempt anonymous sign-in with Turnstile token (required by Supabase)
  try {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        captchaToken: turnstileToken // Pass Turnstile token to Supabase
      }
    });
    
    if (error || !data?.user) {
      // console.error('Anonymous sign-in failed:', error);
      return NextResponse.json(
        { error: 'ANON_SIGNIN_FAILED', details: error?.message },
        { status: 500, headers: baseHeaders }
      );
    }
    
    // console.log('✅ Anonymous sign-in succeeded');
  } catch (_unexpectedError) {
    // console.error('Unexpected error during anonymous sign-in:', unexpectedError);
    return NextResponse.json(
      { error: 'UNEXPECTED_ERROR' },
      { status: 500, headers: baseHeaders }
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: baseHeaders }
  );
}

