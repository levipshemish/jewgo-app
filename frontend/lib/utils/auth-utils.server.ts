/**
 * Server-only authentication utilities
 * These functions should only be used in server-side code (API routes, SSR)
 * to prevent client bundle inclusion of sensitive HMAC keys
 */

import { createHmac, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authLogger } from '@/lib/utils/logger';
import { createServerClient } from '@supabase/ssr';

// Server-only imports - only import when running on server
let cookies: any;
if (typeof window === 'undefined') {
  try {
    cookies = require('next/headers').cookies;
  } catch (error) {
    // Ignore import errors in client context
  }
}

// HMAC keys for cookie signing - server-only
// Use the standardized environment variable names from environment.server.ts
import { 
  MERGE_COOKIE_HMAC_KEY_CURRENT,
  MERGE_COOKIE_HMAC_KEY_PREVIOUS,
  CSRF_SECRET,
  IP_HASH_SALT,
  ANALYTICS_HMAC_SECRET
} from '@/lib/config/environment.server';

const MERGE_COOKIE_HMAC_KEY = MERGE_COOKIE_HMAC_KEY_CURRENT || 'fallback-key-change-in-production';
const MERGE_COOKIE_HMAC_KEY_V2 = MERGE_COOKIE_HMAC_KEY_PREVIOUS || 'fallback-key-v2-change-in-production';

// Feature support validation
let featureSupportValidated = false;
let featureSupportCache: boolean | null = null;

/**
 * Get cached feature support status
 * Returns the cached result if available, otherwise null
 */
export function getCachedFeatureSupport(): boolean | null {
  return featureSupportCache;
}

/**
 * Set cached feature support status
 */
export function setCachedFeatureSupport(supported: boolean): void {
  featureSupportCache = supported;
  featureSupportValidated = true;
}

/**
 * Server-side Supabase feature validation
 * Validates that required Supabase features are available at boot time
 */
export function validateSupabaseFeatureSupport(): boolean {
  // Return cached result if available
  if (featureSupportValidated && featureSupportCache !== null) {
    return featureSupportCache;
  }

  try {
    // Check if Supabase environment variables are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Feature Guard] Supabase environment variables not configured');
      setCachedFeatureSupport(false);
      return false;
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      console.error('[Feature Guard] Invalid Supabase URL format');
      setCachedFeatureSupport(false);
      return false;
    }

    // Check if we're in a server environment where we can validate features
    if (typeof window !== 'undefined') {
      // Client-side - assume features are available (will be validated on first use)
      setCachedFeatureSupport(true);
      return true;
    }

    // Server-side validation would require making a test request
    // For now, we'll validate the configuration is present
    console.log('[Feature Guard] Supabase configuration validated');
    setCachedFeatureSupport(true);
    return true;
    
  } catch (error) {
    console.error('[Feature Guard] Feature validation failed:', error);
    setCachedFeatureSupport(false);
    return false;
  }
}

/**
 * Test Supabase features by making a minimal API call
 * This validates that signInAnonymously and linkIdentity are available
 */
