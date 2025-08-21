import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';

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
      const sanitizedRedirect = validateRedirectUrl(request.nextUrl.pathname + request.nextUrl.search);
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Check if user is anonymous using shared extractor
    const isAnonymous = extractIsAnonymous(user);
    if (isAnonymous) {
      // Anonymous user - redirect to signin with sanitized redirect URL
      const sanitizedRedirect = validateRedirectUrl(request.nextUrl.pathname + request.nextUrl.search);
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(sanitizedRedirect)}`;
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Authenticated, non-anonymous user - allow access and return response with persisted cookies
    return response;
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail open for security - allow request to proceed
    return NextResponse.next();
  }
}
