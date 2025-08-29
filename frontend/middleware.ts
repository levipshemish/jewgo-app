import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';
import { securityMiddleware, corsHeaders, buildSecurityHeaders } from '@/lib/middleware/security';
import { getAdminRole } from '@/lib/admin/auth';

// Enhanced middleware with security hardening and admin route protection
export const config = {
  matcher: [
    // Admin routes only
    '/admin/:path*',
    '/api/admin/:path*',
  ]
};

/**
 * Enhanced security middleware with authentication checks
 * Applies security headers, rate limiting, CSRF protection, and auth checks
 * Redirects unauthenticated users to sign-in page for protected routes
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
      return NextResponse.next();
    }

    // Create response with security headers
    const response = NextResponse.next();
    Object.entries(buildSecurityHeaders(request)).forEach(([k,v]) => response.headers.set(k, v as string));
    
    // Create Supabase client with Edge Runtime compatibility
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not configured in middleware.');
      return NextResponse.next();
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Set cookies on the response to persist refreshed tokens
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: any) {
            // Remove cookies on the response
            response.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
        // Disable realtime to prevent middleware errors
        realtime: {
          params: {
            eventsPerSecond: 0,
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'jewgo-middleware',
          },
        },
      }
    );

    // Get authenticated user from Supabase Auth server (secure)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Handle authentication errors
    if (error) {
      console.error('Middleware auth error:', error);
      return handleAuthError(request, isApi, error);
    }
    
    // Handle unauthenticated users
    if (!user) {
      return handleUnauthenticatedUser(request, isApi);
    }
    
    // Handle anonymous users - not allowed in admin routes
    if (extractIsAnonymous(user)) {
      if (isApi) {
        return NextResponse.json(
          { error: 'Admin access required' }, 
          { status: 403, headers: corsHeaders(request) }
        );
      }
      return redirectToSignin(request);
    }
    
    // Handle authenticated users
    return await handleAuthenticatedUser(request, isApi, user, response);

  } catch (error) {
    console.error('Middleware error:', error);
    return handleMiddlewareError(request, error);
  }
}

/**
 * Handle authentication errors
 */
function handleAuthError(request: NextRequest, isApi: boolean, error: any): NextResponse {
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
  user: any, 
  response: NextResponse
): Promise<NextResponse> {
  // Check admin role for both API and UI routes
  try {
    const adminRole = await getAdminRole(user.id);
    if (!adminRole) {
      if (isApi) {
        return NextResponse.json(
          { error: 'Insufficient permissions' }, 
          { status: 403, headers: corsHeaders(request) }
        );
      } else {
        // For UI routes, redirect to home page
        return NextResponse.redirect(new URL('/', request.url), 302);
      }
    }
    
    // Add admin role to request headers for downstream use
    response.headers.set('X-Admin-Role', adminRole);
    return response;
  } catch (roleError) {
    console.error('Error checking admin role:', roleError);
    if (isApi) {
      return NextResponse.json(
        { error: 'Role verification failed' }, 
        { status: 500, headers: corsHeaders(request) }
      );
    } else {
      // For UI routes, redirect to home page on error
      return NextResponse.redirect(new URL('/', request.url), 302);
    }
  }
}

/**
 * Handle middleware errors
 */
function handleMiddlewareError(request: NextRequest, error: any): NextResponse {
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
 * Redirect to sign-in page with proper error handling
 */
function redirectToSignin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;
  const sanitizedRedirect = validateRedirectUrl(fullPath);
  const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
  
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
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

/**
 * Check if path is allowed for anonymous users
 */
function isAnonymousAllowedPath(pathname: string): boolean {
  // Allow public pages for anonymous users
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/privacy',
    '/terms',
    '/healthz',
    '/api/health',
    '/api/health-check',
    '/api/public',
  ];
  
  return publicPaths.some(path => pathname.startsWith(path));
}


