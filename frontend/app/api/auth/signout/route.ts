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
    // Call backend logout API directly and return JSON response
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    if (!backendUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Backend URL not configured' 
      }, { status: 500, headers: baseHeaders });
    }

    // Forward the logout request to the backend
    const backendResponse = await fetch(`${backendUrl}/api/v5/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      // Forward cookies to backend
      credentials: 'include'
    });

    // Clear frontend cookies regardless of backend response
    const cookieStore = await cookies();
    try {
      cookieStore.set('access_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
      cookieStore.set('refresh_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
      cookieStore.set('auth_access_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
      cookieStore.set('auth_refresh_token', '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' });
    } catch (cookieError) {
      console.warn('Failed to clear some cookies:', cookieError);
    }

    // Return the backend response or success if backend call failed
    if (backendResponse.ok) {
      const backendData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: true,
        message: backendData.message || 'Logout successful'
      }, { status: 200, headers: baseHeaders });
    } else {
      // Even if backend logout fails, we've cleared frontend cookies
      console.warn('Backend logout failed, but frontend cookies cleared');
      return NextResponse.json({
        success: true,
        message: 'Logout completed (frontend cookies cleared)'
      }, { status: 200, headers: baseHeaders });
    }

  } catch (error) {
    console.error('Sign out error:', error);
    
    // Even on error, try to clear cookies
    try {
      const cookieStore = await cookies();
      cookieStore.set('access_token', '', { maxAge: 0 });
      cookieStore.set('refresh_token', '', { maxAge: 0 });
      cookieStore.set('auth_access_token', '', { maxAge: 0 });
      cookieStore.set('auth_refresh_token', '', { maxAge: 0 });
    } catch {}
    
    return NextResponse.json({ 
      success: false, 
      error: 'Sign out failed' 
    }, { status: 500, headers: baseHeaders });
  }
}
