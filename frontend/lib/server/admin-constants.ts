import 'server-only';
import type { AdminRole } from '@/lib/admin/types';

// Runtime guard for Node-only usage
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('[ADMIN] Admin constants require Node.js runtime. Add "export const runtime = \'nodejs\'" to your route.');
}

// Permission definitions (server-only)
export const ADMIN_PERMISSIONS = {
  // Restaurant management
  RESTAURANT_VIEW: 'restaurant:view',
  RESTAURANT_EDIT: 'restaurant:edit',
  RESTAURANT_DELETE: 'restaurant:delete',
  RESTAURANT_APPROVE: 'restaurant:approve',
  RESTAURANT_REJECT: 'restaurant:reject',
  RESTAURANT_MODERATE: 'restaurant:moderate',
  
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
  SYSTEM_VIEW: 'system:view',
  SYSTEM_EDIT: 'system:edit',
  AUDIT_VIEW: 'audit:view',
  AUDIT_DELETE: 'audit:delete',
  
  // Bulk operations
  BULK_OPERATIONS: 'bulk:operations',
  
  // Data export
  DATA_EXPORT: 'data:export',
  
  // Role management
  ROLE_VIEW: 'role:view',
  ROLE_EDIT: 'role:edit',
  ROLE_DELETE: 'role:delete',
  
  // Synagogue management
  SYNAGOGUE_VIEW: 'synagogue:view',
  
  // Kosher place management
  KOSHER_PLACE_VIEW: 'kosher_place:view',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
} as const;

// Role-based permission mapping (server-only)
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  moderator: [
    ADMIN_PERMISSIONS.RESTAURANT_VIEW,
    ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
    ADMIN_PERMISSIONS.RESTAURANT_REJECT,
    ADMIN_PERMISSIONS.REVIEW_VIEW,
    ADMIN_PERMISSIONS.REVIEW_MODERATE,
  ],
  data_admin: [
    ADMIN_PERMISSIONS.RESTAURANT_VIEW,
    ADMIN_PERMISSIONS.RESTAURANT_EDIT,
    ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
    ADMIN_PERMISSIONS.RESTAURANT_REJECT,
    ADMIN_PERMISSIONS.REVIEW_VIEW,
    ADMIN_PERMISSIONS.REVIEW_MODERATE,
    ADMIN_PERMISSIONS.USER_VIEW,
    ADMIN_PERMISSIONS.BULK_OPERATIONS,
    ADMIN_PERMISSIONS.DATA_EXPORT,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
  ],
  system_admin: [
    ADMIN_PERMISSIONS.RESTAURANT_VIEW,
    ADMIN_PERMISSIONS.RESTAURANT_EDIT,
    ADMIN_PERMISSIONS.RESTAURANT_DELETE,
    ADMIN_PERMISSIONS.RESTAURANT_APPROVE,
    ADMIN_PERMISSIONS.RESTAURANT_REJECT,
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

// Role hierarchy constants (server-only)
export const ROLE_HIERARCHY = {
  MODERATOR: 1,
  DATA_ADMIN: 2,
  SYSTEM_ADMIN: 3,
  SUPER_ADMIN: 4
} as const;

// Minimum role levels for common operations (server-only)
export const MIN_ROLE_LEVELS = {
  VIEW_RESTAURANTS: ROLE_HIERARCHY.MODERATOR,
  EDIT_RESTAURANTS: ROLE_HIERARCHY.DATA_ADMIN,
  DELETE_RESTAURANTS: ROLE_HIERARCHY.SYSTEM_ADMIN,
  MANAGE_USERS: ROLE_HIERARCHY.SYSTEM_ADMIN,
  SYSTEM_SETTINGS: ROLE_HIERARCHY.SYSTEM_ADMIN,
  MANAGE_ROLES: ROLE_HIERARCHY.SUPER_ADMIN
} as const;

/**
 * Get all permission values as array
 */
export function getAllPermissions(): string[] {
  return Object.values(ADMIN_PERMISSIONS);
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: AdminRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get role level for a specific role
 */
export function getRoleLevelForRole(role: AdminRole): number {
  const roleLevels: Record<AdminRole, number> = {
    moderator: ROLE_HIERARCHY.MODERATOR,
    data_admin: ROLE_HIERARCHY.DATA_ADMIN,
    system_admin: ROLE_HIERARCHY.SYSTEM_ADMIN,
    super_admin: ROLE_HIERARCHY.SUPER_ADMIN
  };
  return roleLevels[role] || 0;
}

/**
 * Check if role A has higher or equal level than role B
 */
export function isRoleHigherOrEqual(roleA: AdminRole, roleB: AdminRole): boolean {
  return getRoleLevelForRole(roleA) >= getRoleLevelForRole(roleB);
}

/**
 * Validate if string is a valid admin role
 */
export function isValidAdminRole(role: string): role is AdminRole {
  return ['moderator', 'data_admin', 'system_admin', 'super_admin'].includes(role);
}

/**
 * Validate if string is a valid permission
 */
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}

/**
 * Development helper: Get permission by category
 */
export function getPermissionsByCategory(): Record<string, string[]> {
  return {
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
    ],
    operations: [
      ADMIN_PERMISSIONS.BULK_OPERATIONS,
      ADMIN_PERMISSIONS.DATA_EXPORT,
    ],
    roles: [
      ADMIN_PERMISSIONS.ROLE_VIEW,
      ADMIN_PERMISSIONS.ROLE_EDIT,
      ADMIN_PERMISSIONS.ROLE_DELETE,
    ]
  };
}

/**
 * Development helper: Validate role permissions consistency
 */
export function validateRolePermissions(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allPermissions = getAllPermissions();
  
  // Check that all role permissions are valid
  Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
    permissions.forEach(permission => {
      if (!allPermissions.includes(permission)) {
        errors.push(`Role ${role} has invalid permission: ${permission}`);
      }
    });
  });
  
  // Check role hierarchy
  const moderatorPerms = ROLE_PERMISSIONS.moderator;
  const dataAdminPerms = ROLE_PERMISSIONS.data_admin;
  const systemAdminPerms = ROLE_PERMISSIONS.system_admin;
  const superAdminPerms = ROLE_PERMISSIONS.super_admin;
  
  // Data admin should have all moderator permissions
  moderatorPerms.forEach(perm => {
    if (!dataAdminPerms.includes(perm)) {
      errors.push(`data_admin missing moderator permission: ${perm}`);
    }
  });
  
  // System admin should have all data admin permissions
  dataAdminPerms.forEach(perm => {
    if (!systemAdminPerms.includes(perm)) {
      errors.push(`system_admin missing data_admin permission: ${perm}`);
    }
  });
  
  // Super admin should have all permissions
  allPermissions.forEach(perm => {
    if (!superAdminPerms.includes(perm)) {
      errors.push(`super_admin missing permission: ${perm}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}