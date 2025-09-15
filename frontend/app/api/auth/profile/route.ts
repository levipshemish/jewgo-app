import { NextRequest } from 'next/server';
import { proxyToBackend, createAuthErrorResponse } from '@/lib/api/proxy-utils';

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend with enhanced error handling
    const { response } = await proxyToBackend(
      request,
      '/api/v5/auth/profile',
      {
        method: 'GET',
        timeout: 10000,
        preserveHeaders: ['cookie', 'authorization', 'user-agent'],
        mapErrors: true,
        requireNodeRuntime: false // GET requests don't need Set-Cookie forwarding
      }
    );

    return response;

  } catch (error: any) {
    console.error('Profile proxy error:', error);
    
    return createAuthErrorResponse(
      'Profile service temporarily unavailable',
      'PROFILE_ERROR',
      503,
      error.message
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get request body
    const body = await request.text();

    // Proxy to backend with enhanced error handling
    const { response } = await proxyToBackend(
      request,
      '/api/v5/auth/profile',
      {
        method: 'PUT',
        body,
        timeout: 10000,
        preserveHeaders: ['cookie', 'authorization', 'user-agent', 'x-csrf-token'],
        mapErrors: true,
        requireNodeRuntime: false
      }
    );

    return response;

  } catch (error: any) {
    console.error('Profile update proxy error:', error);
    
    return createAuthErrorResponse(
      'Profile update service temporarily unavailable',
      'PROFILE_UPDATE_ERROR',
      503,
      error.message
    );
  }
}
