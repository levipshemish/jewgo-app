import { SupabaseClient } from '@supabase/supabase-js';

// Global registry to track Supabase client instances
const clientRegistry = new Map<string, SupabaseClient>();

/**
 * Get or create a Supabase client instance with proper configuration
 * This prevents multiple GoTrueClient instances and RealtimeClient errors
 */
export function getSupabaseClient(
  url?: string,
  key?: string,
  options?: {
    clientType?: 'browser' | 'server' | 'middleware';
    disableRealtime?: boolean;
  }
): SupabaseClient {
  const clientId = `${url || 'default'}-${options?.clientType || 'browser'}`;
  
  // Return existing instance if available
  if (clientRegistry.has(clientId)) {
    return clientRegistry.get(clientId)!;
  }

  // Import the appropriate client based on environment
  if (typeof window !== 'undefined') {
    // Browser environment
    const { supabaseBrowser } = require('@/lib/supabase/client');
    const client = supabaseBrowser;
    clientRegistry.set(clientId, client);
    return client;
  } else {
    // Server environment - create a mock client for SSR
    const mockClient = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: async () => ({ data: null, error: null }) }),
        delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      }),
    } as any;
    
    clientRegistry.set(clientId, mockClient);
    return mockClient;
  }
}

/**
 * Clear all Supabase client instances (useful for testing)
 */
export function clearSupabaseClients(): void {
  clientRegistry.clear();
}

/**
 * Get the number of active Supabase client instances
 */
export function getActiveSupabaseClientsCount(): number {
  return clientRegistry.size;
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}
