import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { transformSupabaseUser } from '@/lib/utils/auth-utils';
import { AdminUser, AdminRole, ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from './types';
// Re-export types and helpers so other modules can import from this single entrypoint
export type { AdminUser, AdminRole };
export { ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from './types';
export { hasPermission } from './types';

/**
 * Get user's admin role from Supabase using the get_user_admin_role function
 */
async function getUserAdminRole(userId: string): Promise<AdminRole> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Use the Supabase function to get admin role
    const { data, error } = await supabase.rpc('get_user_admin_role', {
      user_id_param: userId
    });
    
    if (error) {
      console.error('[ADMIN] Error calling get_user_admin_role:', error);
      // Fallback to direct query if function doesn't exist
      return await getUserAdminRoleFallback(userId);
    }
    
    if (data && typeof data === 'string') {
      return data as AdminRole;
    }
    
    // Fallback to direct query
    return await getUserAdminRoleFallback(userId);
  } catch (error: any) {
    console.error('[ADMIN] Error getting user admin role:', error);
    
    // Fail-closed option for staging if desired
    if (process.env.ADMIN_RBAC_FAIL_CLOSED === 'true') {
      throw new Error('Admin RBAC lookup failed; access denied');
    }
    return 'moderator';
  }
}

/**
 * Fallback method to get admin role directly from Supabase tables
 */
async function getUserAdminRoleFallback(userId: string): Promise<AdminRole> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // First check if user is super admin in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('issuperadmin')
      .eq('id', userId)
      .single();
    
    if (!userError && user?.issuperadmin) {
      return 'super_admin';
    }
    
    // Then check admin_roles table for active role
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('expires_at', null)
      .or('expires_at.gt.now()');
    
    if (!rolesError && roles && roles.length > 0) {
      const rolePriority: Record<AdminRole, number> = {
        super_admin: 4,
        system_admin: 3,
        data_admin: 2,
        moderator: 1,
      };
      
      const top = roles
        .map((r: any) => r.role as AdminRole)
        .filter((r: any): r is AdminRole => ['moderator','data_admin','system_admin','super_admin'].includes(r))
        .sort((a: AdminRole, b: AdminRole) => rolePriority[b] - rolePriority[a])[0];
      
      if (top) { 
        return top; 
      }
    }
    
    // Default to moderator if no role found
    return 'moderator';
  } catch (error: any) {
    console.error('[ADMIN] Error in getUserAdminRoleFallback:', error);
    return 'moderator';
  }
}

/**
 * Require admin authentication for API routes
 */
