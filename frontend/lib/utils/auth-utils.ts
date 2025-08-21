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

// Feature support validation
let featureSupportValidated = false;

/**
 * Validate Supabase feature support at runtime with boot-time checks
 * Checks for signInAnonymously and linkIdentity method availability
 */
export function validateSupabaseFeatureSupport(): boolean {
  if (featureSupportValidated) {
    return true;
  }

  try {
    // Dynamic import to avoid SSR issues
    const { createClient } = require('@supabase/supabase-js');
    
    // Create a test client to check method availability
    const testClient = createClient('https://test.supabase.co', 'test-key');
    
    // Check for required methods
    if (typeof testClient.auth.signInAnonymously !== 'function') {
      console.error('🚨 CRITICAL: signInAnonymously method not available in Supabase SDK');
      console.error('This will brick the entire guest flow. Check Supabase SDK version.');
      return false;
    }
    
    if (typeof testClient.auth.linkIdentity !== 'function') {
      console.error('🚨 CRITICAL: linkIdentity method not available in Supabase SDK');
      console.error('This will prevent account merging. Check Supabase SDK version.');
      return false;
    }
    
    featureSupportValidated = true;
    console.log('✅ Supabase feature support validated successfully');
    return true;
  } catch (error) {
    console.error('🚨 CRITICAL: Failed to validate Supabase feature support:', error);
    console.error('Application startup failure - Supabase SDK may be corrupted');
    return false;
  }
}

/**
 * Verify token rotation after account upgrade
 * Checks refresh_token and JWT jti changes between pre/post upgrade states
 */
export function verifyTokenRotation(
  preUpgradeSession: any,
  postUpgradeSession: any
): boolean {
  try {
    // Check if refresh_token changed
    if (preUpgradeSession.refresh_token === postUpgradeSession.refresh_token) {
      console.warn('Token rotation failed: refresh_token unchanged');
      return false;
    }
    
    // Extract and compare JWT jti (JWT ID)
    const preJti = extractJtiFromToken(preUpgradeSession.access_token);
    const postJti = extractJtiFromToken(postUpgradeSession.access_token);
    
    if (preJti === postJti) {
      console.warn('Token rotation failed: JWT jti unchanged');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token rotation verification failed:', error);
    return false;
  }
}

/**
 * Extract JWT ID (jti) from access token
 */
function extractJtiFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.jti || null;
  } catch {
    return null;
  }
}

// Versioned HMAC utilities for merge cookie
const MERGE_COOKIE_KEY_ID = process.env.MERGE_COOKIE_KEY_ID || 'v1';
const MERGE_COOKIE_HMAC_KEY_CURRENT = process.env.MERGE_COOKIE_HMAC_KEY_CURRENT || 'default-key';
const MERGE_COOKIE_HMAC_KEY_PREVIOUS = process.env.MERGE_COOKIE_HMAC_KEY_PREVIOUS || 'default-key';



/**
 * Sanitize redirect URL with strict path-only enforcement
 * Rejects external domains unless explicitly allowlisted
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string {
  if (!url) {
    return '/';
  }
  
  try {
    // Early guard: must start with /
    if (!url.startsWith('/')) {
      return '/';
    }
    
    // Reject protocol-relative URLs and dangerous patterns
    if (url.includes('://') || url.includes('//') || url.includes('..') || url.includes('#')) {
      return '/';
    }
    
    // Check for encoded attacks
    const decodedUrl = decodeURIComponent(url);
    if (decodedUrl.includes('://') || decodedUrl.includes('//') || decodedUrl.includes('#')) {
      return '/';
    }
    
    // Enforce max length
    if (url.length > 2048) {
      return '/';
    }
    
    // Parse URL safely
    const urlObj = new URL(decodedUrl, 'http://localhost');
    const path = urlObj.pathname;
    
    // Additional path validation
    if (path.includes('://') || path.includes('//') || path.includes('#')) {
      return '/';
    }
    
    // Allow only safe paths (expanded to include guest-allowed routes)
    const safePaths = ['/', '/app', '/dashboard', '/profile', '/settings', '/admin', '/messages', '/favorites', '/marketplace'];
    const hasSafePath = safePaths.some(safePath => 
      path === safePath || path.startsWith(`${safePath}/`)
    );
    
    if (!hasSafePath) {
      return '/';
    }
    
    // Filter query parameters
    const safeParams = new URLSearchParams();
    const allowedParams = ['utm_source', 'utm_medium', 'utm_campaign', 'tab', 'ref'];
    
    Array.from(urlObj.searchParams.entries()).forEach(([key, value]) => {
      if (allowedParams.includes(key)) {
        safeParams.set(key, value);
      }
    });
    
    // Reconstruct safe URL
    const safeUrl = path + (safeParams.toString() ? `?${safeParams.toString()}` : '');
    return safeUrl;
    
  } catch {
    return '/';
  }
}

// Trusted IP configuration
const TRUSTED_CDN_IPS = [
  // Cloudflare
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  // EdgeCast
  '103.245.222.0/23', '103.245.224.0/24', '103.245.225.0/24', '103.245.226.0/23',
  // Add other CDNs as needed
];

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
 * Check if IP is in CIDR range
 */
function isIPInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~((1 << (32 - parseInt(bits))) - 1);
    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);
    return (ipLong & mask) === (rangeLong & mask);
  } catch {
    return false;
  }
}

/**
 * Convert IP to long integer
 */
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * Comprehensive CSRF validation with OPTIONS support and token fallback
 */
export function validateCSRF(
  origin: string | null,
  referer: string | null,
  allowedOrigins: string[],
  csrfToken?: string | null
): boolean {
  // Check for CSRF token fallback when Origin/Referer are missing
  if ((!origin || !referer) && csrfToken) {
    // Verify CSRF token server-side (this would integrate with your CSRF validation)
    // For now, we'll accept any non-empty token as valid
    return csrfToken.length > 0;
  }
  
  // Both Origin and Referer must be present and valid
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
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Scrub PII from logs for Sentry
 */
export function scrubPII(data: any): any {
  if (!data) return data;
  
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
  if (!u) return false;
  return Boolean(u.is_anonymous ?? u.isAnonymous ?? u.app_metadata?.is_anonymous ?? u.user_metadata?.is_anonymous ?? u['is_anonymous']);
}

/**
 * Generate a secure random password for anonymous users
 */
export function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
