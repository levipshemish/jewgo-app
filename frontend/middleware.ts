import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';

// Comprehensive route protection - protect all routes except public ones
export const config = {
  matcher: [
    // Exclude public routes and static assets
    '/((?!auth|api/auth|_next|favicon|icon|manifest|robots|sitemap|healthz|test-|$).*)',
  ]
};

/**
 * Comprehensive middleware with route protection and redirect sanitization
 * Handles authentication checks for all protected routes with security safeguards
 * Redirects unauthenticated users to sign-in page
 */
export async function middleware(request: NextRequest) {
  try {
    // Skip authentication for the root path (/) as it's a sign-in page
    if (request.nextUrl.pathname === '/') {
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
    // Fail open for security - allow request to proceed
    return NextResponse.next();
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
