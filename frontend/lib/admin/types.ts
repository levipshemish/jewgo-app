import { TransformedUser } from '@/lib/utils/auth-utils';

/**
 * Admin role hierarchy from lowest to highest privilege
 */
export type AdminRole = 'moderator' | 'data_admin' | 'system_admin' | 'super_admin';

/**
 * Enhanced user type with guaranteed admin fields
 * Extends TransformedUser with non-null admin properties
 */
export type AdminUser = TransformedUser & {
  /** Admin role (guaranteed non-null for AdminUser) */
  adminRole: AdminRole;
  /** Numeric role level (1-4, higher = more privileges) */
  roleLevel: number;
  /** True if user has super admin privileges */
  isSuperAdmin: boolean;
  /** Array of permission strings (normalized to lowercase) */
  permissions: string[];
};

/**
 * All available admin permissions
 * Use these constants from @/lib/server/admin-constants
 */
export type AdminPermission = 
  // Restaurant management
  | 'restaurant:view'
  | 'restaurant:edit'
  | 'restaurant:delete'
  | 'restaurant:approve'
  | 'restaurant:reject'
  | 'restaurant:moderate'
  // Review management
  | 'review:view'
  | 'review:moderate'
  | 'review:delete'
  // User management
  | 'user:view'
  | 'user:edit'
  | 'user:delete'
  // Image management
  | 'image:view'
  | 'image:edit'
  | 'image:delete'
  // System administration
  | 'system:settings'
  | 'system:view'
  | 'system:edit'
  | 'audit:view'
  | 'audit:delete'
  // Operations
  | 'bulk:operations'
  | 'data:export'
  // Role management
  | 'role:view'
  | 'role:edit'
  | 'role:delete'
  // Content management
  | 'synagogue:view'
  | 'kosher_place:view'
  // Analytics
  | 'analytics:view';

/**
 * Role hierarchy type
 */
export type RoleHierarchy = {
  readonly MODERATOR: 1;
  readonly DATA_ADMIN: 2;
  readonly SYSTEM_ADMIN: 3;
  readonly SUPER_ADMIN: 4;
};

/**
 * Minimum role levels type
 */
export type MinRoleLevels = {
  readonly VIEW_RESTAURANTS: 1;
  readonly EDIT_RESTAURANTS: 2;
  readonly DELETE_RESTAURANTS: 3;
  readonly MANAGE_USERS: 3;
  readonly SYSTEM_SETTINGS: 3;
  readonly MANAGE_ROLES: 4;
};

/**
 * Admin summary type for logging
 */
export type AdminSummary = {
  isAdmin: boolean;
  role: string | null;
  level: number;
  isSuperAdmin: boolean;
  permissionCount: number;
  uid_hash?: string;
};

/**
 * Admin validation result type
 */
export type AdminValidationResult = {
  isValid: boolean;
  reason?: string;
  code?: string;
};

/**
 * Permission validation result type
 */
export type PermissionValidationResult = {
  permissions: string[];
  hasUnknown: boolean;
  fallbackUsed: boolean;
};

/**
 * MIGRATION NOTE:
 * 
 * Constants have been moved to separate files:
 * - Server-only: @/lib/server/admin-constants
 * - Client-safe: @/lib/shared/admin-constants (if needed)
 * 
 * Old usage:
 * ```typescript
 * import { ADMIN_PERMISSIONS } from '@/lib/admin/types';
 * ```
 * 
 * New usage:
 * ```typescript
 * // Server-side
 * import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
 * 
 * // Types only
 * import { AdminUser, AdminRole } from '@/lib/admin/types';
 * ```
 */
