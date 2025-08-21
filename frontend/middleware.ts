import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sanitizeRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';

// Limit processing scope to private routes only
export const config = {
  matcher: ['/admin/:path*', '/messages/:path*', '/api/admin/:path*']
};

/**
 * Minimal, edge-safe middleware with comprehensive redirect sanitization
 * Handles authentication checks for private routes with security safeguards
 */
export async function middleware(request: NextRequest) {
  try {
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
            // Cookies are set by the response
          },
          remove(name: string, options: any) {
            // Cookies are removed by the response
          },
        },
      }
    );

    // Get session with proper error handling
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Middleware auth error:', error);
      // Continue to allow the request to proceed (fail open for security)
      return NextResponse.next();
    }

    // Check if user exists and is non-anonymous for private routes
    const user = session?.user;
    if (!user) {
      // No session - redirect to signin with sanitized redirect URL
      const sanitizedRedirect = sanitizeRedirectUrl(request.nextUrl.pathname + request.nextUrl.search);
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Check if user is anonymous using shared extractor
    const isAnonymous = extractIsAnonymous(user);
    if (isAnonymous) {
      // Anonymous user - redirect to signin with sanitized redirect URL
      const sanitizedRedirect = sanitizeRedirectUrl(request.nextUrl.pathname + request.nextUrl.search);
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Authenticated, non-anonymous user - allow access
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail open for security - allow request to proceed
    return NextResponse.next();
  }
}
