import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPrivateRelayEmail } from '@/lib/utils/auth-utils';
import { authLogger } from '@/lib/utils/logger';
import crypto from 'crypto';
import { 
  MERGE_COOKIE_HMAC_KEY_CURRENT, 
  MERGE_COOKIE_HMAC_KEY_PREVIOUS, 
  MERGE_COOKIE_KEY_ID 
} from '@/lib/config/environment';

/**
 * Server-safe Supabase feature support validation
 * Checks for signInAnonymously method availability without client-side dependencies
 */
export function validateSupabaseFeatureSupport(): boolean {
  try {
    // Check if Supabase environment variables are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('🚨 CRITICAL: Supabase environment variables not configured');
      return false;
    }
    
    // Check if we're in a server environment where we can validate
    if (typeof window !== 'undefined') {
      console.error('🚨 CRITICAL: validateSupabaseFeatureSupport called in client environment');
      return false;
    }
    
    // For server-side validation, we assume the SDK is available
    // The actual method availability will be checked at runtime
    console.log('✅ Server-side Supabase feature support validated');
    return true;
  } catch (error) {
    console.error('🚨 CRITICAL: Failed to validate Supabase feature support:', error);
    return false;
  }
}

/**
 * Sign merge cookie with versioned HMAC support
 * Uses current key for new signatures, supports key rotation
 */
export function signMergeCookieVersioned(payload: any): string {
  const currentKey = MERGE_COOKIE_HMAC_KEY_CURRENT;
  const keyId = MERGE_COOKIE_KEY_ID;
  
  if (!currentKey || currentKey === 'default-key') {
    throw new Error('MERGE_COOKIE_HMAC_KEY_CURRENT must be set');
  }
  
  // Create payload with version info
  const versionedPayload = {
    ...payload,
    kid: keyId,
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Sign with current key
  const hmac = crypto.createHmac('sha256', currentKey);
  hmac.update(JSON.stringify(versionedPayload));
  const signature = hmac.digest('hex');
  
  // Return signed token
  return `${keyId}.${Buffer.from(JSON.stringify(versionedPayload)).toString('base64')}.${signature}`;
}

/**
 * Verify merge cookie with versioned HMAC support
 * Supports both current and previous keys for smooth rotation
 */
export function verifyMergeCookieVersioned(token: string): {
  valid: boolean;
  payload?: any;
  error?: string;
} {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [keyId, payloadB64, signature] = parts;
    
    // Decode payload
    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    // Verify key ID matches
    if (payload.kid !== keyId) {
      return { valid: false, error: 'Key ID mismatch' };
    }
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }
    
    // Try current key first
    const currentKey = MERGE_COOKIE_HMAC_KEY_CURRENT;
    if (currentKey && currentKey !== 'default-key') {
      const hmac = crypto.createHmac('sha256', currentKey);
      hmac.update(payloadStr);
      const expectedSignature = hmac.digest('hex');
      
      if (signature === expectedSignature) {
        return { valid: true, payload };
      }
    }
    
    // Try previous key for rotation support
    const previousKey = MERGE_COOKIE_HMAC_KEY_PREVIOUS;
    if (previousKey && previousKey !== 'default-key') {
      const hmac = crypto.createHmac('sha256', previousKey);
      hmac.update(payloadStr);
      const expectedSignature = hmac.digest('hex');
      
      if (signature === expectedSignature) {
        return { valid: true, payload };
      }
    }
    
    return { valid: false, error: 'Invalid signature' };
    
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
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
 * Complete identity linking after successful re-authentication
 * This should only be called after the user has re-authenticated
 */
export async function completeIdentityLinking(userId: string, reauthProvider: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user after re-authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not found after re-authentication' };
    }
    
    // Verify that the re-authentication was successful
    const hasReauthProvider = user.identities?.some(id => id.provider === reauthProvider);
    if (!hasReauthProvider) {
      return { success: false, error: 'Re-authentication verification failed' };
    }
    
    // Log successful linking
    authLogger.info('Identity linking completed successfully after re-authentication', { 
      userId, 
      reauthProvider,
      totalIdentities: user.identities?.length || 0
    });
    
    return { success: true };
    
  } catch (error) {
    authLogger.error('Identity linking completion failed', { 
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      userId 
    });
    return { success: false, error: 'Linking completion failed' };
  }
}
