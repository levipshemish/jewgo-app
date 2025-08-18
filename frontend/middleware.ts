import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PATHS = ["/profile", "/favorites", "/reviews"];
const ADMIN_PATHS = ["/admin"];

export async function middleware(req: NextRequest) {
  // Prepare a mutable response so we can set cookies if Supabase rotates them
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  const requiresAuth =
    PROTECTED_PATHS.some((p) => path === p || path.startsWith(p + "/")) ||
    ADMIN_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (requiresAuth && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // TODO: admin check (optional quick gate)
  if (ADMIN_PATHS.some((p) => path.startsWith(p)) && user) {
    // implement a real check (Neon lookup) if needed
    // if (!isAdmin) return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/profile",
    "/profile/:path*",
    "/favorites",
    "/favorites/:path*",
    "/reviews",
    "/reviews/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
