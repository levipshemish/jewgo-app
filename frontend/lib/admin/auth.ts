import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { transformSupabaseUser, type TransformedUser } from '@/lib/utils/auth-utils';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// Admin permission levels
export type AdminRole = 'moderator' | 'data_admin' | 'system_admin' | 'super_admin';

export interface AdminUser extends TransformedUser {
  isSuperAdmin: boolean;
  adminRole?: AdminRole;
  permissions: string[];
}

// Permission definitions
export const ADMIN_PERMISSIONS = {
  // Restaurant management
  RESTAURANT_VIEW: 'restaurant:view',
  RESTAURANT_EDIT: 'restaurant:edit',
  RESTAURANT_DELETE: 'restaurant:delete',
  RESTAURANT_APPROVE: 'restaurant:approve',
  
  // Review management
  REVIEW_VIEW: 'review:view',
  REVIEW_MODERATE: 'review:moderate',
  REVIEW_DELETE: 'review:delete',
  
  // User management
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  
  // Image management
  IMAGE_VIEW: 'image:view',
  IMAGE_EDIT: 'image:edit',
  IMAGE_DELETE: 'image:delete',
  
  // System administration
  SYSTEM_SETTINGS: 'system:settings',
  AUDIT_VIEW: 'audit:view',
  AUDIT_DELETE: 'audit:delete',
  
  // Bulk operations
  BULK_OPERATIONS: 'bulk:operations',
  
  // Data export
  DATA_EXPORT: 'data:export',
} as const;

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  moderator: [
    ADMIN_PERMISSIONS.RESTAURANT_VIEW,
    ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
    ADMIN_PERMISSIONS.REVIEW_VIEW,
    ADMIN_PERMISSIONS.REVIEW_MODERATE,
  ],
  data_admin: [
    ADMIN_PERMISSIONS.RESTAURANT_VIEW,
    ADMIN_PERMISSIONS.RESTAURANT_EDIT,
    ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
    ADMIN_PERMISSIONS.REVIEW_VIEW,
    ADMIN_PERMISSIONS.REVIEW_MODERATE,
    ADMIN_PERMISSIONS.USER_VIEW,
    ADMIN_PERMISSIONS.BULK_OPERATIONS,
    ADMIN_PERMISSIONS.DATA_EXPORT,
  ],
  system_admin: [
    ADMIN_PERMISSIONS.RESTAURANT_VIEW,
    ADMIN_PERMISSIONS.RESTAURANT_EDIT,
    ADMIN_PERMISSIONS.RESTAURANT_DELETE,
    ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
    ADMIN_PERMISSIONS.REVIEW_VIEW,
    ADMIN_PERMISSIONS.REVIEW_MODERATE,
    ADMIN_PERMISSIONS.REVIEW_DELETE,
    ADMIN_PERMISSIONS.USER_VIEW,
    ADMIN_PERMISSIONS.USER_EDIT,
    ADMIN_PERMISSIONS.SYSTEM_SETTINGS,
    ADMIN_PERMISSIONS.AUDIT_VIEW,
    ADMIN_PERMISSIONS.BULK_OPERATIONS,
    ADMIN_PERMISSIONS.DATA_EXPORT,
  ],
  super_admin: Object.values(ADMIN_PERMISSIONS),
};

/**
 * Get user's admin role from database
 */
async function getUserAdminRole(userId: string): Promise<AdminRole> {
  try {
    // First check if user is super admin in users table
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { issuperadmin: true },
    });

    if (user?.issuperadmin) {
      return 'super_admin';
    }

    // Then check admin_roles table for active role
    const adminRole = await prisma.$queryRaw<[{ role: string }]>`
      SELECT get_user_admin_role(${userId}::VARCHAR(50)) as role
    `;

    if (adminRole && adminRole[0]?.role) {
      return adminRole[0].role as AdminRole;
    }

    // Default to moderator if no role found
    return 'moderator';
  } catch (error) {
    console.error('[ADMIN] Error getting user admin role:', error);
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
    
    if (error || !user) {
      console.error('[ADMIN] Auth error:', error);
      return null;
    }

    // Transform user
    const transformedUser = transformSupabaseUser(user);
    if (!transformedUser) {
      return null;
    }

    // Get admin role from database (source of truth)
    const adminRole = await getUserAdminRole(user.id);
    
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
 * Check if user has specific permission
 */
export function hasPermission(user: AdminUser, permission: string): boolean {
  return user.permissions.includes(permission) || user.isSuperAdmin;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AdminUser, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission)) || user.isSuperAdmin;
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AdminUser, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(user, permission)) || user.isSuperAdmin;
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
    
    if (error || !user) {
      return null;
    }

    const transformedUser = transformSupabaseUser(user);
    if (!transformedUser) {
      return null;
    }

    // Get admin role from database (source of truth)
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
