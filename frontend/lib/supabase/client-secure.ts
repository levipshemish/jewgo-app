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
          if (typeof document === 'undefined') {
            return [];
          }
          
          return document.cookie
            .split('; ')
            .filter(Boolean)
            .map((cookie) => {
              const [name, value] = cookie.split('=');
              return { name, value };
            });
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') {
            return;
          }
          
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

// Singleton pattern to prevent multiple instances
let supabaseClientInstance: ReturnType<typeof createClientSupabaseClient> | null = null;

// Export a singleton instance for client components
export const supabaseClient = (() => {
  // Only create client on the client side
  if (typeof window === 'undefined') {
    // Return a mock client for SSR
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ data: null, error: null }),
        signInWithOtp: async () => ({ data: null, error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: async () => ({ data: null, error: null }) }),
        delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      }),
    } as any;
  }

  // Return existing instance if already created
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  // Create new instance
  supabaseClientInstance = createClientSupabaseClient();
  return supabaseClientInstance;
})();
