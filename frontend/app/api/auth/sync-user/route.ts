import { NextRequest, NextResponse } from 'next/server';
import { isPostgresAuthConfigured } from '@/lib/utils/auth-utils-client';

export async function GET(request: NextRequest) {
  try {
    if (!isPostgresAuthConfigured()) {
      return NextResponse.json({ success: false, error: 'PostgreSQL auth not configured', user: null }, { status: 500 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';

    // Forward all cookies from the request to the backend
    const cookieHeader = request.headers.get('cookie');
    
    const resp = await fetch(`${backendUrl}/api/auth/sync-user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for HttpOnly auth
        ...(cookieHeader && { 'Cookie': cookieHeader }),
        // Forward other relevant headers
        ...(request.headers.get('user-agent') && { 'User-Agent': request.headers.get('user-agent')! }),
        ...(request.headers.get('x-forwarded-for') && { 'X-Forwarded-For': request.headers.get('x-forwarded-for')! }),
      },
      signal: AbortSignal.timeout(5000),
    });

    // Forward the backend response
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
    
  } catch (error) {
    console.error('[Auth] Sync user error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Auth sync service temporarily unavailable', 
      user: null 
    }, { status: 500 });
  }
}
