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
    // Get JWT token from Authorization header or cookies
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : request.cookies.get('auth_access_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'NO_TOKEN' }, { status: 401, headers: baseHeaders });
    }

    // Call backend logout endpoint
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    const logoutResponse = await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!logoutResponse.ok) {
      console.error('Backend logout failed:', logoutResponse.status);
      // Continue with local logout even if backend fails
    }

    // Clear local cookies
    const cookieStore = await cookies();
    cookieStore.set('auth_access_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
    cookieStore.set('auth_refresh_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
    cookieStore.set('auth_expires_at', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });

    return NextResponse.json({ ok: true }, { status: 200, headers: baseHeaders });

  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500, headers: baseHeaders });
  }
}
