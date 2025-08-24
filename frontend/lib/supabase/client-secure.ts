/**
 * Secure Supabase Client for Client Components
 * Uses httpOnly cookies instead of localStorage
 * This prevents XSS attacks from stealing auth tokens
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return [];
          
          return document.cookie
            .split('; ')
            .filter(Boolean)
            .map((cookie) => {
              const [name, value] = cookie.split('=');
              return { name, value };
            });
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieString = `${name}=${value}`;
            
            if (options?.maxAge) {
              cookieString += `; max-age=${options.maxAge}`;
            }
            if (options?.path) {
              cookieString += `; path=${options.path}`;
            }
            if (options?.domain) {
              cookieString += `; domain=${options.domain}`;
            }
            if (options?.sameSite) {
              cookieString += `; samesite=${options.sameSite}`;
            }
            if (options?.secure) {
              cookieString += '; secure';
            }
            
            document.cookie = cookieString;
          });
        },
      },
    }
  );
}

// Export a singleton instance for client components
export const supabaseClient = createClientSupabaseClient();
