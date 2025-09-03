/**
 * Client-side authentication utilities that don't import Supabase client
 * This prevents Edge Runtime compatibility issues during prerendering
 */

import { type TransformedUser, type AuthProvider, AUTH_PROVIDERS } from "@/lib/types/supabase-auth";
import type { Permission, Role } from '@/lib/constants/permissions';

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
    email_verified?: boolean;
    phone_verified?: boolean;
  };
  app_metadata?: {
    provider?: string;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Check if user is anonymous based on app_metadata
 */
export function extractIsAnonymous(u?: any): boolean {
  if (!u?.app_metadata) {
    return false;
  }
  return u.app_metadata.provider === 'anonymous';
}

/**
 * Check if Supabase is configured (client-side only)
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Get base URL for client-side requests
 */
function getBaseUrlClient(): string {
  // Use environment variables available to the client
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                 process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXTAUTH_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // For client-side, try to get from window.location if available
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Production fallback - this should be configured
  console.warn('[AbsoluteURL-Client] No base URL configured, using localhost fallback');
  return 'http://localhost:3000';
}

/**
 * Request user data with role information from backend
 * Integrates with the new JWT-based role system
 */
export async function getUserWithRoles(userToken: string): Promise<{
  adminRole: Role | null;
  roleLevel: number;
  permissions: Permission[];
} | null> {
  try {
    // Determine if we're running server-side or client-side
    const isServer = typeof window === 'undefined';
    
    // Use absolute URL for server-side requests to prevent ERR_INVALID_URL
    const url = isServer 
      ? `${getBaseUrlClient()}/api/auth/user-with-roles`
      : '/api/auth/user-with-roles';
    
    // Call backend endpoint that uses the new SupabaseRoleManager
    const response = await fetch(url, {
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
      adminRole: (data.adminRole ?? null) as Role | null,
      roleLevel: data.roleLevel || 0,
      permissions: data.permissions || []
    };
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return null;
  }
}

/**
 * Base transformation function (client-safe, no server dependencies)
 */
function transformSupabaseUserBase(user: User | null): Omit<TransformedUser, 'adminRole' | 'roleLevel' | 'permissions' | 'isSuperAdmin'> | null {
  if (!user) {
    return null;
  }

  const provider = user.app_metadata?.provider ?? 'unknown';
  
  // Handle known providers with proper typing
  const providerInfo = AUTH_PROVIDERS[provider as AuthProvider] || AUTH_PROVIDERS.unknown;

  return {
    id: user.id,
    email: user.email || undefined,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    username: user.user_metadata?.username,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    provider: provider as AuthProvider,
    providerInfo,
    createdAt: user.created_at || undefined,
    updatedAt: user.updated_at || undefined,
    isEmailVerified: user.user_metadata?.email_verified || false,
    isPhoneVerified: user.user_metadata?.phone_verified || false,
    role: 'user', // Default role
    subscriptionTier: 'free', // Default subscription tier
  };
}

/**
 * Transform Supabase user data with provider detection, Apple OAuth support, and role integration
 * Client-safe version without server dependencies
 */
export async function transformSupabaseUserWithRoles(
  user: User | null, 
  options: { includeRoles?: boolean; userToken?: string } = {}
): Promise<TransformedUser | null> {
  const baseUser = transformSupabaseUserBase(user);
  if (!baseUser) {
    return null;
  }

  // Initialize role fields with proper defaults
  const transformedUser: TransformedUser = {
    ...baseUser,
    permissions: [], // Initialize empty, filled by backend role data
    adminRole: null,
    roleLevel: 0,
    isSuperAdmin: false
  };

  // Fetch role information if requested and token provided
  if (options.includeRoles && options.userToken) {
    try {
      const roleData = await getUserWithRoles(options.userToken);
      if (roleData) {
        transformedUser.adminRole = roleData.adminRole;
        transformedUser.roleLevel = roleData.roleLevel;
        transformedUser.permissions = [...roleData.permissions];
        transformedUser.isSuperAdmin = roleData.adminRole === 'super_admin';
      }
    } catch (error) {
      console.warn('Failed to fetch role data, continuing without roles:', error);
      // Continue without roles - don't fail the entire transformation
    }
  }

  return transformedUser;
}

/**
 * Legacy transform function for no-role behavior
 * @deprecated Use transformSupabaseUserWithRoles with options instead. Removal planned for Q2 2025.
 */
export async function transformSupabaseUserLegacy(user: User | null): Promise<TransformedUser | null> {
  // Legacy behavior: no role fetching
  return await transformSupabaseUserWithRoles(user, { includeRoles: false });
}

/**
 * Primary transform function - delegates to transformSupabaseUserWithRoles for consistency
 * Use this for all new implementations
 */
export async function transformSupabaseUser(user: User | null, options: { includeRoles?: boolean; userToken?: string } = {}): Promise<TransformedUser | null> {
  return await transformSupabaseUserWithRoles(user, options);
}

/**
 * Handle user load errors (client-side only)
 */
export function handleUserLoadError(error: any, router?: any): void {
  console.error('User load error:', error);
  
  // If router is provided, redirect to signin
  if (router && typeof router.push === 'function') {
    router.push('/auth/signin');
  }
}

/**
 * Check if user has admin role
 */
export function isAdminUser(user: TransformedUser | null): boolean {
  return !!(user && (user.isSuperAdmin || (user.adminRole && user.roleLevel > 0)));
}

/**
 * Check if user has specific permission
 */
export function hasUserPermission(user: TransformedUser | null, permission: Permission): boolean {
  if (!user) {
    return false;
  }
  return user.isSuperAdmin || (user.permissions || []).includes(permission);
}

/**
 * Check if user has minimum role level
 */
export function hasMinimumRoleLevel(user: TransformedUser | null, minLevel: number): boolean {
  if (!user) {
    return false;
  }
  return user.roleLevel >= minLevel;
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
  if (!data) {
    return data;
  }
  
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
 * Handle authentication errors consistently
 */
export function handleAuthError(error: any, router?: any): void {
  // Auth error handled - redirect if appropriate
  if (router && error?.message?.includes('auth')) {
    router.push('/auth/signin');
  }
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
 * Create a mock user for development
 */
export function createMockUser(): TransformedUser {
  return {
    id: 'mock-user-id',
    email: 'mock@example.com',
    name: 'Mock User',
    username: 'mockuser',
    provider: 'unknown' as AuthProvider,
    avatar_url: null,
    providerInfo: {
      name: 'Email',
      icon: '📧',
      color: 'text-gray-600',
      displayName: 'Email',
      },
    createdAt: undefined,
    updatedAt: undefined,
    isEmailVerified: true,
    isPhoneVerified: false,
    role: 'user',
    permissions: [],
    subscriptionTier: 'free',
    // Initialize role fields with proper defaults
    adminRole: null,
    roleLevel: 0,
    isSuperAdmin: false
    };
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
  } catch (_error) {
    // Token rotation verification failed - return false as fallback
    return false;
  }
}
