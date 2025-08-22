/**
 * Client-side configuration
 * These values are accessible at runtime in the browser
 */

// Use a function to ensure the value is read at runtime, not build time
export function getClientConfig() {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    // Server-side: use process.env directly
    return {
      appleOAuthEnabled: process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    };
  }
  
  // Client-side: use window.__ENV__ if available (for runtime injection)
  // or fall back to Next.js public runtime config
  const env = (window as any).__ENV__ || {};
  
  return {
    appleOAuthEnabled: env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true' || 
                      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true',
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || 
                process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

// Hook for React components
export function useClientConfig() {
  return getClientConfig();
}
