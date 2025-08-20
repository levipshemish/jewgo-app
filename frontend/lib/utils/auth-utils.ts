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

/**
 * Centralized authentication utilities to eliminate code duplication
 * across the JewGo authentication system.
 */

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
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
}

/**
 * Transform Supabase user data with provider detection and Apple OAuth support
 */
export function transformSupabaseUser(user: User | null): TransformedUser | null {
  if (!user) return null;

  const provider = user.app_metadata?.provider ?? 'unknown';
  
  // Handle known providers with proper typing
  const providerInfo = (() => {
    switch (provider) {
      case 'apple':
        return {
          name: 'Apple',
          icon: '🍎',
          color: '#000000'
        };
      case 'google':
        return {
          name: 'Google',
          icon: '🔍',
          color: '#4285F4'
        };
      default:
        // Unknown provider - use generic fallback
        return {
          name: 'Account',
          icon: '👤',
          color: '#6B7280'
        };
    }
  })();

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    provider: provider as 'apple' | 'google' | 'unknown',
    providerInfo,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * Handle authentication errors consistently
 */
export function handleAuthError(error: any, router?: any): void {
  console.error('Auth error:', error);
  
  if (router && error?.message?.includes('auth')) {
    router.push('/auth/signin');
  }
}

/**
 * Handle user loading errors with appropriate fallbacks
 */
export function handleUserLoadError(error: any, router?: any): void {
  console.error('User load error:', error);
  
  // Only redirect for auth errors, not network errors
  if (router && error?.message?.includes('auth')) {
    router.push('/auth/signin');
  }
}

/**
 * Create mock user for development when Supabase is not configured
 */
export function createMockUser(): TransformedUser {
  return {
    id: 'dev-user-id',
    email: 'dev@example.com',
    name: 'Development User',
    username: 'dev-user',
    provider: 'unknown',
    avatar_url: null,
    providerInfo: {
      name: 'Development',
      icon: '👤',
      color: '#6B7280'
    }
  };
}

/**
 * Validate user object structure
 */
export function isValidUser(user: any): user is TransformedUser {
  return user && 
         typeof user.id === 'string' && 
         typeof user.email === 'string' &&
         typeof user.provider === 'string';
}

/**
 * Validate redirect URL with corrected security logic
 * Treats "/" as exact root only, allows prefixes for specific paths
 */
export function validateRedirectUrl(url: string | null | undefined): string {
  if (!url) return '/';
  
  try {
    // Reject protocol-relative URLs, fragments, and dangerous patterns
    if (url.includes('://') || url.includes('//') || url.includes('..') || url.includes('#')) {
      return '/';
    }

    // Enforce max length
    if (url.length > 2048) {
      return '/';
    }

    const urlObj = new URL(url, 'http://localhost');
    const pathname = urlObj.pathname;
    
    // Treat "/" as exact root only
    if (pathname === '/') {
      return '/';
    }
    
    // Allow prefixes only for specific paths
    const allowedPrefixes = ['/app', '/dashboard', '/profile', '/settings'];
    const hasAllowedPrefix = allowedPrefixes.some(prefix => 
      pathname.startsWith(prefix + '/') || pathname === prefix
    );
    
    if (!hasAllowedPrefix) {
      return '/';
    }

    // Filter query parameters to safe ones only
    const safeParams = new URLSearchParams();
    const allowedParamPrefixes = ['utm_'];
    const allowedExactParams = ['tab'];
    
    // Use Array.from to avoid iteration issues
    Array.from(urlObj.searchParams.entries()).forEach(([key, value]) => {
      if (allowedExactParams.includes(key) || 
          allowedParamPrefixes.some(prefix => key.startsWith(prefix))) {
        safeParams.set(key, value);
      }
    });

    // Reconstruct safe URL without fragments
    const safeUrl = pathname + (safeParams.toString() ? `?${safeParams.toString()}` : '');
    return safeUrl;
    
  } catch {
    return '/';
  }
}

/**
 * Check if email is a private relay email from Apple
 */
export function isPrivateRelayEmail(email: string): boolean {
  return email.endsWith('@privaterelay.appleid.com');
}

/**
 * Map Apple OAuth errors to user-friendly messages
 */
export function mapAppleOAuthError(error: string): string {
  switch (error) {
    case 'user_cancelled':
      return 'You cancelled Sign in with Apple';
    case 'invalid_grant':
      return 'Session expired—try again';
    case 'access_denied':
      return 'Access denied';
    case 'configuration_error':
      return 'Service temporarily unavailable';
    case 'network_error':
      return 'Connection failed';
    default:
      return 'Sign in failed. Please try again.';
  }
}
