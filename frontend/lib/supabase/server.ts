/**
 * Secure Supabase Server Client with httpOnly Cookies
 * This client should be used in:
 * - Server Components
 * - Route Handlers (API routes)
 * - Server Actions
 * - Middleware
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                // Enhanced secure cookie settings
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.WEBVIEW_MODE === 'true' ? 'none' : 'lax',
                // Prevent XSS attacks
                path: "/",
                // Use __Secure- prefix in production
                ...(process.env.NODE_ENV === "production" && name.startsWith('sb-') ? {
                  name: `__Secure-${name}`
                } : {}),
                // Add domain for production
                ...(process.env.NODE_ENV === "production" ? {
                  domain: '.jewgo.app'
                } : {})
              });
            });
          } catch (error) {
            // Handle the error when called from Server Components
            // This is expected in certain contexts
          }
        },
      },
    }
  );
}

// Legacy export for backward compatibility
export const createSupabaseServerClient = createServerSupabaseClient;