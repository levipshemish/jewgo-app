import { NextRequest, NextResponse } from 'next/server';
import { handleBackendError, fetchWithTimeout, getFallbackResponse } from '../../../../lib/utils/backend-error-handler';

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

    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
      // Avoid caching in dev for fresh auth state
      cache: 'no-store',
    }, 5000); // 5 second timeout for auth requests

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
    // Use the centralized error handler
    const errorResponse = handleBackendError(e, {
      fallbackData: getFallbackResponse('profile'),
      customMessage: 'Authentication service temporarily unavailable'
    });
    
    return NextResponse.json(errorResponse, { status: 200 });
  }
}

