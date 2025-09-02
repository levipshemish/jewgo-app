import ipaddr from 'ipaddr.js';
import { type TransformedUser, type AuthProvider } from '@/lib/types/supabase-auth';

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

// Runtime check to prevent Supabase client import in Edge Runtime
let supabaseClient: any = null;
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  // Only import Supabase client in Node.js runtime
  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient;
}

// Re-export client-safe functions and types from auth-utils-client
export { 
  getUserWithRoles,
  transformSupabaseUserWithRoles,
  isAdminUser,
  hasUserPermission,
  hasMinimumRoleLevel,
  generateCorrelationId,
  scrubPII,
  extractIsAnonymous,
  handleAuthError,
  handleUserLoadError,
  createMockUser,
  isValidUser,
  extractJtiFromToken,
  verifyTokenRotation,
  isSupabaseConfigured
} from './auth-utils-client';

/**
 * @deprecated Client alias for backward compatibility. Use primary transformSupabaseUser instead. Removal planned for Q2 2025.
 */
export { transformSupabaseUserLegacy as transformSupabaseUserClient } from './auth-utils-client';

// Re-export types from centralized location
export type { TransformedUser, AuthProvider } from '@/lib/types/supabase-auth';

/**
 * Server-side transform function - delegates to client-safe version
 * Use transformSupabaseUserWithRoles for new implementations with role support
 */
export async function transformSupabaseUser(
  user: User | null, 
  options: { includeRoles?: boolean; userToken?: string } = {}
): Promise<TransformedUser | null> {
  // If running on the server, use server-aware role fetcher to avoid relative URL issues
  if (typeof window === 'undefined') {
    const { transformSupabaseUserWithRoles } = await import('./auth-utils-client');
    const { getUserWithRolesServer } = await import('./auth-utils.server');
    // Monkey-patch only the role fetch for server path by calling server fetcher directly
    if (!user) return null;
    const base = await transformSupabaseUserWithRoles(user, { includeRoles: false });
    if (!base) return null;
    if (options.includeRoles && options.userToken) {
      try {
        const rd = await getUserWithRolesServer(options.userToken);
        if (rd) {
          return {
            ...base,
            adminRole: rd.adminRole,
            roleLevel: rd.roleLevel,
            permissions: rd.permissions,
            isSuperAdmin: rd.adminRole === 'super_admin'
          };
        }
      } catch {
        // fall through to base without roles
      }
    }
    return base as TransformedUser;
  }
  // Client path delegates to client-safe implementation
  const { transformSupabaseUserWithRoles } = await import('./auth-utils-client');
  return transformSupabaseUserWithRoles(user, options);
}



// Note: Server-only HMAC constants moved to auth-utils.server.ts to prevent client bundle inclusion

/**
 * DEPRECATED: Use validateRedirectUrl instead
 * This function was removed due to security concerns - it was too permissive
 * and could allow accidental misuse. All call sites should use validateRedirectUrl
 * which has stricter validation and better security.
 * 
 * WARNING: Do not introduce alternative sanitizers. Use validateRedirectUrl only.
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string {
  // DEPRECATED: sanitizeRedirectUrl is deprecated. Use validateRedirectUrl instead. Removal target: 2026-01-31
  return validateRedirectUrl(url);
}

// Import trusted CDN IPs from centralized configuration
import { TRUSTED_CDN_IPS } from '@/lib/config/environment';

/**
 * Validate trusted IP with left-most X-Forwarded-For parsing
 * Only parses X-Forwarded-For when request IP is in trusted allowlist
 */
export function validateTrustedIP(requestIP: string, forwardedFor?: string): string {
  try {
    // Check if request IP is in trusted allowlist
    const isTrustedIP = TRUSTED_CDN_IPS.some(range => {
      return isIPInRange(requestIP, range);
    });
    
    if (!isTrustedIP) {
      // Not a trusted IP - use request IP directly
      return requestIP;
    }
    
    // Only parse X-Forwarded-For if request IP is trusted
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      // Use left-most (first) IP
      const realIP = ips[0];
      if (realIP && isValidIP(realIP)) {
        return realIP;
      }
    }
    
    // Fallback to request IP
    return requestIP;
  } catch {
    return requestIP;
  }
}

/**
 * Check if IP is in CIDR range (IPv4 and IPv6 support)
 */
function isIPInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits = '32'] = cidr.split('/');
    
    // Handle IPv6
    if (range.includes(':')) {
      return isIPv6InRange(ip, cidr);
    }
    
    // Handle IPv4
    const mask = ~((1 << (32 - parseInt(bits))) - 1);
    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);
    return (ipLong & mask) === (rangeLong & mask);
  } catch {
    return false;
  }
}

/**
 * Check if IPv6 is in CIDR range using ipaddr.js library
 */
function isIPv6InRange(ip: string, cidr: string): boolean {
  try {
    const ipAddr = ipaddr.parse(ip);
    const cidrRange = ipaddr.parseCIDR(cidr);
    return ipAddr.match(cidrRange);
  } catch {
    return false;
  }
}

