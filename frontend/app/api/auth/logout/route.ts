import { NextRequest } from 'next/server';
import { proxyToBackend, createAuthErrorResponse, requireNodeRuntime } from '@/lib/api/proxy-utils';

// Use Node.js runtime for proper Set-Cookie header handling
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Ensure Node.js runtime for proper multiple Set-Cookie header forwarding
    requireNodeRuntime();

    // Proxy to backend with enhanced error handling
    const { response } = await proxyToBackend(
      request,
      '/api/v5/auth/logout',
      {
        method: 'POST',
        body: '{}', // Empty body for logout
        timeout: 10000,
        preserveHeaders: ['cookie', 'user-agent', 'x-csrf-token'],
        mapErrors: true,
        requireNodeRuntime: true
      }
    );

    return response;

  } catch (error: any) {
    console.error('Logout proxy error:', error);
    
    return createAuthErrorResponse(
      'Logout service temporarily unavailable',
      'LOGOUT_ERROR',
      503,
      error.message
    );
  }
}
