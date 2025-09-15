/**
 * Enhanced API proxy utilities for secure authentication proxying
 * Implements proper Set-Cookie header forwarding, error mapping, and security handling
 */

import { NextRequest, NextResponse } from 'next/server';

export interface ProxyOptions {
  method?: string;
  body?: any;
  timeout?: number;
  preserveHeaders?: string[];
  mapErrors?: boolean;
  requireNodeRuntime?: boolean;
}

export interface ProxyResponse {
  response: NextResponse;
  status: number;
  headers: Headers;
}

/**
 * Enhanced proxy function that properly handles multiple Set-Cookie headers
 * and provides comprehensive error mapping
 */
export async function proxyToBackend(
  request: NextRequest,
  endpoint: string,
  options: ProxyOptions = {}
): Promise<ProxyResponse> {
  const {
    method = 'GET',
    body,
    timeout = 10000,
    preserveHeaders = ['cookie', 'authorization', 'user-agent', 'x-csrf-token'],
    mapErrors = true,
    requireNodeRuntime = false
  } = options;

  try {
    // Check runtime requirement
    if (requireNodeRuntime && process.env.NEXT_RUNTIME === 'edge') {
      throw new Error('This endpoint requires Node.js runtime');
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    const url = `${backendUrl}${endpoint}`;

    // Build headers from request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Preserve specified headers from original request
    preserveHeaders.forEach(headerName => {
      const value = request.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      credentials: 'include', // Important for cookie forwarding
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Handle 401/403 responses without exposing backend implementation details
    if (response.status === 401) {
      return {
        response: NextResponse.json(
          { 
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
            success: false
          },
          { status: 401 }
        ),
        status: 401,
        headers: response.headers
      };
    }

    if (response.status === 403) {
      return {
        response: NextResponse.json(
          { 
            error: 'Access forbidden',
            code: 'FORBIDDEN', 
            success: false
          },
          { status: 403 }
        ),
        status: 403,
        headers: response.headers
      };
    }

    // Get response body
    const responseBody = await response.text();
    
    // Create response with proper header forwarding
    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      }
    });

    // Forward multiple Set-Cookie headers using response.headers.raw()
    const setCookieHeaders = getSetCookieHeaders(response);
    setCookieHeaders.forEach(cookieValue => {
      try {
        nextResponse.headers.append('Set-Cookie', cookieValue);
      } catch (error) {
        // Fallback for test environments where append might not be available
        nextResponse.headers.set('Set-Cookie', cookieValue);
      }
    });

    // Forward other important headers
    const headersToForward = [
      'x-correlation-id',
      'x-request-id', 
      'retry-after',
      'x-rate-limit-remaining',
      'x-rate-limit-reset'
    ];

    headersToForward.forEach(headerName => {
      const value = response.headers.get(headerName);
      if (value) {
        nextResponse.headers.set(headerName, value);
      }
    });

    return {
      response: nextResponse,
      status: response.status,
      headers: response.headers
    };

  } catch (error) {
    if (mapErrors) {
      return handleProxyError(error);
    }
    
    throw error;
  }
}

/**
 * Extract Set-Cookie headers from response, handling both single and multiple cookies
 * Uses response.headers.raw() when available (Node.js runtime) for proper multiple cookie handling
 */
function getSetCookieHeaders(response: Response): string[] {
  try {
    // Try to use raw() method for Node.js runtime (proper multiple Set-Cookie handling)
    const rawHeaders = (response.headers as any).raw?.();
    if (rawHeaders && rawHeaders['set-cookie']) {
      return Array.isArray(rawHeaders['set-cookie']) 
        ? rawHeaders['set-cookie'] 
        : [rawHeaders['set-cookie']];
    }
  } catch {
    // Fall back to standard method if raw() is not available
  }

  // Fallback: collect all Set-Cookie headers manually
  const setCookies: string[] = [];
  
  // In some environments, we can iterate over headers
  try {
    for (const [name, value] of response.headers.entries()) {
      if (name.toLowerCase() === 'set-cookie') {
        setCookies.push(value);
      }
    }
  } catch {
    // Final fallback: single Set-Cookie header
    const singleCookie = response.headers.get('set-cookie');
    if (singleCookie) {
      setCookies.push(singleCookie);
    }
  }

  return setCookies;
}

/**
 * Handle and map proxy errors to appropriate responses
 */
function handleProxyError(error: any): ProxyResponse {
  // Handle timeout errors
  if (error.name === 'AbortError') {
    return {
      response: NextResponse.json(
        { 
          error: 'Request timeout',
          code: 'TIMEOUT',
          success: false
        },
        { status: 408 }
      ),
      status: 408,
      headers: new Headers()
    };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      response: NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          code: 'NETWORK_ERROR',
          success: false
        },
        { status: 503 }
      ),
      status: 503,
      headers: new Headers()
    };
  }

  // Handle other errors
  return {
    response: NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        success: false,
        message: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    ),
    status: 500,
    headers: new Headers()
  };
}

/**
 * Create a standardized error response for auth endpoints
 */
export function createAuthErrorResponse(
  error: string,
  code: string,
  status: number,
  details?: any
): NextResponse {
  const response = NextResponse.json(
    {
      error,
      code,
      success: false,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString()
    },
    { status }
  );
  
  // Set headers manually to ensure they're set correctly
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Content-Type', 'application/json');
  
  return response;
}

/**
 * Validate that required environment variables are present
 */
export function validateProxyEnvironment(): void {
  if (!process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.BACKEND_URL) {
    throw new Error('Backend URL not configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL');
  }
}

/**
 * Check if we're running in Node.js runtime (required for some proxy features)
 */
export function isNodeRuntime(): boolean {
  return process.env.NEXT_RUNTIME !== 'edge';
}

/**
 * Middleware to ensure Node.js runtime for endpoints that require it
 */
export function requireNodeRuntime() {
  if (!isNodeRuntime()) {
    throw new Error('This endpoint requires Node.js runtime for proper Set-Cookie header handling');
  }
}