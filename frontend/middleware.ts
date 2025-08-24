import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';

// Minimal private route protection - only guard admin and messaging routes
// All other auth is handled by route handlers + RLS policies for better performance
export const config = {
  matcher: [
    // App pages
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
    // API endpoints commonly accessed by authenticated users
    '/api/admin/:path*',
    '/api/restaurants/:path*',
    '/api/reviews/:path*',
    '/api/feedback/:path*'
  ]
};

/**
 * Minimal middleware with redirect sanitization for private routes only
 * Handles authentication checks for admin and messaging routes with security safeguards
 * Redirects unauthenticated users to sign-in page
 * 
 * Note: Only these specific routes are guarded in middleware to avoid performance impact
 * on public routes. All other authentication is handled by individual route handlers
 * and Row Level Security (RLS) policies for better scalability.
 */
export async function middleware(request: NextRequest) {
  try {
    // Skip middleware in development for easier testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
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

    // Get session with proper error handling
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Middleware auth error:', error);
      // Redirect to signin when auth fails
      return redirectToSignin(request, response);
    }

    // Check if user exists and is non-anonymous for protected routes
    const user = session?.user;
    if (!user) {
      // No session - redirect to signin with sanitized redirect URL
      return redirectToSignin(request, response);
    }

    // Check if user is anonymous using shared extractor
    const isAnonymous = extractIsAnonymous(user);
    if (isAnonymous) {
      // Anonymous user - redirect to signin with sanitized redirect URL
      return redirectToSignin(request, response);
    }

    // Authenticated, non-anonymous user - allow access and return response with persisted cookies
    return response;
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail closed for security - redirect to signin on unexpected errors
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
