import { NextRequest } from 'next/server';
import { proxyToBackend, createAuthErrorResponse } from '@/lib/api/proxy-utils';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.text();

    // Proxy to backend with enhanced error handling
    const { response } = await proxyToBackend(
      request,
      '/api/v5/auth/change-password',
      {
        method: 'POST',
        body,
        timeout: 10000,
        preserveHeaders: ['cookie', 'authorization', 'user-agent', 'x-csrf-token'],
        mapErrors: true,
        requireNodeRuntime: false // Password change doesn't typically set new cookies
      }
    );

    return response;

  } catch (error: any) {
    console.error('Change password proxy error:', error);
    
    return createAuthErrorResponse(
      'Password change service temporarily unavailable',
      'PASSWORD_CHANGE_ERROR',
      503,
      error.message
    );
  }
}
