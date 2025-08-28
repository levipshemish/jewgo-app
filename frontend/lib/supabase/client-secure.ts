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

// Global variable to track if we've already created a client
let supabaseClientInstance: ReturnType<typeof createClientSupabaseClient> | null = null;
let isCreatingClient = false;

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
        getUser: async () => ({ data: { user: null }, error: null }),
        signInAnonymously: async () => ({ data: { user: null }, error: null }),
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

  // Prevent multiple simultaneous client creation
  if (isCreatingClient) {
    // Wait a bit and return the instance once it's created
    return new Promise((resolve) => {
      const checkInstance = () => {
        if (supabaseClientInstance) {
          resolve(supabaseClientInstance);
        } else {
          setTimeout(checkInstance, 10);
        }
      };
      checkInstance();
    }) as any;
  }

  isCreatingClient = true;

  try {
    // Create new instance
    supabaseClientInstance = createClientSupabaseClient();
    return supabaseClientInstance;
  } finally {
    isCreatingClient = false;
  }
})();
