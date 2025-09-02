import { NextRequest } from 'next/server';
import { requireAdminOrThrow } from './admin-auth';

// Helper function to throw forbidden errors with proper status
function forbidden(message: string): never {
  const error = new Error(message);
  (error as any).status = 403;
  throw error;
}

// Role hierarchy levels
export const ROLE_LEVELS = {
  moderator: 1,
  data_admin: 2,
  system_admin: 3,
  super_admin: 4,
} as const;

// Permission mappings
export const ROLE_PERMISSIONS = {
  moderator: [
    'content:moderate',
    'user:view',
    'review:moderate',
  ],
  data_admin: [
    'data:view',
    'data:export',
    'analytics:view',
    'report:generate',
  ],
  system_admin: [
    'user:manage',
    'system:configure',
    'admin:manage',
    'security:manage',
  ],
  super_admin: [
    'role:manage',
    'admin:all',
    'system:all',
  ],
} as const;

// Permission inheritance - higher roles inherit lower role permissions
const _permCache = new Map<keyof typeof ROLE_LEVELS, string[]>();
const getAllPermissionsForRole = (role: keyof typeof ROLE_LEVELS): string[] => {
  const cached = _permCache.get(role);
  if (cached) return cached;
  const roleLevel = ROLE_LEVELS[role];
  const permissions: string[] = [];
  Object.entries(ROLE_LEVELS).forEach(([roleName, level]) => {
    if (level <= roleLevel) {
      permissions.push(...ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS]);
    }
  });
  const deduped = Array.from(new Set(permissions));
  _permCache.set(role, deduped);
  return deduped;
};

// Higher-order function for minimum role level validation
export function withMinRole(minRoleLevel: number) {
  return async function(request: NextRequest) {
    const admin = await requireAdminOrThrow(request);
    
    // Prefer standardized admin.adminRole; legacy admin.role kept for backward-compat
    const userRole = (admin as any).adminRole || (admin as any).role; // TODO: drop fallback once all callers normalized
    const userRoleLevel = ROLE_LEVELS[userRole as keyof typeof ROLE_LEVELS] || 0;
    
    if (userRoleLevel < minRoleLevel) {
      forbidden(`Insufficient permissions. Required role level: ${minRoleLevel}, User role level: ${userRoleLevel}`);
    }
    
    return admin;
  };
}

// Higher-order function for specific permission validation
export function withPermission(requiredPermission: string) {
  return async function(request: NextRequest) {
    const admin = await requireAdminOrThrow(request);
    
    // Super admin has all permissions
    const userRole = (admin as any).adminRole || (admin as any).role; // TODO legacy fallback
    if (userRole === 'super_admin') {
      return admin;
    }
    
    // Get user's permissions
    const userPermissions = getAllPermissionsForRole(userRole as keyof typeof ROLE_LEVELS);
    
    // Check if user has the required permission
    const reqLower = requiredPermission.toLowerCase();
    const hasPermission = userPermissions.some(permission => {
      const permLower = permission.toLowerCase();
      // Handle wildcard permissions (both :* and :all)
      if (permLower.endsWith(':*')) {
        const basePermission = permLower.slice(0, -2);
        return reqLower.startsWith(basePermission);
      }
      if (permLower.endsWith(':all')) {
        const basePermission = permLower.slice(0, -4);
        return reqLower.startsWith(basePermission);
      }
      return permLower === reqLower;
    });
    
    if (!hasPermission) {
      forbidden(`Insufficient permissions. Required: ${requiredPermission}`);
    }
    
    return admin;
  };
}

// Higher-order function for any permission validation (OR logic)
export function withAnyPermission(requiredPermissions: string[]) {
  return async function(request: NextRequest) {
    const admin = await requireAdminOrThrow(request);
    
    // Super admin has all permissions
    const userRole = admin.adminRole || admin.role;
    if (userRole === 'super_admin') {
      return admin;
    }
    
    // Get user's permissions
    const userPermissions = getAllPermissionsForRole(userRole as keyof typeof ROLE_LEVELS);
    
    // Check if user has at least one of the required permissions
    const hasAnyPermission = requiredPermissions.some(requiredPermission => {
      const reqLower = requiredPermission.toLowerCase();
      return userPermissions.some(permission => {
        const permLower = permission.toLowerCase();
        if (permLower.endsWith(':*')) {
          const basePermission = permLower.slice(0, -2);
          return reqLower.startsWith(basePermission);
        }
        if (permLower.endsWith(':all')) {
          const basePermission = permLower.slice(0, -4);
          return reqLower.startsWith(basePermission);
        }
        return permLower === reqLower;
      });
    });
    
    if (!hasAnyPermission) {
      forbidden(`Insufficient permissions. Required one of: ${requiredPermissions.join(', ')}`);
    }
    
    return admin;
  };
}

