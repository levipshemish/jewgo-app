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

/**
 * Extract JWT ID (jti) from access token
 * Works in both browser and Node.js environments
 * Converts base64url to base64 before decoding
 */
export function extractJtiFromToken(token: string): string | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) {
      return null;
    }
    
    const payloadSegment = segments[1];
    
    // Convert base64url to base64: replace -→+, _→/, add = padding
    const base64Segment = payloadSegment
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padding = 4 - (base64Segment.length % 4);
    const paddedSegment = padding !== 4 ? base64Segment + '='.repeat(padding) : base64Segment;
    
    let payload: any;
    
    if (typeof window !== 'undefined') {
      // Browser environment - use atob
      payload = JSON.parse(atob(paddedSegment));
    } else {
      // Node.js environment - use Buffer
      payload = JSON.parse(Buffer.from(paddedSegment, 'base64').toString('utf-8'));
    }
    
    return payload.jti || null;
  } catch {
    return null;
  }
}

/**
 * Verify token rotation after account upgrade
 * Checks refresh_token and JWT jti changes between pre/post upgrade states
 * Returns true if either refresh_token OR jti changed (not requiring both)
 */
export function verifyTokenRotation(
  preUpgradeSession: any,
  postUpgradeSession: any
): boolean {
  try {
    // Compute refresh_token change
    const refreshChanged = preUpgradeSession.refresh_token !== postUpgradeSession.refresh_token;
    
    // Compute JWT jti change - defensively check that tokens are strings
    let preJti: string | null = null;
    let postJti: string | null = null;
    
    if (typeof preUpgradeSession.access_token === 'string') {
      preJti = extractJtiFromToken(preUpgradeSession.access_token);
    }
    
    if (typeof postUpgradeSession.access_token === 'string') {
      postJti = extractJtiFromToken(postUpgradeSession.access_token);
    }
    
    const jtiChanged = preJti !== postJti;
    
    // Return true if either refresh_token OR jti changed
    return refreshChanged || jtiChanged;
  } catch (error) {
    console.error('Error verifying token rotation:', error);
    return false;
  }
}
