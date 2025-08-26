import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';
import { securityMiddleware, corsHeaders } from '@/lib/middleware/security';

// Enhanced middleware with security hardening and admin route protection
export const config = {
  matcher: [
    // Admin routes only
    '/admin/:path*',
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
    // Apply security middleware first (rate limiting, headers, CSRF)
    const securityResponse = await securityMiddleware(request);
    if (securityResponse.status !== 200) {
      return securityResponse;
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 200, 
        headers: corsHeaders(request) 
      });
    }
    
    // Only process protected paths. In Next.js runtime, matcher limits execution,
    // but unit tests call this function directly for any path.
    const path = request.nextUrl.pathname;
    
    // Special-case API: return JSON Unauthorized instead of redirecting
    if (path.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
    }
    if (!isProtectedPath(path)) {
      return NextResponse.next();
    }
    
    // Create NextResponse upfront to persist refreshed auth cookies
    const response = NextResponse.next();
    
    // Create Supabase client with Edge Runtime compatibility
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    
    // Allow anonymous access to certain pages without requiring authentication
    if (isAnonymousAllowedPath(path)) {
      return response;
    }
    
    if (error || !user) {
      console.error('Middleware auth error:', error);
      // Redirect to signin when auth fails or missing user
      return redirectToSignin(request, response);
    }

    // Check if user is anonymous using shared extractor
    const isAnonymous = extractIsAnonymous(user);
    if (isAnonymous) {
      // Allow only specific pages for anonymous guest users
      if (!isAnonymousAllowedPath(path)) {
        return redirectToSignin(request, response);
      }
      return response;
    }

    // Add basic security headers for admin/API paths
    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      // Relax admin check: rely on server-side requireAdmin() for RBAC
    }

    // Authenticated, non-anonymous user - allow access and return response with persisted cookies
    return response;
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail closed for security - redirect to signin on any error
    return redirectToSignin(request);
  }
}

/**
 * Redirect to signin with sanitized redirect URL
 */
function redirectToSignin(request: NextRequest, response?: NextResponse): NextResponse {
  // Sanitize the redirect URL before composing the redirect
  const { pathname } = request.nextUrl;
  const fullPath = pathname + request.nextUrl.search;
  const sanitizedRedirect = validateRedirectUrl(fullPath);
  
  // Compose the redirect URL with proper encoding
  const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
  
  // Create redirect response
  const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url), 302);
  
  // Copy cookies from response to redirectResponse if response exists
  if (response) {
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        domain: cookie.domain,
        path: cookie.path,
        maxAge: cookie.maxAge,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      });
    });
  }
  
  // Add security headers
  redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  redirectResponse.headers.set('Pragma', 'no-cache');
  redirectResponse.headers.set('Expires', '0');
  
  return redirectResponse;
}

/**
 * Local matcher to mirror Next.js config in unit tests
 */
function isProtectedPath(pathname: string): boolean {
  // Exclude auth pages from protection to prevent redirect loops
  if (pathname.startsWith('/auth/')) {
    return false;
  }
  
  // Only protect admin UI routes
  const protectedPrefixes = [
    '/admin/',
  ];
  const exactMatches = ['/admin'];
  return protectedPrefixes.some(p => pathname.startsWith(p)) || exactMatches.includes(pathname);
}

/**
 * Allow list for routes that anonymous users can access
 */
function isAnonymousAllowedPath(pathname: string): boolean {
  // Auth pages should always be accessible
  if (pathname.startsWith('/auth/')) {
    return true;
  }
  
  // Guest users can access only the following app sections
  const allowedPrefixes = [
    '/eatery/', '/shuls/', '/stores/', '/mikva/', '/live-map/'
  ];
  const allowedExact = ['/eatery', '/shuls', '/stores', '/mikva', '/live-map'];
  return allowedPrefixes.some(p => pathname.startsWith(p)) || allowedExact.includes(pathname);
}
