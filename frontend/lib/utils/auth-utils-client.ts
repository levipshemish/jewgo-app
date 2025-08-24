/**
 * Client-side authentication utilities that don't import Supabase client
 * This prevents Edge Runtime compatibility issues during prerendering
 */

// User type definition - moved here to avoid circular dependencies
interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    username?: string;
    avatar_url?: string;
    picture?: string;
  };
  app_metadata?: {
    provider?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface TransformedUser {
  id: string;
  email: string | undefined;
  name: string | null;
  username?: string;
  provider: 'apple' | 'google' | 'unknown';
  avatar_url: string | null;
  providerInfo: {
    name: string;
    icon: string;
    color: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Check if user is anonymous based on app_metadata
 */
export function extractIsAnonymous(u?: any): boolean {
  if (!u?.app_metadata) return false;
  return u.app_metadata.provider === 'anonymous';
}

/**
 * Check if Supabase is configured (client-side only)
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Transform Supabase user to our internal format
 */
export function transformSupabaseUser(user: User | null): TransformedUser | null {
  if (!user) return null;

  const provider = user.app_metadata?.provider as 'apple' | 'google' | 'unknown' || 'unknown';
  
  const providerInfo = {
    apple: { name: 'Apple', icon: '🍎', color: 'text-black' },
    google: { name: 'Google', icon: '🔍', color: 'text-blue-600' },
    unknown: { name: 'Email', icon: '📧', color: 'text-gray-600' }
  }[provider];

  return {
    id: user.id,
    email: user.email || undefined,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    username: user.user_metadata?.username,
    provider,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    providerInfo,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Handle user load errors (client-side only)
 */
export function handleUserLoadError(error: any, router?: any): void {
  console.error('User load error:', error);
  
  // If router is provided, redirect to signin
  if (router && typeof router.push === 'function') {
    router.push('/auth/signin');
  }
}

/**
 * Create a mock user for development
 */
export function createMockUser(): TransformedUser {
  return {
    id: 'mock-user-id',
    email: 'mock@example.com',
    name: 'Mock User',
    username: 'mockuser',
    provider: 'unknown',
    avatar_url: null,
    providerInfo: {
      name: 'Email',
      icon: '📧',
      color: 'text-gray-600'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
