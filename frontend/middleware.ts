import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';
import { securityMiddleware, corsHeaders } from '@/middleware-security';

// Enhanced middleware with security hardening and private route protection
export const config = {
  matcher: [
    // Apply security middleware to all routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Protected app pages
    '/admin/:path*',
    '/messages/:path*',
    '/eatery/:path*',
    '/restaurant/:path*',
    '/marketplace/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/favorites/:path*',
    '/live-map/:path*',
    '/location-access/:path*',
    '/notifications/:path*',
    '/add-eatery/:path*',
    '/mikva/:path*',
    '/shuls/:path*',
    '/stores/:path*',
    // Protected API endpoints
    '/api/admin/:path*',
    '/api/restaurants/:path*',
    '/api/reviews/:path*',
    '/api/feedback/:path*',
    // Auth endpoints (for rate limiting)
    '/api/auth/:path*',
    '/auth/:path*'
  ]
};

/**
 * Enhanced security middleware with authentication checks
 * Applies security headers, rate limiting, CSRF protection, and auth checks
 * Redirects unauthenticated users to sign-in page for protected routes
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
    if (error || !user) {
      console.error('Middleware auth error:', error);
      // Redirect to signin when auth fails or missing user
      return redirectToSignin(request, response);
    }

    // Check if user is anonymous using shared extractor
    const isAnonymous = extractIsAnonymous(user);
    if (isAnonymous) {
      // TEMPORARY: Allow anonymous users to access all pages
      return response;
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
  const protectedPrefixes = [
    '/admin/', '/messages/', '/eatery/', '/restaurant/', '/marketplace/', '/profile/', '/settings/',
    '/favorites/', '/live-map/', '/location-access/', '/notifications/', '/add-eatery/', '/mikva/', '/shuls/', '/stores/',
    '/api/admin/', '/api/restaurants/', '/api/reviews/', '/api/feedback/'
  ];
  const exactMatches = ['/admin', '/messages', '/eatery', '/marketplace', '/profile', '/settings', '/favorites', '/live-map', '/location-access', '/notifications', '/add-eatery', '/mikva', '/shuls', '/stores', '/api/admin', '/api/restaurants', '/api/reviews', '/api/feedback'];
  return protectedPrefixes.some(p => pathname.startsWith(p)) || exactMatches.includes(pathname);
}

/**
 * Allow list for routes that anonymous users can access
 */
function isAnonymousAllowedPath(_pathname: string): boolean {
  // Deprecated: anonymous users are allowed everywhere for now
  return true;
}
