import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Define protected routes that require authentication
const PROTECTED_PATHS = [
  "/profile", 
  "/favorites", 
  "/reviews",
  "/account",
  "/add-eatery"
];

// Define admin routes that require admin privileges
const ADMIN_PATHS = ["/admin"];

// Define public auth routes
const AUTH_PATHS = [
  "/auth/signin",
  "/auth/signup", 
  "/auth/supabase-signin",
  "/auth/supabase-signup",
  "/auth/callback",
  "/auth/oauth-success"
];

export async function middleware(req: NextRequest) {
  // Prepare a mutable response so we can set cookies if Supabase rotates them
  const res = NextResponse.next({ request: { headers: req.headers } });

  const path = req.nextUrl.pathname;

  // Skip middleware for static files and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path.includes('.')
  ) {
    return res;
  }

  // Allow access to auth pages
  if (AUTH_PATHS.some(authPath => path.startsWith(authPath))) {
    return res;
  }

  try {
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // If Supabase is not configured, skip authentication checks for now
    if (!supabaseUrl || !supabaseAnonKey || 
        supabaseUrl === 'https://placeholder.supabase.co' || 
        supabaseAnonKey === 'placeholder-key') {
      console.log('[Middleware] Supabase not configured, allowing access');
      return res;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set(name, value, options);
          },
          remove(name: string, options: any) {
            res.cookies.set(name, "", { ...options, maxAge: 0 });
          },
        },
      }
    );

    // Touch session so auth cookies stay fresh on nav
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Debug logging
    console.log(`[Middleware] Path: ${path}, User: ${user?.email || 'none'}, Error: ${error?.message || 'none'}`);
    console.log(`[Middleware] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`[Middleware] Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set'}`);

    // Check if route requires authentication
    const requiresAuth = PROTECTED_PATHS.some((p) => 
      path === p || path.startsWith(`${p  }/`)
    );

    // Check if route requires admin privileges
    const requiresAdmin = ADMIN_PATHS.some((p) => 
      path.startsWith(p)
    );

    // Redirect to sign in if authentication is required but user is not authenticated
    if ((requiresAuth || requiresAdmin) && !user) {
      console.log(`[Middleware] Redirecting ${path} to signin - no user found`);
      const url = req.nextUrl.clone();
      url.pathname = "/auth/signin";
      
      // If they're trying to access /profile, redirect them to /profile/settings after sign-in
      const redirectPath = path === "/profile" ? "/profile/settings" : path;
      url.searchParams.set("redirectTo", redirectPath);
      
      return NextResponse.redirect(url);
    }

    // Check admin privileges for admin routes
    if (requiresAdmin && user) {
      const adminEmails = [
        process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@jewgo.com",
        // Add more admin emails as needed
      ];

      if (!adminEmails.includes(user.email || "")) {
        // Redirect to home page with error message for unauthorized access
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(url);
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // If there's an error checking authentication, redirect to sign in for protected routes
    const requiresAuth = PROTECTED_PATHS.some((p) => 
      path === p || path.startsWith(`${p  }/`)
    );
    
    const requiresAdmin = ADMIN_PATHS.some((p) => 
      path.startsWith(p)
    );

    if (requiresAuth || requiresAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/signin";
      
      // If they're trying to access /profile, redirect them to /profile/settings after sign-in
      const redirectPath = path === "/profile" ? "/profile/settings" : path;
      url.searchParams.set("redirectTo", redirectPath);
      
      return NextResponse.redirect(url);
    }

    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
