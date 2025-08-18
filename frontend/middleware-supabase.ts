import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = ["/account", "/reviews", "/admin"];
const SUPABASE_PATHS = ["/auth/supabase-signin", "/auth/supabase-signup", "/test-supabase"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Handle Supabase-specific paths
  if (SUPABASE_PATHS.some(p => path.startsWith(p))) {
    return handleSupabasePaths(req);
  }
  
  // Handle protected paths (can be either NextAuth or Supabase)
  if (PROTECTED_PATHS.some(p => path.startsWith(p))) {
    return handleProtectedPaths(req);
  }
  
  return NextResponse.next();
}

async function handleSupabasePaths(req: NextRequest) {
  // For Supabase paths, we'll let them through for now
  // In the future, we can add Supabase-specific logic here
  return NextResponse.next();
}

async function handleProtectedPaths(req: NextRequest) {
  // For now, let NextAuth.js handle the protection
  // In the future, we can add logic to check both systems
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/reviews/:path*", 
    "/admin/:path*",
    "/auth/supabase-signin",
    "/auth/supabase-signup",
    "/test-supabase"
  ],
};
