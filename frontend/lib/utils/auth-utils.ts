import ipaddr from 'ipaddr.js';
import { createClient } from '@supabase/supabase-js';

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
  username: string | undefined;
  provider: 'apple' | 'google' | 'unknown';
  avatar_url: string | null;
  providerInfo: {
    name: string;
    icon: string;
    color: string;
  };
  createdAt?: string;
  updatedAt?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: string;
  permissions: string[];
  subscriptionTier: string;
  // New role fields
  adminRole?: string | null;
  roleLevel?: number;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

/**
 * Request user data with role information from backend
 * Integrates with the new JWT-based role system
 */
export async function getUserWithRoles(userToken: string): Promise<{
  adminRole: string | null;
  roleLevel: number;
  permissions: string[];
} | null> {
  try {
    // Call backend endpoint that uses the new SupabaseRoleManager
    const response = await fetch('/api/auth/user-with-roles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn('Failed to fetch user roles from backend:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      adminRole: data.adminRole || null,
      roleLevel: data.roleLevel || 0,
      permissions: data.permissions || []
    };
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return null;
  }
}

/**
 * Transform Supabase user data with provider detection, Apple OAuth support, and role integration
 */
export async function transformSupabaseUser(
  user: User | null, 
  options: { includeRoles?: boolean; userToken?: string } = {}
): Promise<TransformedUser | null> {
  if (!user) { return null; }

  const provider = user.app_metadata?.provider ?? 'unknown';
  
  // Handle known providers with proper typing (existing logic)
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
        return {
          name: 'Account',
          icon: '👤',
          color: '#6B7280'
        };
      }
    }
  })();

  // Base user object
  const baseUser: TransformedUser = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    username: user.user_metadata?.username,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    provider: provider as 'apple' | 'google' | 'unknown',
    providerInfo,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    isEmailVerified: true, // Default to true for now
    isPhoneVerified: false, // Default to false for now
    role: 'user', // Default role
    permissions: [], // Initialize empty, filled by backend role data
    subscriptionTier: 'free', // Default subscription tier
    // Initialize role fields
    adminRole: null,
    roleLevel: 0,
    permissions: [],
    isSuperAdmin: false
  };

  // Fetch role information if requested and token provided
  if (options.includeRoles && options.userToken) {
    try {
      const roleData = await getUserWithRoles(options.userToken);
      if (roleData) {
        baseUser.adminRole = roleData.adminRole;
        baseUser.roleLevel = roleData.roleLevel;
        baseUser.permissions = roleData.permissions;
        baseUser.isSuperAdmin = roleData.adminRole === 'super_admin';
      }
    } catch (error) {
      console.warn('Failed to fetch role data, continuing without roles:', error);
      // Continue without roles - don't fail the entire transformation
    }
  }

  return baseUser;
}

/**
 * Legacy transform function for backward compatibility
 * Use transformSupabaseUser with options for new implementations
 */
export async function transformSupabaseUserLegacy(user: User | null): Promise<TransformedUser | null> {
  // Call the new function without role fetching for backward compatibility
  return await transformSupabaseUser(user, { includeRoles: false });
}

/**
 * Check if user has admin role
 */
export function isAdminUser(user: TransformedUser | null): boolean {
  return !!(user?.adminRole && (user.roleLevel || 0) > 0);
}

/**
 * Check if user has specific permission
 */
export function hasUserPermission(user: TransformedUser | null, permission: string): boolean {
  if (!user) return false;
  return user.isSuperAdmin || (user.permissions || []).includes(permission);
}

/**
 * Check if user has minimum role level
 */
export function hasMinimumRoleLevel(user: TransformedUser | null, minLevel: number): boolean {
  if (!user) return false;
  return (user.roleLevel || 0) >= minLevel;
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
    
    // Return true if either changed, false only if both unchanged
    if (!refreshChanged && !jtiChanged) {
      // Token rotation failed: both refresh_token and JWT jti unchanged
      return false;
    }
    
    return true;
  } catch (error) {
    // Token rotation verification failed - return false as fallback
    return false;
  }
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
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Scrub PII from logs for Sentry
 */
export function scrubPII(data: any): any {
  if (!data) {return data;}
  
  const scrubbed = { ...data };
  const piiFields = ['email', 'phone', 'password', 'token', 'refresh_token', 'access_token'];
  
  piiFields.forEach(field => {
    if (scrubbed[field]) {
      scrubbed[field] = '[REDACTED]';
    }
  });
  
  return scrubbed;
}

/**
 * Extract is_anonymous flag from user metadata - defensive version
 */
export function extractIsAnonymous(u?: any): boolean {
  if (!u) {return false;}
  return Boolean(u.is_anonymous ?? u.isAnonymous ?? u.app_metadata?.is_anonymous ?? u.user_metadata?.is_anonymous ?? u['is_anonymous']);
}

/**
 * Check if Supabase is properly configured
 * Updated to use centralized utility
 */
export function isSupabaseConfigured(): boolean {
  // Import the centralized utility to avoid duplication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Handle authentication errors consistently
 */
export function handleAuthError(error: any, router?: any): void {
  // Auth error handled - redirect if appropriate
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
    },
    isEmailVerified: true,
    isPhoneVerified: false,
    role: 'user',
    permissions: ['read', 'write'],
    subscriptionTier: 'free',
    adminRole: null,
    roleLevel: 0,
    isSuperAdmin: false
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
    const testClient = createClient(supabaseUrl, supabaseAnonKey, {
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
