import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
import { corsHeaders, buildSecurityHeaders } from '@/lib/middleware/security';

// Type definitions for better type safety
interface UserData {
  success: boolean;
  data?: {
    id: string;
    email: string;
    role?: string;
    auth_time?: number;
    [key: string]: unknown;
  };
}

interface AuthError extends Error {
  message: string;
  code?: string;
}

// Enhanced middleware with security hardening and admin route protection
// Apply middleware only to protected routes for performance optimization
export const config = {
  matcher: [
    // Protected routes that require authentication
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/favorites/:path*',
    '/account/:path*',
  ]
};

/**
 * Enhanced security middleware with authentication checks
 * Uses HEAD /api/v5/auth/verify-token for performance optimization
 * Preserves returnTo parameter for post-login redirects
 * Applies security headers and handles authentication failures
 * 
 * Note: Auth pages (/auth/*) are excluded from middleware processing to prevent redirect loops
 */
export async function middleware(request: NextRequest) {
  try {
    // Only process protected paths. In Next.js runtime, matcher limits execution,
    // but unit tests call this function directly for any path.
    const path = request.nextUrl.pathname;
    const isApi = path.startsWith('/api/admin');
    
    // Handle CORS preflight requests for API only
    if (isApi && request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
    }
    
    if (!isProtectedPath(path)) {
      // Apply security headers to all responses, even non-protected ones
      const response = NextResponse.next();
      Object.entries(buildSecurityHeaders(request)).forEach(([k,v]) => response.headers.set(k, v as string));
      return response;
    }

    // Create response with security headers
    const response = NextResponse.next();
    Object.entries(buildSecurityHeaders(request)).forEach(([k,v]) => response.headers.set(k, v as string));
    
    // Use HEAD /api/v5/auth/verify-token for performance optimization
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        'https://api.jewgo.app';
      
      // Use HEAD method for performance - no response body needed
      const verifyResponse = await fetch(`${backendUrl}/api/v5/auth/verify-token`, {
        method: 'HEAD',
        credentials: 'include',
        // Add timeout for performance
        signal: AbortSignal.timeout(5000)
      });

      if (!verifyResponse.ok) {
        return handleUnauthenticatedUser(request, isApi);
      }

      // For HEAD requests, we only get status - assume authenticated if 200
      // Handle authenticated users
      return await handleAuthenticatedUser(request, isApi, null, response);
    } catch (error) {
      console.error('Middleware auth verification error:', error);
      return handleAuthError(request, isApi, error as AuthError);
    }

  } catch (error) {
    console.error('Middleware error:', error);
    return handleMiddlewareError(request, error);
  }
}

/**
 * Handle authentication errors
 */
function handleAuthError(request: NextRequest, isApi: boolean, error: AuthError): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { error: 'Authentication error', details: error.message }, 
      { status: 401, headers: corsHeaders(request) }
    );
  }
  return redirectToSignin(request);
}

/**
 * Handle unauthenticated users
 */
function handleUnauthenticatedUser(request: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401, headers: corsHeaders(request) }
    );
  }
  return redirectToSignin(request);
}

/**
 * Handle authenticated users
 */
async function handleAuthenticatedUser(
  request: NextRequest, 
  isApi: boolean, 
  _user: UserData['data'] | null, 
  response: NextResponse
): Promise<NextResponse> {
  // Check if this is a sensitive operation requiring step-up authentication
  if (requiresStepUpAuth(request.nextUrl.pathname)) {
    return handleStepUpAuthRequired(request, isApi);
  }

  // For middleware, we just check that the user is authenticated
  // Admin role checking will be handled in the API routes and components
  if (isApi) {
    // For API routes, let the route handler check admin permissions
    return response;
  } else {
    // For UI routes, allow access to admin pages (permissions will be checked in components)
    return response;
  }
}

/**
 * Handle middleware errors
 */
function handleMiddlewareError(request: NextRequest, _error: unknown): NextResponse {
  const isApi = request.nextUrl.pathname.startsWith('/api/admin');
  
  if (isApi) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders(request) }
    );
  }
  
  // For UI routes, redirect to error page or sign-in
  return redirectToSignin(request);
}

/**
 * Redirect to sign-in page with returnTo parameter preservation
 */
function redirectToSignin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;
  const sanitizedRedirect = validateRedirectUrl(fullPath);
  
  // Preserve returnTo parameter for post-login redirects
  const redirectUrl = `/auth/signin?returnTo=${encodeURIComponent(sanitizedRedirect)}`;
  
  const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url), 302);
  
  // Add security headers
  redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  redirectResponse.headers.set('Pragma', 'no-cache');
  redirectResponse.headers.set('Expires', '0');
  
  return redirectResponse;
}

/**
 * Check if path requires protection
 */
function isProtectedPath(pathname: string): boolean {
  // Exclude auth routes to prevent redirect loops
  if (pathname.startsWith('/auth/') || 
      pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/favicon.ico')) {
    return false;
  }
  
  // Protected paths that require authentication
  const protectedPaths = [
    '/admin',
    '/api/admin',
    '/dashboard',
    '/profile',
    '/settings',
    '/favorites',
    '/account'
  ];
  
  return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if path requires step-up authentication
 */
function requiresStepUpAuth(pathname: string): boolean {
  // Sensitive operations requiring fresh session or WebAuthn
  const stepUpPaths = [
    '/admin/users/roles',
    '/admin/api-keys',
    '/settings/billing',
    '/settings/security',
    '/account/delete'
  ];
  
  return stepUpPaths.some(path => pathname.startsWith(path));
}

/**
 * Handle step-up authentication requirement
 */
function handleStepUpAuthRequired(request: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { 
        error: 'Step-up authentication required',
        code: 'STEP_UP_REQUIRED',
        hint: 'fresh_session_required'
      }, 
      { status: 403, headers: corsHeaders(request) }
    );
  }
  
  // Redirect to step-up authentication challenge
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;
  const sanitizedRedirect = validateRedirectUrl(fullPath);
  const challengeUrl = `/auth/step-up?returnTo=${encodeURIComponent(sanitizedRedirect)}`;
  
  return NextResponse.redirect(new URL(challengeUrl, request.url), 302);
}

/**
 * Check if path is allowed for anonymous users
 */
function _isAnonymousAllowedPath(_pathname: string): boolean {
  // Allow public pages for anonymous users
  // This helper is intentionally unused in middleware runtime but kept for future extension
  return false;
}
