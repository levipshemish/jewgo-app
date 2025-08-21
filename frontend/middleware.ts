import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';

// Comprehensive private route protection
export const config = {
  matcher: [
    // Admin routes
    '/admin/:path*',
    '/api/admin/:path*',
    
    // User-specific routes
    '/profile/:path*',
    '/settings/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    
    // Protected features
    '/favorites/:path*',
    '/marketplace/sell/:path*',
    '/marketplace/messages/:path*',
    
    // Protected API routes
    '/api/auth/prepare-merge',
    '/api/auth/merge-anonymous',
    '/api/auth/upgrade-email',
    '/api/restaurants/:path*',
    '/api/reviews/:path*',
    '/api/marketplace/:path*',
    
    // Exclude public routes and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
};

/**
 * Comprehensive middleware with route protection and redirect sanitization
 * Handles authentication checks for private routes with security safeguards
 * Implements the complete authentication flow from the mermaid sequence diagram
 */
export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for public routes and static assets
    const { pathname } = request.nextUrl;
    
    // Allow public routes to pass through
    if (isPublicRoute(pathname)) {
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

    // Get session with proper error handling
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Middleware auth error:', error);
      // Continue to allow the request to proceed (fail open for security)
      return response;
    }

    // Check if user exists and is non-anonymous for private routes
    const user = session?.user;
    if (!user) {
      // No session - redirect to signin with sanitized redirect URL
      return redirectToSignin(request, pathname, response);
    }

    // Check if user is anonymous using shared extractor
    const isAnonymous = extractIsAnonymous(user);
    if (isAnonymous) {
      // Anonymous user - redirect to signin with sanitized redirect URL
      return redirectToSignin(request, pathname, response);
    }

    // Authenticated, non-anonymous user - allow access and return response with persisted cookies
    return response;
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail open for security - allow request to proceed
    return NextResponse.next();
  }
}

/**
 * Check if a route is public and should bypass authentication
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    // Public pages
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/callback',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/oauth-success',
    '/auth-code-error',
    
    // Public features
    '/eatery',
    '/restaurant',
    '/shuls',
    '/stores',
    '/mikva',
    '/live-map',
    '/marketplace',
    '/marketplace/category',
    '/marketplace/product',
    '/marketplace/search',
    
    // Public API endpoints
    '/api/health',
    '/api/health-check',
    '/api/auth/anonymous',
    '/api/restaurants/search',
    '/api/restaurants/filtered',
    '/api/kosher-types',
    '/api/business-types',
    '/api/analytics',
    '/api/feedback',
    '/api/statistics',
    '/api/connectivity-test',
    
    // Static assets and Next.js internals
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    
    // Development and testing routes
    '/test-auth',
    '/test-profile',
    '/test-redirect',
    '/debug-auth',
    '/debug-routing',
    '/healthz',
  ];
  
  // Check exact matches
  if (publicRoutes.includes(pathname)) {
    return true;
  }
  
  // Check prefix matches for dynamic routes
  const publicPrefixes = [
    '/restaurant/',
    '/eatery/',
    '/marketplace/category/',
    '/marketplace/product/',
    '/api/restaurants/',
    '/api/kosher-types',
    '/api/business-types',
    '/api/analytics',
    '/api/feedback',
    '/api/statistics',
    '/api/connectivity-test',
    '/_next/',
    '/test-',
    '/debug-',
  ];
  
  return publicPrefixes.some(prefix => pathname.startsWith(prefix));
}

/**
 * Redirect to signin with sanitized redirect URL
 */
function redirectToSignin(request: NextRequest, pathname: string, response?: NextResponse): NextResponse {
  // Sanitize the redirect URL before composing the redirect
  const fullPath = pathname + request.nextUrl.search;
  const sanitizedRedirect = validateRedirectUrl(fullPath);
  
  // Compose the redirect URL with proper encoding
  const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
  
  // Create redirect response
  const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url));
  
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
