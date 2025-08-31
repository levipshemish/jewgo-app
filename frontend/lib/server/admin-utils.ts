import 'server-only';
import type { TransformedUser } from '@/lib/utils/auth-utils';
import type { AdminUser, AdminRole, AdminSummary } from '@/lib/admin/types';
import { 
  ADMIN_PERMISSIONS, 
  ROLE_PERMISSIONS,
  getRoleLevelForRole,
  getAllPermissions 
} from './admin-constants';
import { secureLog, hashUserId, normalizePermission } from './security';
import { getRequestId } from './memo';

// Local Permission type definition using admin constants
type Permission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

// Runtime guard for Node-only features
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('[ADMIN] Admin utils require Node.js runtime. Add "export const runtime = \'nodejs\'" to your route.');
}

/**
 * Check if user is an admin (has any admin role)
 */
export function isAdmin(user: TransformedUser | null): user is AdminUser {
  if (!user) { return false; }
  return !!(user.adminRole && (user.roleLevel || 0) > 0);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AdminUser, permission: Permission): boolean {
  if (!user || !user.permissions) { return false; }
  const normalizedPermission = normalizePermission(permission);
  const normalizedUserPermissions = user.permissions.map(normalizePermission);
  return normalizedUserPermissions.includes(normalizedPermission) || user.isSuperAdmin;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AdminUser, permissions: Permission[]): boolean {
  if (!user || !user.permissions) { return false; }
  if (user.isSuperAdmin) { return true; }
  const normalizedPermissions = permissions.map(normalizePermission);
  const normalizedUserPermissions = user.permissions.map(normalizePermission);
  return normalizedPermissions.some(perm => normalizedUserPermissions.includes(perm));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AdminUser, permissions: Permission[]): boolean {
  if (!user || !user.permissions) { return false; }
  if (user.isSuperAdmin) { return true; }
  const normalizedPermissions = permissions.map(normalizePermission);
  const normalizedUserPermissions = user.permissions.map(normalizePermission);
  return normalizedPermissions.every(perm => normalizedUserPermissions.includes(perm));
}

/**
 * Check if user has minimum admin level
 */
export function hasMinimumAdminLevel(user: TransformedUser | null, minLevel: number): boolean {
  if (!user || !isAdmin(user)) { return false; }
  return (user.roleLevel || 0) >= minLevel;
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: TransformedUser | null): boolean {
  if (!user) { return false; }
  return user.isSuperAdmin === true || user.adminRole === 'super_admin';
}

/**
 * Get user's admin role
 */
export function getAdminRole(user: TransformedUser | null): AdminRole | null {
  if (!user || !isAdmin(user)) { return null; }
  return user.adminRole;
}

/**
 * Get user's role level
 */
export function getRoleLevel(user: TransformedUser | null): number {
  if (!user) { return 0; }
  return user.roleLevel || 0;
}

/**
 * Get user's permissions array
 */
export function getUserPermissions(user: TransformedUser | null): Permission[] {
  if (!user || !isAdmin(user)) { return []; }
  return user.permissions || [];
}

/**
 * Assert user is admin (throws if not)
 */
export function assertIsAdmin(user: TransformedUser | null): asserts user is AdminUser {
  if (!isAdmin(user)) {
    secureLog('warn', 'ADMIN', {
      code: 'ASSERT_IS_ADMIN_FAILED',
      hasUser: !!user,
      requestId: getRequestId()
    });
    throw new Error('User is not an admin');
  }
}

/**
 * Get admin summary for logging
 */
export function getAdminSummary(user: TransformedUser | null): AdminSummary {
  if (!user) {
    return {
      isAdmin: false,
      role: null,
      level: 0,
      isSuperAdmin: false,
      permissionCount: 0
    };
  }

  const adminCheck = isAdmin(user);
  
  return {
    isAdmin: adminCheck,
    role: adminCheck ? user.adminRole : null,
    level: user.roleLevel || 0,
    isSuperAdmin: user.isSuperAdmin || false,
    permissionCount: adminCheck ? (user.permissions?.length || 0) : 0,
    uid_hash: hashUserId(user.id)
  };
}