/**
 * Convert IP to long integer (IPv4 only)
 */
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Validate IP address format (IPv4 and IPv6)
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified - allows compressed notation)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:){0,7}::(?:[0-9a-fA-F]{1,4}:){0,7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Comprehensive CSRF validation with strict Origin+Referer checks and signed token fallback
 * Accepts valid signed CSRF token when Origin/Referer are missing
 * Client-side implementation - throws on server use
 */
export function validateCSRF(
  origin: string | null,
  referer: string | null,
  allowedOrigins: string[],
  csrfToken?: string | null
): boolean {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side - throw error to force use of server variant
    throw new Error('validateCSRF should not be called on server side. Use validateCSRFServer from auth-utils.server.ts instead.');
  }
  
  // If both Origin and Referer are missing, require a valid signed CSRF token
  if (!origin && !referer) {
    if (!csrfToken) {
      return false;
    }
    
    // Verify signed CSRF token using HMAC
    return verifySignedCSRFToken(csrfToken);
  }
  
  // If either Origin or Referer is present, require both to be valid
  if (!origin || !referer) {
    return false;
  }
  
  // Check Origin against allowlist
  const originValid = allowedOrigins.some(allowed => {
    return origin === allowed || origin.endsWith(allowed);
  });
  
  if (!originValid) {
    return false;
  }
  
  // Check Referer against allowlist
  const refererValid = allowedOrigins.some(allowed => {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.origin === allowed || refererUrl.origin.endsWith(allowed);
    } catch {
      return false;
    }
  });
  
  return refererValid;
}

/**
 * Verify signed CSRF token using HMAC
 * Client-side implementation - throws on server use or delegates to server variant
 */
function verifySignedCSRFToken(token: string): boolean {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side - throw error to force use of server variant
    throw new Error('verifySignedCSRFToken should not be called on server side. Use verifySignedCSRFTokenServer from auth-utils.server.ts instead.');
  }
  
  try {
    // Client-side implementation - basic format validation only
    // Full HMAC verification should be done server-side
    const parts = token.split(':');
    if (parts.length < 3) {
      return false;
    }

    const version = parts[0];
    if (version !== 'v1' && version !== 'v2') {
      return false;
    }

    // For client-side, we only validate format, not signature
    // Actual signature verification should be done server-side
    return true;
  } catch (error) {
    // CSRF token verification failed
    return false;
  }
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
    
    // Check for encoded attacks in the original URL
    const decodedUrl = decodeURIComponent(url);
    
    // Enforce max length
    if (url.length > 2048) {
      return '/';
    }

    // Block fragments in the original URL (before decoding) - both literal and encoded
    if (url.includes('#') || url.includes('%23')) {
      return '/';
    }

    // Use the decoded URL for parsing
    const urlObj = new URL(decodedUrl, 'http://localhost');
    const decodedPath = urlObj.pathname;
    
    // Reject protocol-relative URLs, fragments, and dangerous patterns in pathname only
    // Block protocol-relative paths (starting with //) to prevent external redirects
    if (decodedPath.includes('://') || decodedPath.startsWith('//') || decodedPath.includes('..') || decodedPath.includes('#')) {
      return '/';
    }
    
    // Check for // in query parameters to prevent external redirects
    const searchParams = urlObj.searchParams;
    const hasDangerousQueryParam = Array.from(searchParams.entries()).some(([key, value]) => {
      return value.includes('//');
    });
    
    if (hasDangerousQueryParam) {
      return '/';
    }
    
    // Treat "/" as exact root only
    if (decodedPath === '/') {
      return '/';
    }
    
    // Allow prefixes only for specific paths
    // These paths are allowed for redirect sanitization to maintain UX consistency
    // with the application's navigation structure and user expectations
    const allowedPrefixes = [
      '/app',           // Main application routes
      '/admin',         // Admin panel routes
      '/dashboard',     // Admin and user dashboard
      '/profile',       // User profile management
      '/settings',      // User settings
      '/favorites',     // User favorites (added for UX consistency)
      '/marketplace',   // Marketplace features
      '/live-map',      // Live map functionality
      '/mikva',         // Mikva-related features
      '/notifications', // Notification center
      '/add-eatery',    // Add eatery functionality
      '/restaurant',    // Restaurant pages
      '/eatery',        // Eatery pages
      '/shuls',         // Shuls pages
      '/account',       // Account management
      '/stores',        // Stores pages
      '/location-access', // Location access pages
      '/u'              // User-specific routes
    ];
    const hasAllowedPrefix = allowedPrefixes.some(prefix => 
      decodedPath.startsWith(`${prefix}/`) || decodedPath === prefix
    );
    
    if (!hasAllowedPrefix) {
      return '/';
    }

    // Filter query parameters to safe ones only
    const safeParams = new URLSearchParams();
    const allowedParamPrefixes = ['utm_'];
    const allowedExactParams = ['tab', 'ref'];
    
    // Use Array.from to avoid iteration issues
    Array.from(urlObj.searchParams.entries()).forEach(([paramKey, value]) => {
      if (allowedExactParams.includes(paramKey) || 
          allowedParamPrefixes.some(prefix => paramKey.startsWith(prefix))) {
        safeParams.set(paramKey, value);
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
        return 'Sign in failed. Please try again.';
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

/**
 * Feature support guard for client-side usage
 * Checks for presence of required Supabase features via lightweight test client
 */
export function validateSupabaseFeatureSupport(): boolean {
  try {
    // Check if Supabase environment variables are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Supabase environment variables not configured
      return false;
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      // Invalid Supabase URL format
      return false;
    }

    // Create a lightweight test client to check feature availability
    const testClient = supabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if signInAnonymously method exists
    if (typeof testClient.auth.signInAnonymously !== 'function') {
      // signInAnonymously method not available
      return false;
    }

    // Check if linkIdentity method exists (for merge flow)
    if (typeof testClient.auth.linkIdentity !== 'function') {
      // linkIdentity method not available - merge flow may not work
      // Don't fail for linkIdentity as it's not critical for basic auth
    }

    return true;
    
  } catch (error) {
    // Feature validation failed
    return false;
  }
}
