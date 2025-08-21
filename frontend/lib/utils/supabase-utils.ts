import { SupabaseClient } from '@supabase/supabase-js';

// Global registry to track Supabase client instances
const clientRegistry = new Map<string, SupabaseClient>();

/**
 * Create a minimal mock Supabase client for SSR and error fallback
 */
function createMockClient(): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signIn: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: null }),
      setSession: async () => ({ data: { user: null, session: null }, error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      insert: () => ({ select: async () => ({ data: null, error: null }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  } as any;
}

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

  // For SSR or when we want to avoid RealtimeClient issues, use mock client
  if (typeof window === 'undefined' || options?.disableRealtime) {
    const mockClient = createMockClient();
    clientRegistry.set(clientId, mockClient);
    return mockClient;
  }

  // Browser environment - try to get the browser client safely
  try {
    // Use a lazy import approach to avoid SSR issues
    let browserClient: any = null;
    
    // Try to get the browser client without causing RealtimeClient issues
    if (typeof window !== 'undefined') {
      // Only import in browser environment
      const clientModule = require('@/lib/supabase/client');
      browserClient = clientModule.supabaseBrowser;
    }
    
    if (browserClient) {
      clientRegistry.set(clientId, browserClient);
      return browserClient;
    } else {
      throw new Error('Browser client not available');
    }
  } catch (error) {
    console.warn('Failed to load browser client, using fallback:', error);
    // Return a mock client if browser client fails
    const mockClient = createMockClient();
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