export async function requireAdmin(request: NextRequest): Promise<AdminUser | null> {
  try {
    // Rate limiting is handled by middleware-security.ts using Upstash Redis
    // Only use in-memory rate limiting in development for testing
    if (process.env.NODE_ENV === 'development') {
      // Simple in-memory rate limiting for development only
      const clientIP = (request as any).ip || 'unknown';
      const rateLimitKey = `admin_auth_dev:${clientIP}`;
      const now = Date.now();
      
      // Use a simple Map for development rate limiting
      const devRateLimitStore = new Map<string, { count: number; resetTime: number }>();
      const rateLimit = devRateLimitStore.get(rateLimitKey);
      
      if (rateLimit && now < rateLimit.resetTime) {
        if (rateLimit.count >= 10) { // 10 attempts per minute in dev
          console.warn(`[ADMIN DEV] Rate limit exceeded for IP: ${clientIP}`);
          return null;
        }
        rateLimit.count++;
      } else {
        devRateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + 60000 });
      }
    }

    // Get user from Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Development bypass: If no user is authenticated and we're in development,
    // create a mock admin user for testing
    if ((error || !user) && process.env.NODE_ENV === 'development') {
      console.log('[ADMIN DEV] No authenticated user found, creating mock admin user for development');
      
      // Create a mock admin user for development
      const mockUser: AdminUser = {
        id: 'dev-admin-user',
        email: 'dev-admin@jewgo.com',
        name: 'Development Admin',
        username: 'dev-admin',
        provider: 'unknown',
        avatar_url: null,
        providerInfo: {
          name: 'Development',
          icon: '👤',
          color: '#6B7280'
        },
        isSuperAdmin: true,
        adminRole: 'super_admin',
        permissions: Object.values(ADMIN_PERMISSIONS),
      };
      
      return mockUser;
    }
    
    if (error || !user) {
      console.error('[ADMIN] Auth error:', error);
      return null;
    }

    // Transform user
    const transformedUser = transformSupabaseUser(user);
    if (!transformedUser) {
      return null;
    }

    // Get admin role from Supabase (source of truth)
    let adminRole = await getUserAdminRole(user.id);

    // Development overrides to ease local testing
    // These overrides only apply in NODE_ENV=development and are ignored in production
    if (process.env.NODE_ENV === 'development') {
      // ADMIN_DEFAULT_ROLE: Override the database role for testing specific permission levels
      const defaultRole = (process.env.ADMIN_DEFAULT_ROLE || '').trim();
      if (defaultRole && ['moderator','data_admin','system_admin','super_admin'].includes(defaultRole)) {
        adminRole = defaultRole as AdminRole;
      }
      
      // ADMIN_BYPASS_PERMS: Give full super admin access for testing all features
      if (process.env.ADMIN_BYPASS_PERMS === 'true') {
        // Full super admin in development when explicitly enabled
        return {
          ...transformedUser,
          isSuperAdmin: true,
          adminRole: 'super_admin',
          permissions: Object.values(ADMIN_PERMISSIONS),
        };
      }
    }

    // Check if user is super admin
    const isSuperAdmin = adminRole === 'super_admin';

    // Get permissions for role
    const permissions = ROLE_PERMISSIONS[adminRole] || [];

    const adminUser: AdminUser = {
      ...transformedUser,
      isSuperAdmin,
      adminRole,
      permissions,
    };

    return adminUser;
  } catch (error) {
    console.error('[ADMIN] requireAdmin error:', error);
    return null;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AdminUser, permissions: string[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission)) || user.isSuperAdmin;
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AdminUser, permissions: string[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission)) || user.isSuperAdmin;
}

/**
 * Generate CSRF token for admin operations
 */
export function generateCSRFToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `admin_${timestamp}_${random}`;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  if (!token || !token.startsWith('admin_')) {
    return false;
  }
  
  const parts = token.split('_');
  if (parts.length !== 3) {
    return false;
  }
  
  const timestamp = parseInt(parts[1]);
  const now = Date.now();
  
  // Token expires after 1 hour
  return (now - timestamp) < 3600000;
}

/**
 * Get admin user from session (for server components)
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Development bypass: If no user is authenticated and we're in development,
    // create a mock admin user for testing
    if ((error || !user) && process.env.NODE_ENV === 'development') {
      console.log('[ADMIN DEV] No authenticated user found, creating mock admin user for development');
      
      // Create a mock admin user for development
      const mockUser: AdminUser = {
        id: 'dev-admin-user',
        email: 'dev-admin@jewgo.com',
        name: 'Development Admin',
        username: 'dev-admin',
        provider: 'unknown',
        avatar_url: null,
        providerInfo: {
          name: 'Development',
          icon: '👤',
          color: '#6B7280'
        },
        isSuperAdmin: true,
        adminRole: 'super_admin',
        permissions: Object.values(ADMIN_PERMISSIONS),
      };
      
      return mockUser;
    }
    
    if (error || !user) {
      return null;
    }

    const transformedUser = transformSupabaseUser(user);
    if (!transformedUser) {
      return null;
    }

    // Get admin role from Supabase (source of truth)
    const adminRole = await getUserAdminRole(user.id);
    const isSuperAdmin = adminRole === 'super_admin';

    const permissions = ROLE_PERMISSIONS[adminRole] || [];

    return {
      ...transformedUser,
      isSuperAdmin,
      adminRole,
      permissions,
    };
  } catch (error) {
    console.error('[ADMIN] getAdminUser error:', error);
    return null;
  }
}

/**
 * Require admin user (redirects if not admin)
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    throw new Error('Admin access required');
  }
  return adminUser;
}