// Route protection helpers
export const requireModerator = withMinRole(ROLE_LEVELS.moderator);
export const requireDataAdmin = withMinRole(ROLE_LEVELS.data_admin);
export const requireSystemAdmin = withMinRole(ROLE_LEVELS.system_admin);
export const requireSuperAdmin = withMinRole(ROLE_LEVELS.super_admin);

// Specific permission helpers
export const requireUserManage = withPermission('user:manage');
export const requireRoleManage = withPermission('role:manage');
export const requireSystemConfigure = withPermission('system:configure');
export const requireSecurityManage = withPermission('security:manage');
export const requireDataExport = withPermission('data:export');
export const requireContentModerate = withPermission('content:moderate');

// Utility functions
export function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role as keyof typeof ROLE_LEVELS] || 0;
}

export function getRolePermissions(role: string): string[] {
  return getAllPermissionsForRole(role as keyof typeof ROLE_LEVELS);
}

export function hasPermission(userRole: string, requiredPermission: string): boolean {
  if (userRole === 'super_admin') return true;
  
  const userPermissions = getAllPermissionsForRole(userRole as keyof typeof ROLE_LEVELS);
  
  const reqLower = requiredPermission.toLowerCase();
  return userPermissions.some(permission => {
    const permLower = permission.toLowerCase();
    if (permLower.endsWith(':*')) {
      const basePermission = permLower.slice(0, -2);
      return reqLower.startsWith(basePermission);
    }
    if (permLower.endsWith(':all')) {
      const basePermission = permLower.slice(0, -4);
      return reqLower.startsWith(basePermission);
    }
    return permLower === reqLower;
  });
}

export function hasMinRoleLevel(userRole: string, minRoleLevel: number): boolean {
  const userRoleLevel = getRoleLevel(userRole);
  return userRoleLevel >= minRoleLevel;
}

// Optional helpers: normalize permission wildcards to a single standard (:* only)
// These are non-breaking utilities that callers can use to cleanup role maps/data.

/**
 * Normalize a single permission wildcard by converting ":all" suffix to ":*".
 * Examples: "admin:all" -> "admin:*", "system:*" -> "system:*" (unchanged)
 */
export function normalizeWildcardPermission(permission: string): string {
  if (typeof permission !== 'string') return permission as any;
  if (permission.endsWith(':all')) return permission.slice(0, -4) + ':*';
  return permission;
}

/**
 * Normalize a list of permissions to use only ":*" wildcards and dedupe results.
 */
export function normalizePermissionList(permissions: string[]): string[] {
  const out = (permissions || []).map(normalizeWildcardPermission);
  return Array.from(new Set(out));
}

/**
 * Normalize a role->permissions map to replace all ":all" with ":*" and dedupe.
 */
export function normalizeRolePermissionMap<T extends Record<string, string[]>>(roleMap: T): T {
  const entries = Object.entries(roleMap || {}).map(([role, perms]) => [
    role,
    normalizePermissionList(perms || []),
  ] as const);
  return Object.fromEntries(entries) as T;
}

// Development helpers
export function debugPermissions(userRole: string) {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('debugPermissions is only available in development mode');
    return;
  }
  
  console.log(`=== Permission Debug for ${userRole} ===`);
  console.log('Role Level:', getRoleLevel(userRole));
  console.log('Permissions:', getRolePermissions(userRole));
  console.log('=====================================');
}

// Type definitions
export type RoleType = keyof typeof ROLE_LEVELS;
export type PermissionType = string;

export interface RBACContext {
  user: {
    id: string;
    role: RoleType;
    roleLevel: number;
    permissions: string[];
  };
  hasPermission: (permission: PermissionType) => boolean;
  hasMinRole: (role: RoleType) => boolean;
}

// Create RBAC context for use in components
export function createRBACContext(userRole: string, userId: string): RBACContext {
  const roleLevel = getRoleLevel(userRole);
  const permissions = getRolePermissions(userRole);
  
  return {
    user: {
      id: userId,
      role: userRole as RoleType,
      roleLevel,
      permissions,
    },
    hasPermission: (permission: PermissionType) => hasPermission(userRole, permission),
    hasMinRole: (role: RoleType) => hasMinRoleLevel(userRole, ROLE_LEVELS[role]),
  };
}
