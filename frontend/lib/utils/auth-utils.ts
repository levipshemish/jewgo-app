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
 * Updated to use centralized utility
 */
export function isSupabaseConfigured(): boolean {
  // Import the centralized utility to avoid duplication
  const { isSupabaseConfigured: checkConfig } = require('./supabase-utils');
  return checkConfig();
}

/**
 * Transform Supabase user data with provider detection and Apple OAuth support
 */
export function transformSupabaseUser(user: User | null): TransformedUser | null {
  if (!user) {return null;}

  const provider = user.app_metadata?.provider ?? 'unknown';
  
  // Handle known providers with proper typing
  const providerInfo = (() => {
    switch (provider) {
      case 'apple': {
        return {
          name: 'Apple',
          icon: '🍎',
          color: '#000000'
        };
      }
      case 'google': {
        return {
          name: 'Google',
          icon: '🔍',
          color: '#4285F4'
        };
      }
      default: {
        // Unknown provider - use generic fallback
        return {
          name: 'Account',
          icon: '👤',
          color: '#6B7280'
        };
      }
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
         (user.email === undefined || typeof user.email === 'string') &&
         typeof user.provider === 'string';
}

/**
 * Validate redirect URL with corrected security logic
 * Treats "/" as exact root only, allows prefixes for specific paths
 */
export function validateRedirectUrl(url: string | null | undefined): string {
  if (!url) {
    return '/';
  }
  
  try {
    // Early guard: short-circuit non-relative inputs by checking startsWith('/') early
    if (!url.startsWith('/')) {
      return '/';
    }
    
    // Reject protocol-relative URLs, fragments, and dangerous patterns
    if (url.includes('://') || url.includes('//') || url.includes('..') || url.includes('#')) {
      return '/';
    }

    // Check for encoded attacks in the original URL
    const decodedUrl = decodeURIComponent(url);
    if (decodedUrl.includes('://') || decodedUrl.includes('//') || decodedUrl.includes('#')) {
      return '/';
    }

    // Enforce max length
    if (url.length > 2048) {
      return '/';
    }

    // Use the already decoded URL for parsing
    const urlObj = new URL(decodedUrl, 'http://localhost');
    const decodedPath = urlObj.pathname;
    
    // Check for encoded attacks in the pathname
    if (decodedPath.includes('://') || decodedPath.includes('//') || decodedPath.includes('#')) {
      return '/';
    }
    
    // Treat "/" as exact root only
    if (decodedPath === '/') {
      return '/';
    }
    
    // Allow prefixes only for specific paths
    const allowedPrefixes = ['/app', '/dashboard', '/profile', '/settings'];
    const hasAllowedPrefix = allowedPrefixes.some(prefix => 
      decodedPath.startsWith(`${prefix  }/`) || decodedPath === prefix
    );
    
    if (!hasAllowedPrefix) {
      return '/';
    }

    // Filter query parameters to safe ones only
    const safeParams = new URLSearchParams();
    const allowedParamPrefixes = ['utm_'];
    const allowedExactParams = ['tab', 'ref'];
    
    // Use Array.from to avoid iteration issues
    Array.from(urlObj.searchParams.entries()).forEach(([key, value]) => {
      if (allowedExactParams.includes(key) || 
          allowedParamPrefixes.some(prefix => key.startsWith(prefix))) {
        safeParams.set(key, value);
      }
    });

    // Reconstruct safe URL without fragments
    const safeUrl = decodedPath + (safeParams.toString() ? `?${safeParams.toString()}` : '');
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
 * Handles both error codes and error messages with robust fallback
 */
export function mapAppleOAuthError(error: string): string {
  // Normalize error string for case-insensitive matching
  const normalizedError = error.toLowerCase().trim();
  
  // Map by exact error codes first (most reliable)
  switch (normalizedError) {
    case 'user_cancelled':
    case 'user_canceled':
      return 'You cancelled Sign in with Apple';
    case 'invalid_grant':
      return 'Session expired—try again';
    case 'access_denied':
      return 'Access denied';
    case 'configuration_error':
      return 'Service temporarily unavailable';
    case 'network_error':
      return 'Connection failed';
    case 'server_error':
      return 'Service temporarily unavailable';
    case 'temporarily_unavailable':
      return 'Service temporarily unavailable';
    case 'invalid_request':
      return 'Invalid request—try again';
    case 'unsupported_response_type':
      return 'Service configuration error';
    case 'invalid_scope':
      return 'Service configuration error';
    case 'invalid_client':
      return 'Service configuration error';
    case 'unauthorized_client':
      return 'Service configuration error';
    case 'redirect_uri_mismatch':
      return 'Service configuration error';
    case 'invalid_state':
      return 'Session expired—try again';
    default:
      // Fallback to substring matching for error messages
      if (normalizedError.includes('cancelled') || normalizedError.includes('canceled')) {
        return 'You cancelled Sign in with Apple';
      }
      if (normalizedError.includes('expired') || normalizedError.includes('invalid_grant')) {
        return 'Session expired—try again';
      }
      if (normalizedError.includes('denied') || normalizedError.includes('access_denied')) {
        return 'Access denied';
      }
      if (normalizedError.includes('configuration') || normalizedError.includes('config')) {
        return 'Service temporarily unavailable';
      }
      if (normalizedError.includes('network') || normalizedError.includes('connection')) {
        return 'Connection failed';
      }
      if (normalizedError.includes('server') || normalizedError.includes('service')) {
        return 'Service temporarily unavailable';
      }
      if (normalizedError.includes('invalid') || normalizedError.includes('error')) {
        return 'Sign in failed. Please try again.';
      }
      // Generic fallback for unknown errors
      return 'Sign in failed. Please try again.';
  }
}
