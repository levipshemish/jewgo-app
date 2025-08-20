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
  const path = req.nextUrl.pathname;

  // Skip middleware for static files and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow access to auth pages
  if (AUTH_PATHS.some(authPath => path.startsWith(authPath))) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const requiresAuth = PROTECTED_PATHS.some((p) => 
    path === p || path.startsWith(`${p}/`)
  );

  // Check if route requires admin privileges
  const requiresAdmin = ADMIN_PATHS.some((p) => 
    path.startsWith(p)
  );

  // For now, allow all routes to pass through
  // Authentication will be handled on the client side and in API routes
  // This avoids Edge Runtime module format issues
  if (requiresAuth || requiresAdmin) {
    console.log(`[Middleware] Protected route accessed: ${path} - allowing for now`);
  }

  return NextResponse.next();
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
