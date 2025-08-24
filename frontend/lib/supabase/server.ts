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
              // Respect Supabase cookie names and set safe defaults.
              // Do not rename cookies; only enforce secure defaults.
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
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
