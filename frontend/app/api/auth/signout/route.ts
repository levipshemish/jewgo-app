import { NextRequest, NextResponse} from 'next/server';
import { cookies} from 'next/headers';
import { getCORSHeaders } from '@/lib/config/environment';

// export const runtime = 'nodejs';
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
  const baseHeaders = getCORSHeaders(origin || undefined);

  try {
    // Redirect the browser to backend logout so HttpOnly cookies on that domain are cleared
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/';
    const backendLogoutUrl = `${backendUrl}/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`;
    const redirect = NextResponse.redirect(backendLogoutUrl, 302);
    // Best effort: also clear any same-site cookies that may be set on this domain
    try {
      const cookieStore = await cookies();
      cookieStore.set('access_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
      cookieStore.set('refresh_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
      cookieStore.set('auth_access_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
      cookieStore.set('auth_refresh_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
    } catch {}
    Object.entries(baseHeaders).forEach(([k, v]) => redirect.headers.set(k, v));
    return redirect;

  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: baseHeaders });
  }
}
