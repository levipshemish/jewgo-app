/**
 * Supabase utility functions for safe client initialization
 * This prevents multiple GoTrueClient instances and RealtimeClient errors
 */

import { createClient } from '@supabase/supabase-js';

// Global flag to track if we're in a Docker environment
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1';
const isRealtimeEnabled = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_ENABLED !== 'false';

// Singleton client instance
let supabaseClient: any = null;

/**
 * Create a safe Supabase client that works in all environments
 * This prevents multiple GoTrueClient instances and RealtimeClient errors
 */
export function createSafeSupabaseClient() {
  // Return existing instance if already created
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    // console.warn('Supabase environment variables not configured. Using mock client.');
    return createMockClient();
  }

  // For SSR or when we want to avoid RealtimeClient issues, use mock client
  if (typeof window === 'undefined') {
    return createMockClient();
  }

  // Try to get the browser client without causing RealtimeClient issues
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      // Completely disable realtime in Docker or when explicitly disabled
      realtime: {
        params: {
          eventsPerSecond: (isDocker || !isRealtimeEnabled) ? 0 : 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'jewgo-safe-client',
        },
      },
    });
  } catch (error) {
    // console.error('Failed to create Supabase client:', error);
    return createMockClient();
  }

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
  return createSafeSupabaseClient();
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetSupabaseClient() {
  supabaseClient = null;
}
