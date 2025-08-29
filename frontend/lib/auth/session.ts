/**
 * Session Management Module
 * Handles user session operations and validation
 */

import { createServerSupabaseClient } from '../supabase/server';
import { TransformedUser } from '../utils/auth-utils';

/**
 * Get current user session
 */
export async function getCurrentSession() {
  const supabase = await createServerSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  
  return session;
}

/**
 * Get current user with transformed data
 */
export async function getCurrentUser(): Promise<TransformedUser | null> {
  const session = await getCurrentSession();
  if (!session?.user) {
    return null;
  }
  
  return transformUser(session.user);
}

/**
 * Transform Supabase user to TransformedUser
 */
function transformUser(user: any): TransformedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    username: user.user_metadata?.username,
    provider: user.app_metadata?.provider || 'unknown',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    providerInfo: getProviderInfo(user.app_metadata?.provider),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    isEmailVerified: true, // Default to true for now
    isPhoneVerified: false, // Default to false for now
    role: 'user', // Default role
    permissions: ['read', 'write'], // Default permissions
    subscriptionTier: 'free', // Default subscription tier
    // Initialize role fields
    adminRole: null,
    roleLevel: 0,
    isSuperAdmin: false
  };
}

/**
 * Get provider information
 */
function getProviderInfo(provider: string) {
  switch (provider) {
    case 'apple':
      return { name: 'Apple', icon: '🍎', color: '#000000', displayName: 'Apple' };
    case 'google':
      return { name: 'Google', icon: '🔍', color: '#4285F4', displayName: 'Google' };
    default:
      return { name: 'Email', icon: '📧', color: '#6B7280', displayName: 'Email' };
  }
}

/**
 * Validate session is recent (within last 24 hours)
 */
export function isSessionRecent(session: any): boolean {
  if (!session?.access_token) {
    return false;
  }
  
  try {
    const payload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString());
    const issuedAt = payload.iat * 1000; // Convert to milliseconds
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return (now - issuedAt) < oneDay;
  } catch {
    return false;
  }
}
