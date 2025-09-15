import { NextRequest } from 'next/server';
import { proxyToBackend, createAuthErrorResponse, ensureNodeRuntime } from '@/lib/api/proxy-utils';

// Use Node.js runtime for proper Set-Cookie header handling
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Ensure Node.js runtime for proper multiple Set-Cookie header forwarding
    ensureNodeRuntime();

    // Get request body
    const body = await request.text();

    // Proxy to backend with enhanced error handling
    const { response } = await proxyToBackend(
      request,
      '/api/v5/auth/refresh',
      {
        method: 'POST',
        body,
        timeout: 10000,
        preserveHeaders: ['cookie', 'user-agent', 'x-csrf-token'],
        mapErrors: true,
        requireNodeRuntime: true
      }
    );

    return response;

  } catch (error: any) {
    console.error('Token refresh proxy error:', error);
    
    return createAuthErrorResponse(
      'Token refresh service temporarily unavailable',
      'REFRESH_ERROR',
      503,
      error.message
    );
  }
}