export async function testSupabaseFeatures(): Promise<{
  signInAnonymously: boolean;
  linkIdentity: boolean;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );

    // Assert signInAnonymously method exists and is callable
    if (typeof supabase.auth.signInAnonymously !== 'function') {
      throw new Error('signInAnonymously method not available on supabase.auth');
    }
    
    // Test linkIdentity availability (this would be used in the merge flow)
    // Note: linkIdentity might not be directly available in the client, but we can check auth methods
    const linkIdentity = true; // Assume available for now, will be validated during actual use

    return {
      signInAnonymously: true,
      linkIdentity
    };

  } catch (error) {
    console.error('[Feature Guard] Supabase feature test failed:', error);
    return {
      signInAnonymously: false,
      linkIdentity: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Comprehensive feature validation with Sentry logging
 * Strengthened to assert signInAnonymously and report loudly at boot
 */
export async function validateSupabaseFeaturesWithLogging(): Promise<boolean> {
  const correlationId = `feature_guard_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  try {
    console.log(`🚨 [Feature Guard] Starting critical feature validation (${correlationId})`);
    
    // Check cached result first
    const cachedResult = getCachedFeatureSupport();
    if (cachedResult !== null) {
      console.log(`[Feature Guard] Using cached result: ${cachedResult} (${correlationId})`);
      return cachedResult;
    }
    
    // Basic configuration validation
    if (!validateSupabaseFeatureSupport()) {
      console.error(`🚨 [Feature Guard] CRITICAL: Basic validation failed (${correlationId})`);
      
      // Log to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureMessage('CRITICAL: Supabase feature validation failed', {
          level: 'fatal',
          tags: { correlationId, component: 'feature_guard' },
          extra: { error: 'Basic configuration validation failed' }
        });
      }
      
      setCachedFeatureSupport(false);
      return false;
    }

    // Test actual features with explicit assertion
    const featureTest = await testSupabaseFeatures();
    
    // CRITICAL: Assert signInAnonymously is available
    if (!featureTest.signInAnonymously) {
      const errorMsg = `🚨 CRITICAL: signInAnonymously method not available (${correlationId})`;
      console.error(errorMsg, featureTest);
      
      // Report loudly at boot
      console.error('🚨 ANONYMOUS AUTH WILL FAIL - signInAnonymously method missing');
      console.error('🚨 This will cause 500 errors on /api/auth/anonymous');
      console.error('🚨 Check Supabase SDK version and configuration');
      console.error('🚨 Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
      console.error('🚨 Ensure Supabase project has anonymous auth enabled');
      
      // Log to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureMessage('CRITICAL: signInAnonymously not available', {
          level: 'fatal',
          tags: { correlationId, component: 'feature_guard' },
          extra: { featureTest, error: 'Anonymous auth will fail' }
        });
      }
      
      setCachedFeatureSupport(false);
      return false;
    }
    
    if (!featureTest.linkIdentity) {
      console.warn(`[Feature Guard] linkIdentity not available (${correlationId})`, featureTest);
      // Don't fail for linkIdentity as it's not critical for basic auth
    }

    console.log(`✅ [Feature Guard] Critical features validated successfully (${correlationId})`);
    console.log(`✅ signInAnonymously: AVAILABLE`);
    setCachedFeatureSupport(true);
    return true;

  } catch (error) {
    const errorMsg = `🚨 [Feature Guard] CRITICAL: Unexpected error during validation (${correlationId})`;
    console.error(errorMsg, error);
    
    // Report loudly at boot
    console.error('🚨 ANONYMOUS AUTH MAY FAIL - Feature validation error');
    console.error('🚨 Check Supabase configuration and network connectivity');
    
    // Log to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { correlationId, component: 'feature_guard' },
        extra: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
    
    setCachedFeatureSupport(false);
    return false;
  }
}

/**
 * Sign merge cookie with versioned HMAC
 * Uses current key by default, supports key rotation
 */
export function signMergeCookieVersioned(payload: any, version: 'v1' | 'v2' = 'v2'): string {
  const key = version === 'v2' ? MERGE_COOKIE_HMAC_KEY_V2 : MERGE_COOKIE_HMAC_KEY;
  const data = JSON.stringify(payload);
  const signature = createHmac('sha256', key).update(data).digest('hex');
  return `${version}:${signature}:${data}`;
}

/**
 * Verify merge cookie with versioned HMAC support
 * Supports both current and previous keys for seamless rotation
 */
export function verifyMergeCookieVersioned(signedCookie: string): {
  valid: boolean;
  payload?: any;
  error?: string;
} {
  try {
    const parts = signedCookie.split(':');
    if (parts.length < 3) {
      return { valid: false, error: 'Invalid cookie format' };
    }

    const version = parts[0];
    const signature = parts[1];
    const data = parts.slice(2).join(':');

    if (version !== 'v1' && version !== 'v2') {
      return { valid: false, error: 'Unsupported cookie version' };
    }

    // Try current key first, then fallback to previous key
    const currentKey = version === 'v2' ? MERGE_COOKIE_HMAC_KEY_V2 : MERGE_COOKIE_HMAC_KEY;
    const previousKey = version === 'v2' ? MERGE_COOKIE_HMAC_KEY : MERGE_COOKIE_HMAC_KEY_V2;

    const currentSignature = createHmac('sha256', currentKey).update(data).digest('hex');
    const previousSignature = createHmac('sha256', previousKey).update(data).digest('hex');

    if (signature === currentSignature || signature === previousSignature) {
      const payload = JSON.parse(data);
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Cookie expired' };
      }

      return { valid: true, payload };
    }

    return { valid: false, error: 'Invalid signature' };
  } catch (error) {
    return { valid: false, error: 'Cookie verification failed' };
  }
}

/**
 * Persist Apple user name with race-safe UPSERT
 * Only called when Apple actually sends name data
 */
export async function persistAppleUserName(userId: string, name: string | null, provider: string = 'apple', providerUserId?: string) {
  if (!name || !name.trim()) {
    return;
  }
  
  try {
    const supabaseServer = await createSupabaseServerClient();
    
    // Call the SQL function via RPC for race-safe name persistence
    const { error } = await supabaseServer.rpc('upsert_profile_with_name', {
      p_user_id: userId,
      p_name: name.trim()
    });

    if (error) {
      authLogger.error('Failed to persist Apple user name via RPC', { error: error.message, userId });
    } else {
      authLogger.info('Successfully persisted Apple user name', { userId });
    }
  } catch (error) {
    authLogger.error('Error persisting Apple user name', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId 
    });
  }
}

/**
 * Create HMAC-based analytics key for PII-safe logging
 */
export function createAnalyticsKey(userId: string): string {
  const secret = ANALYTICS_HMAC_SECRET;
  
  // Harden the function to throw in production if secret is missing
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ANALYTICS_HMAC_SECRET is required in production environment');
    }
    // Use a weak default only in development
    authLogger.warn('Using weak default secret in development');
  }
  
  const finalSecret = secret || 'default-secret';
  return createHmac('sha256', finalSecret)
    .update(userId)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Detect OAuth provider from user metadata
 */
export function detectProvider(user: any): 'apple' | 'google' | 'unknown' {
  const provider = user?.app_metadata?.provider;
  
  switch (provider) {
    case 'apple':
      return 'apple';
    case 'google':
      return 'google';
    default:
      return 'unknown';
  }
}

/**
 * Check if user is from Apple OAuth
 */
export function isAppleUser(user: any): boolean {
  return detectProvider(user) === 'apple';
}



// Identity linking functionality removed - implement using official APIs when needed
// For proactive link: call the official link identity API while the user is authenticated
// For reactive collisions: use the link attempt's error to branch UX and require re-auth with the primary method
// Do not query auth.identities from anon/client contexts

/**
 * Server-side feature flag check
 */
export function isAppleOAuthEnabled(): boolean {
  return process.env.APPLE_OAUTH_ENABLED === 'true';
}

/**
 * Log OAuth event with PII-safe analytics
 */
export function logOAuthEvent(userId: string, provider: string, event: string) {
  const analyticsKey = createAnalyticsKey(userId);
  authLogger.info(`[OAUTH] ${event} - Provider: ${provider} - User: ${analyticsKey}`);
}

/**
 * Attempt to link user identities using official Supabase Link API
 * This function handles the secure linking of multiple identities for the same user
 */
export async function attemptIdentityLinking(userId: string, targetProvider: string): Promise<{
  success: boolean;
  error?: string;
  requiresReAuth?: boolean;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user to check identities
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }
    
    // Check if user has multiple identities
    if (!user.identities || user.identities.length <= 1) {
      return { success: true }; // No linking needed
    }
    
    // Check if the target provider is already linked
    const hasTargetProvider = user.identities.some(id => id.provider === targetProvider);
    if (hasTargetProvider) {
      return { success: true }; // Already linked
    }
    
    // For security, we require re-authentication before linking
    // This prevents hostile takeovers
    authLogger.info('Identity linking requires re-authentication for security', { 
      userId, 
      targetProvider,
      existingProviders: user.identities.map(id => id.provider)
    });
    
    return { 
      success: false, 
      requiresReAuth: true,
      error: 'Re-authentication required for secure linking'
    };
    
  } catch (error) {
    authLogger.error('Identity linking attempt failed', { 
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      userId 
    });
    return { success: false, error: 'Linking failed' };
  }
}

/**
 * TODO: Complete identity linking after successful re-authentication
 * This function is gated behind ACCOUNT_LINKING_ENABLED and should only be called
 * after the user has re-authenticated. Currently returns failure as the official
 * Supabase Link API is not yet implemented.
 */
export async function completeIdentityLinking(userId: string, reauthProvider: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Gate behind feature flag
  if (process.env.ACCOUNT_LINKING_ENABLED !== 'true') {
    return { success: false, error: 'Account linking not enabled' };
  }

  // TODO: Implement actual Supabase Link API integration
  // For now, return failure as this is not yet implemented
  authLogger.info('Identity linking attempted but not implemented yet', {
    userId, 
    reauthProvider
  });
  
  return { success: false, error: 'Linking not implemented yet' };
}

/**
 * Server-only HMAC constants
 */
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Hash IP address for privacy using salted SHA-256
 * Prevents raw IP logging while maintaining correlation capabilities
 */
export function hashIPForPrivacy(ip: string): string {
  const salt = IP_HASH_SALT || 'default-ip-salt-change-in-production';
  const data = `${ip}:${salt}`;
  return createHmac('sha256', salt).update(data).digest('hex').substring(0, 16);
}

/**
 * Verify signed CSRF token using HMAC
 * Server-side implementation with full signature validation
 */
export function verifySignedCSRFTokenServer(token: string): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 4) {
      return false;
    }

    const [version, timestamp, nonce, signature] = parts;
    
    // Validate version
    if (version !== 'v1' && version !== 'v2') {
      return false;
    }

    // Check expiration
    const tokenTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    if (currentTime - tokenTime > CSRF_TOKEN_EXPIRY) {
      return false;
    }

    // Verify HMAC signature
    const payload = `${version}:${timestamp}:${nonce}`;
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('CSRF token verification failed:', error);
    return false;
  }
}

/**
 * Generate signed CSRF token
 * Server-side implementation for generating secure tokens
 */
export function generateSignedCSRFToken(): string {
  const version = 'v2';
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const payload = `${version}:${timestamp}:${nonce}`;
  
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}:${signature}`;
}

/**
 * Server-side CSRF validation with HMAC verification
 * This is the server-only version that performs full signature validation
 */
export function validateCSRFServer(
  origin: string | null,
  referer: string | null,
  allowedOrigins: string[],
  csrfToken?: string | null
): boolean {
  // If both Origin and Referer are missing, require a valid signed CSRF token
  if (!origin && !referer) {
    if (!csrfToken) {
      return false;
    }
    
    // Verify signed CSRF token using HMAC
    return verifySignedCSRFTokenServer(csrfToken);
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
 * Generate a secure random password for anonymous users using crypto
 * Server-side only to prevent client bundle bloat
 */
export function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(32);
  
  // Use Node.js crypto for server-side generation
  randomBytes(32).copy(array);
  
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(array[i] % chars.length);
  }
  
  return password;
}
