import { NextRequest } from 'next/server';
import { requireAdminOrThrow } from './admin-auth';

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
const getAllPermissionsForRole = (role: keyof typeof ROLE_LEVELS): string[] => {
  const roleLevel = ROLE_LEVELS[role];
  const permissions: string[] = [];
  
  // Add permissions from current role and all lower roles
  Object.entries(ROLE_LEVELS).forEach(([roleName, level]) => {
    if (level <= roleLevel) {
      permissions.push(...ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS]);
    }
  });
  
  return Array.from(new Set(permissions)); // Remove duplicates
};

// Higher-order function for minimum role level validation
export function withMinRole(minRoleLevel: number) {
  return async function(request: NextRequest) {
    const admin = await requireAdminOrThrow(request);
    
    // Get user's role level
    const userRoleLevel = ROLE_LEVELS[admin.role as keyof typeof ROLE_LEVELS] || 0;
    
    if (userRoleLevel < minRoleLevel) {
      throw new Error(`Insufficient permissions. Required role level: ${minRoleLevel}, User role level: ${userRoleLevel}`);
    }
    
    return admin;
  };
}

// Higher-order function for specific permission validation
export function withPermission(requiredPermission: string) {
  return async function(request: NextRequest) {
    const admin = await requireAdminOrThrow(request);
    
    // Super admin has all permissions
    if (admin.role === 'super_admin') {
      return admin;
    }
    
    // Get user's permissions
    const userPermissions = getAllPermissionsForRole(admin.role as keyof typeof ROLE_LEVELS);
    
    // Check if user has the required permission
    const hasPermission = userPermissions.some(permission => {
      // Handle wildcard permissions
      if (permission.endsWith(':*')) {
        const basePermission = permission.slice(0, -2);
        return requiredPermission.startsWith(basePermission);
      }
      return permission === requiredPermission;
    });
    
    if (!hasPermission) {
      throw new Error(`Insufficient permissions. Required: ${requiredPermission}`);
    }
    
    return admin;
  };
}

// Higher-order function for any permission validation (OR logic)
export function withAnyPermission(requiredPermissions: string[]) {
  return async function(request: NextRequest) {
    const admin = await requireAdminOrThrow(request);
    
    // Super admin has all permissions
    if (admin.role === 'super_admin') {
      return admin;
    }
    
    // Get user's permissions
    const userPermissions = getAllPermissionsForRole(admin.role as keyof typeof ROLE_LEVELS);
    
    // Check if user has at least one of the required permissions
    const hasAnyPermission = requiredPermissions.some(requiredPermission => {
      return userPermissions.some(permission => {
        // Handle wildcard permissions
        if (permission.endsWith(':*')) {
          const basePermission = permission.slice(0, -2);
          return requiredPermission.startsWith(basePermission);
        }
        return permission === requiredPermission;
      });
    });
    
    if (!hasAnyPermission) {
      throw new Error(`Insufficient permissions. Required one of: ${requiredPermissions.join(', ')}`);
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
  
  return userPermissions.some(permission => {
    if (permission.endsWith(':*')) {
      const basePermission = permission.slice(0, -2);
      return requiredPermission.startsWith(basePermission);
    }
    return permission === requiredPermission;
  });
}

export function hasMinRoleLevel(userRole: string, minRoleLevel: number): boolean {
  const userRoleLevel = getRoleLevel(userRole);
  return userRoleLevel >= minRoleLevel;
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
