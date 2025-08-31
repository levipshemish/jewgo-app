import 'server-only';
import { randomUUID } from 'node:crypto';
import type { AdminUser, AdminRole } from '@/lib/admin/types';
import { 
  hasPermission, 
  hasMinimumAdminLevel
} from './admin-utils';
import { 
  requireAdminUser,
  requireAdminOrThrow 
} from './admin-auth';
import { 
  assertNodeRuntime,
  secureLog,
  throwAdminError
} from './security';
import { getRequestId, setRequestId } from './memo';

// Local Permission type definition
type Permission = string;

/**
 * Require admin authentication
 * Throws if user is not an admin
 */
export async function requireAdminAuth(request: Request): Promise<AdminUser> {
  assertNodeRuntime();
  // Set request ID for correlation
  setRequestId(randomUUID() ?? String(Date.now()));
  
  return requireAdminOrThrow(request);
}

/**
 * Check admin authentication (returns null on failure)
 */
export async function checkAdminAuth(request: Request): Promise<AdminUser | null> {
  assertNodeRuntime();
  // Set request ID for correlation
  setRequestId(randomUUID() ?? String(Date.now()));
  
  try {
    return await requireAdminOrThrow(request);
  } catch {
    return null;
  }
}

/**
 * Require specific admin permission
 * Throws if user doesn't have the permission
 */
export async function requireAdminPermission(permission: string): Promise<AdminUser> {
  assertNodeRuntime();
  // Set request ID for correlation
  setRequestId(randomUUID() ?? String(Date.now()));
  
  const adminUser = await requireAdminUser();
  
  if (!hasPermission(adminUser, permission as any)) {
    secureLog('warn', 'ADMIN', {
      code: 'CANONICAL_PERMISSION_DENIED',
      permission,
      userRole: adminUser.adminRole,
      requestId: getRequestId()
    });
    
    throwAdminError(
      'INSUFFICIENT_PERMISSIONS',
      `Missing required permission: ${permission}`,
      403,
      { permission, userRole: adminUser.adminRole }
    );
  }
  
  return adminUser;
}

/**
 * Require minimum role level
 * Throws if user doesn't meet minimum level
 */
export async function requireMinimumRoleLevel(minLevel: number): Promise<AdminUser> {
  assertNodeRuntime();
  // Set request ID for correlation
  setRequestId(randomUUID() ?? String(Date.now()));
  
  const adminUser = await requireAdminUser();
  
  if (!hasMinimumAdminLevel(adminUser, minLevel)) {
    secureLog('warn', 'ADMIN', {
      code: 'CANONICAL_ROLE_LEVEL_DENIED',
      minLevel,
      userLevel: adminUser.roleLevel,
      userRole: adminUser.adminRole,
      requestId: getRequestId()
    });
    
    throwAdminError(
      'INSUFFICIENT_ROLE_LEVEL',
      `Minimum role level ${minLevel} required`,
      403,
      { minLevel, userLevel: adminUser.roleLevel }
    );
  }
  
  return adminUser;
}

/**
 * Validate admin access with multiple criteria
 */
export async function validateAdminAccess(options: {
  permissions?: string[];
  minRoleLevel?: number;
  allowedRoles?: AdminRole[];
}): Promise<AdminUser> {
  assertNodeRuntime();
  // Set request ID for correlation
  setRequestId(randomUUID() ?? String(Date.now()));
  
  const adminUser = await requireAdminUser();
  
  // Check permissions
  if (options.permissions) {
    const missingPerms = options.permissions.filter(perm => !hasPermission(adminUser, perm as any));
    if (missingPerms.length > 0) {
      secureLog('warn', 'ADMIN', {
        code: 'CANONICAL_VALIDATE_PERMS_FAILED',
        missingPermissions: missingPerms,
        userRole: adminUser.adminRole,
        requestId: getRequestId()
      });
      
      throwAdminError(
        'MISSING_PERMISSIONS',
        `Missing permissions: ${missingPerms.join(', ')}`,
        403,
        { missingPermissions: missingPerms }
      );
    }
  }
  
  // Check minimum role level
  if (options.minRoleLevel && !hasMinimumAdminLevel(adminUser, options.minRoleLevel)) {
    secureLog('warn', 'ADMIN', {
      code: 'CANONICAL_VALIDATE_LEVEL_FAILED',
      minLevel: options.minRoleLevel,
      userLevel: adminUser.roleLevel,
      requestId: getRequestId()
    });
    
    throwAdminError(
      'INSUFFICIENT_ROLE_LEVEL',
      `Minimum role level ${options.minRoleLevel} required`,
      403,
      { minLevel: options.minRoleLevel, userLevel: adminUser.roleLevel }
    );
  }
  
  // Check allowed roles
  if (options.allowedRoles && !options.allowedRoles.includes(adminUser.adminRole)) {
    secureLog('warn', 'ADMIN', {
      code: 'CANONICAL_VALIDATE_ROLE_FAILED',
      allowedRoles: options.allowedRoles,
      userRole: adminUser.adminRole,
      requestId: getRequestId()
    });
    
    throwAdminError(
      'ROLE_NOT_ALLOWED',
      `Role ${adminUser.adminRole} not in allowed roles`,
      403,
      { allowedRoles: options.allowedRoles, userRole: adminUser.adminRole }
    );
  }
  
  return adminUser;
}

/**
 * Assert user is admin (for type narrowing)
 */
export async function assertAdminUser(): Promise<AdminUser> {
  assertNodeRuntime();
  // Set request ID for correlation
  setRequestId(randomUUID() ?? String(Date.now()));
  
  return await requireAdminUser();
}

/**
 * Legacy function for backwards compatibility (feature flagged)
 * DO NOT USE - will be removed
 */
export async function requireAdminAuthLegacy(request?: Request): Promise<AdminUser> {
  if (process.env.ADMIN_LEGACY_AUTH !== 'true') {
    throw new Error('[ADMIN] Legacy auth function disabled. Use requireAdminAuth() instead.');
  }
  
  console.warn('[ADMIN] requireAdminAuthLegacy is deprecated. Use requireAdminAuth() instead.');
  
  return await requireAdminAuth(request!);
}