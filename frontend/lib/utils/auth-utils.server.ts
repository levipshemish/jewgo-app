import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPrivateRelayEmail } from '@/lib/utils/auth-utils';
import { authLogger } from '@/lib/utils/logger';
import crypto from 'crypto';

// Merge cookie constants
const MERGE_COOKIE_KEY_ID = 'v1';
const MERGE_COOKIE_HMAC_KEY_CURRENT = process.env.MERGE_COOKIE_HMAC_KEY_CURRENT || 'default-current-key';
const MERGE_COOKIE_HMAC_KEY_PREVIOUS = process.env.MERGE_COOKIE_HMAC_KEY_PREVIOUS || 'default-previous-key';

/**
 * Sign merge cookie with versioned HMAC
 */
export function signMergeCookieVersioned(payload: {
  anon_uid: string;
  exp: number;
}): string {
  const data = JSON.stringify({
    ...payload,
    kid: MERGE_COOKIE_KEY_ID
  });
  
  const hmac = crypto.createHmac('sha256', MERGE_COOKIE_HMAC_KEY_CURRENT);
  hmac.update(data);
  
  return `${data}.${hmac.digest('hex')}`;
}

/**
 * Verify merge cookie with versioned HMAC and key rotation support
 */
export function verifyMergeCookieVersioned(signedCookie: string): {
  valid: boolean;
  payload?: any;
  error?: string;
} {
  try {
    const [data, signature] = signedCookie.split('.');
    if (!data || !signature) {
      return { valid: false, error: 'Invalid cookie format' };
    }
    
    const payload = JSON.parse(data);
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return { valid: false, error: 'Cookie expired' };
    }
    
    // Try current key first
    let hmac = crypto.createHmac('sha256', MERGE_COOKIE_HMAC_KEY_CURRENT);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature === expectedSignature) {
      return { valid: true, payload };
    }
    
    // Try previous key for rotation support
    hmac = crypto.createHmac('sha256', MERGE_COOKIE_HMAC_KEY_PREVIOUS);
    hmac.update(data);
    const expectedSignaturePrev = hmac.digest('hex');
    
    if (signature === expectedSignaturePrev) {
      return { valid: true, payload };
    }
    
    return { valid: false, error: 'Invalid signature' };
  } catch (error) {
    return { valid: false, error: 'Verification failed' };
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
  return crypto
    .createHmac('sha256', finalSecret)
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
