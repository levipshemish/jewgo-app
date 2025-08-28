import { TransformedUser } from '@/lib/utils/auth-utils';

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
} as const;

// Role-based permission mapping
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

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AdminUser, permission: string): boolean {
  return user.permissions.includes(permission) || user.isSuperAdmin;
}
