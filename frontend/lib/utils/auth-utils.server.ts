/**
 * Server-only authentication utilities
 * These functions should only be used in server-side code (API routes, SSR)
 * to prevent client bundle inclusion of sensitive HMAC keys
 */

import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { authLogger } from '@/lib/utils/logger';

// HMAC keys for cookie signing - server-only
const MERGE_COOKIE_HMAC_KEY = process.env.MERGE_COOKIE_HMAC_KEY || 'fallback-key-change-in-production';
const MERGE_COOKIE_HMAC_KEY_V2 = process.env.MERGE_COOKIE_HMAC_KEY_V2 || 'fallback-key-v2-change-in-production';

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
  const secret = process.env.ANALYTICS_HMAC_SECRET;
  
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
