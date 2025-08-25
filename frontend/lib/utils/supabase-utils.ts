/**
 * Supabase utility functions for safe client initialization
 * This prevents multiple GoTrueClient instances and RealtimeClient errors
 */

import { supabaseClient } from '@/lib/supabase/client-secure';

// Global flag to track if we're in a Docker environment
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1';
const isRealtimeEnabled = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_ENABLED !== 'false';

/**
 * Create a safe Supabase client that works in all environments
 * This prevents multiple GoTrueClient instances and RealtimeClient errors
 */
export function createSafeSupabaseClient() {
  // Use the singleton client from client-secure
  return supabaseClient;
}

/**
 * Create a mock client for SSR or error fallback
 */
function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {} 
          } 
        } 
      }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: async () => ({ data: null, error: null }) 
        }) 
      }),
      insert: () => ({ 
        select: async () => ({ data: null, error: null }) 
      }),
      delete: () => ({ 
        eq: async () => ({ data: null, error: null }) 
      }),
      update: () => ({ 
        eq: async () => ({ data: null, error: null }) 
      }),
    }),
    // Add other common methods as needed
  };
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Get the current Supabase client instance
 */
export function getSupabaseClient() {
  return supabaseClient;
}
