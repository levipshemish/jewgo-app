import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateRedirectUrl } from '@/lib/utils/auth-utils';
import { corsHeaders, buildSecurityHeaders } from '@/lib/middleware/security';
import { AuthError } from '@/lib/auth/errors';

// Type definitions for better type safety
interface _UserData {
  success: boolean;
  data?: {
    id: string;
    email: string;
    role?: string;
    auth_time?: number;
    [key: string]: unknown;
  };
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
      
      // Get access token from cookies or headers
      const accessToken = request.cookies.get('access_token')?.value ||
                         request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!accessToken) {
        return handleUnauthenticatedUser(request, isApi);
      }
      
      // Use HEAD method for performance - no response body needed
      const verifyResponse = await fetch(`${backendUrl}/api/v5/auth/verify-token`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'JewGo-Frontend-Middleware/1.0'
        },
        credentials: 'include',
        // Add timeout for performance
        signal: AbortSignal.timeout(5000)
      });

      // Handle different response codes
      if (verifyResponse.status === 401) {
        return handleUnauthenticatedUser(request, isApi);
      }
      
      if (verifyResponse.status === 403) {
        // Check if step-up authentication is required
        const stepUpHeader = verifyResponse.headers.get('X-Step-Up-Required');
        if (stepUpHeader) {
          return handleStepUpAuthRequired(request, isApi, stepUpHeader);
        }
        return handleInsufficientPermissions(request, isApi);
      }
      
      if (verifyResponse.status === 429) {
        return handleRateLimitExceeded(request, isApi, verifyResponse);
      }

      if (!verifyResponse.ok) {
        return handleAuthError(request, isApi, new AuthError(`Auth verification failed: ${verifyResponse.status}`, 'AUTH_VERIFICATION_FAILED'));
      }

      // Extract user info from response headers if available
      const userId = verifyResponse.headers.get('X-User-ID');
      const userRoles = verifyResponse.headers.get('X-User-Roles');
      const userPermissions = verifyResponse.headers.get('X-User-Permissions');
      
      const userData = userId ? {
        id: userId,
        roles: userRoles ? userRoles.split(',') : [],
        permissions: userPermissions ? userPermissions.split(',') : []
      } : null;

      // Handle authenticated users
      return await handleAuthenticatedUser(request, isApi, userData, response);
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
  user: { id: string; roles: string[]; permissions: string[] } | null, 
  response: NextResponse
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  
  // Check if this is a sensitive operation requiring step-up authentication
  if (requiresStepUpAuth(pathname)) {
    return handleStepUpAuthRequired(request, isApi, getRequiredStepUpMethod(pathname));
  }

  // Check admin access for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user || !hasAdminRole(user.roles)) {
      return handleInsufficientPermissions(request, isApi);
    }
  }

  // Add user context to response headers for client-side access
  if (user) {
    response.headers.set('X-User-ID', user.id);
    response.headers.set('X-User-Roles', user.roles.join(','));
    response.headers.set('X-User-Permissions', user.permissions.join(','));
  }

  return response;
}

/**
 * Check if user has admin role
 */
function hasAdminRole(roles: string[]): boolean {
  return roles.some(role => ['admin', 'super_admin'].includes(role));
}

/**
 * Get required step-up method for path
 */
function getRequiredStepUpMethod(pathname: string): string {
  // Define step-up methods based on sensitivity
  const webauthnPaths = [
    '/admin/users/roles',
    '/admin/api-keys',
    '/settings/security/webauthn'
  ];
  
  if (webauthnPaths.some(path => pathname.startsWith(path))) {
    return 'webauthn';
  }
  
  return 'password'; // Default to password
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
function handleStepUpAuthRequired(request: NextRequest, isApi: boolean, stepUpMethod?: string): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { 
        error: 'Step-up authentication required',
        code: 'STEP_UP_REQUIRED',
        required_method: stepUpMethod || 'password',
        hint: 'Additional verification required for this operation'
      }, 
      { status: 403, headers: corsHeaders(request) }
    );
  }
  
  // Redirect to step-up authentication challenge
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;
  const sanitizedRedirect = validateRedirectUrl(fullPath);
  const challengeUrl = `/auth/step-up?returnTo=${encodeURIComponent(sanitizedRedirect)}&method=${stepUpMethod || 'password'}`;
  
  return NextResponse.redirect(new URL(challengeUrl, request.url), 302);
}

/**
 * Handle insufficient permissions
 */
function handleInsufficientPermissions(request: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to access this resource'
      }, 
      { status: 403, headers: corsHeaders(request) }
    );
  }
  
  // Redirect to unauthorized page
  return NextResponse.redirect(new URL('/unauthorized', request.url), 302);
}

/**
 * Handle rate limit exceeded
 */
function handleRateLimitExceeded(request: NextRequest, isApi: boolean, response: Response): NextResponse {
  const retryAfter = response.headers.get('Retry-After') || '60';
  
  if (isApi) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retry_after: parseInt(retryAfter)
      }, 
      { 
        status: 429, 
        headers: {
          ...corsHeaders(request),
          'Retry-After': retryAfter
        }
      }
    );
  }
  
  // Redirect to rate limit page
  return NextResponse.redirect(new URL(`/rate-limited?retry=${retryAfter}`, request.url), 302);
}

/**
 * Check if path is allowed for anonymous users
 */
function _isAnonymousAllowedPath(_pathname: string): boolean {
  // Allow public pages for anonymous users
  // This helper is intentionally unused in middleware runtime but kept for future extension
  return false;
}
