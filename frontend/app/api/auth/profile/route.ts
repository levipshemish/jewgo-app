import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
    const url = `${backendUrl}/api/auth/profile`;

    // Forward cookies and auth headers if present (best-effort)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const cookie = request.headers.get('cookie');
    if (cookie) headers['cookie'] = cookie;
    const auth = request.headers.get('authorization');
    if (auth) headers['authorization'] = auth;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      // Avoid caching in dev for fresh auth state
      cache: 'no-store',
    });

    const body = await res.text();
    const response = new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: 'Proxy error', message: e?.message }, { status: 502 });
  }
}

