import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPrivateRelayEmail } from '@/lib/utils/auth-utils';
import crypto from 'crypto';

/**
 * Persist Apple user name with race-safe UPSERT
 * Only called when Apple actually sends name data
 */
export async function persistAppleUserName(userId: string, name: string | null, provider: string = 'apple', providerUserId?: string) {
  if (!name || !name.trim()) return;
  
  try {
    const supabaseServer = await createSupabaseServerClient();
    
    // Call the SQL function via RPC for race-safe name persistence
    const { error } = await supabaseServer.rpc('upsert_profile_with_name', {
      p_user_id: userId,
      p_name: name.trim(),
      p_provider: provider,
      p_provider_user_id: providerUserId || null
    });

    if (error) {
      console.error('Failed to persist Apple user name via RPC:', error);
    } else {
      console.log(`Successfully persisted Apple user name for user: ${userId}`);
    }
  } catch (error) {
    console.error('Error persisting Apple user name:', error);
  }
}

/**
 * Create HMAC-based analytics key for PII-safe logging
 */
export function createAnalyticsKey(userId: string): string {
  const secret = process.env.ANALYTICS_HMAC_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
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
  console.log(`[OAUTH] ${event} - Provider: ${provider} - User: ${analyticsKey}`);
}