/**
 * Validate admin action with permission check
 */
export function validateAdminAction(
  user: TransformedUser | null,
  requiredPermission: Permission,
  action: string
): { valid: boolean; reason?: string; code?: string } {
  if (!user) {
    return { valid: false, reason: 'No user provided', code: 'NO_USER' };
  }

  if (!isAdmin(user)) {
    return { valid: false, reason: 'User is not an admin', code: 'NOT_ADMIN' };
  }

  if (!hasPermission(user, requiredPermission)) {
    secureLog('warn', 'ADMIN', {
      code: 'PERMISSION_DENIED',
      action,
      requiredPermission,
      userRole: user.adminRole,
      requestId: getRequestId()
    });
    
    return { 
      valid: false, 
      reason: `Missing permission: ${requiredPermission}`, 
      code: 'INSUFFICIENT_PERMISSIONS' 
    };
  }

  return { valid: true };
}

/**
 * Migration helper: check admin status with fallback
 */
export function migrateAdminCheck(user: TransformedUser | null): {
  isAdmin: boolean;
  method: 'role_based' | 'email_fallback' | 'no_access';
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!user) {
    return { isAdmin: false, method: 'no_access', warnings };
  }

  // Try role-based check first
  if (user.adminRole && (user.roleLevel || 0) > 0) {
    return { isAdmin: true, method: 'role_based', warnings };
  }

  // Fallback to email check with strong warning
  if (user.email?.endsWith('@jewgo.com')) {
    warnings.push('Using deprecated email-based admin check - migrate to role-based system');
    
    secureLog('warn', 'ADMIN', {
      code: 'EMAIL_FALLBACK_USED',
      email: user.email.replace(/@.*/, '@***'),
      requestId: getRequestId()
    });
    
    return { isAdmin: true, method: 'email_fallback', warnings };
  }

  return { isAdmin: false, method: 'no_access', warnings };
}

/**
 * Get permission by category for development
 */
export function getPermissionsByCategory(category: string): string[] {
  const categoryMap: Record<string, string[]> = {
    restaurant: [
      ADMIN_PERMISSIONS.RESTAURANT_VIEW,
      ADMIN_PERMISSIONS.RESTAURANT_EDIT,
      ADMIN_PERMISSIONS.RESTAURANT_DELETE,
      ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
      ADMIN_PERMISSIONS.RESTAURANT_REJECT,
      ADMIN_PERMISSIONS.RESTAURANT_MODERATE,
    ],
    review: [
      ADMIN_PERMISSIONS.REVIEW_VIEW,
      ADMIN_PERMISSIONS.REVIEW_MODERATE,
      ADMIN_PERMISSIONS.REVIEW_DELETE,
    ],
    user: [
      ADMIN_PERMISSIONS.USER_VIEW,
      ADMIN_PERMISSIONS.USER_EDIT,
      ADMIN_PERMISSIONS.USER_DELETE,
    ],
    system: [
      ADMIN_PERMISSIONS.SYSTEM_SETTINGS,
      ADMIN_PERMISSIONS.SYSTEM_VIEW,
      ADMIN_PERMISSIONS.SYSTEM_EDIT,
      ADMIN_PERMISSIONS.AUDIT_VIEW,
      ADMIN_PERMISSIONS.AUDIT_DELETE,
    ]
  };

  return categoryMap[category] || [];
}

/**
 * Check if permission string is valid
 */
export function isValidPermission(permission: string): permission is Permission {
  return getAllPermissions().includes(permission);
}

/**
 * Filter permissions to only valid ones
 */
export function filterValidPermissions(permissions: string[]): Permission[] {
  const validPerms = getAllPermissions();
  return permissions.filter(perm => validPerms.includes(perm)) as Permission[];
}