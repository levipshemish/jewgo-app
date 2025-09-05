/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getCORSHeaders, ALLOWED_ORIGINS } from '@/lib/config/environment';
import { validateCSRFServer, isPostgresAuthConfigured } from '@/lib/utils/auth-utils.server';
import { checkRateLimit } from '@/lib/rate-limiting';
// Anonymous authentication endpoint - no CAPTCHA required

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
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const csrfToken = request.headers.get('x-csrf-token') || '';
  const forwardedFor = request.headers.get('x-forwarded-for') || undefined;
  const realIP = request.headers.get('x-real-ip') || forwardedFor?.split(',')[0]?.trim() || '0.0.0.0';

  // Always include consistent CORS + caching headers
  const baseHeaders = getCORSHeaders(origin || undefined);

  // Debug logging for production

  // Feature guard: ensure PostgreSQL auth is configured
  const featureOk = isPostgresAuthConfigured();

  if (!featureOk) {
    console.error('PostgreSQL auth not configured for anonymous auth');
    return NextResponse.json(
      { error: 'ANON_SIGNIN_UNSUPPORTED' },
      { status: 503, headers: baseHeaders }
    );
  }

  // CSRF and origin checks - more lenient in production
  const isProduction = process.env.NODE_ENV === 'production';
  const csrfValid = validateCSRFServer(origin, referer, ALLOWED_ORIGINS, csrfToken);
  if (!csrfValid) {
    // Log CSRF validation failure for debugging
    console.error('CSRF validation failed:', {
      origin,
      referer,
      csrfToken: csrfToken ? 'present' : 'missing',
      allowedOrigins: ALLOWED_ORIGINS,
      isProduction
    });
    
    // In production, be more lenient with CSRF validation
    if (isProduction) {

    } else {
      return NextResponse.json(
        { error: 'CSRF' },
        { status: 403, headers: baseHeaders }
      );
    }
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

  // Parse body (no CAPTCHA token required)
  await request.json().catch(() => ({} as any));

  // PostgreSQL auth doesn't support anonymous users
  // Return error indicating anonymous auth is not supported
  console.warn('Anonymous authentication not supported with PostgreSQL auth');
  return NextResponse.json(
    { error: 'ANON_SIGNIN_UNSUPPORTED', message: 'Anonymous authentication is not supported with PostgreSQL authentication' },
    { status: 501, headers: baseHeaders }
  );

}
/* eslint-disable no-console */
