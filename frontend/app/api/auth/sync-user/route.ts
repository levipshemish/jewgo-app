import { NextRequest, NextResponse } from 'next/server';
import { isPostgresAuthConfigured } from '@/lib/utils/auth-utils-client';

export async function GET(request: NextRequest) {
  try {
    if (!isPostgresAuthConfigured()) {
      return NextResponse.json({ success: false, error: 'PostgreSQL auth not configured', user: null }, { status: 500 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';

    // Prefer Authorization header; cookie-mode cookies for backend domain are not readable here
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized', user: null }, { status: 401 });
    }
    
    const resp = await fetch(`${backendUrl}/api/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      const status = resp.status === 401 ? 401 : 500;
      return NextResponse.json({ success: false, error: status === 401 ? 'Unauthorized' : 'Upstream error', user: null }, { status });
    }
    const data = await resp.json();
    if (!data?.success || !data?.data) {
      return NextResponse.json({ success: false, error: 'Unauthorized', user: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, user: data.data }, { status: 200 });
  } catch (error) {
    console.error('[Auth] Sync user error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', user: null }, { status: 500 });
  }
}
