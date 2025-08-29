import 'server-only';
import { redirect } from 'next/navigation';
import type { AdminUser, AdminRole } from '@/lib/admin/types';
import { requireAdminUser, getAdminUser } from './admin-auth';
import { hasPermission, hasMinimumAdminLevel } from './admin-utils';
import { throwAdminError, secureLog } from './security';
import { getRequestId, setRequestId } from './memo';

// Runtime guard for Node-only features
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') {
  throw new Error('[ADMIN] Canonical auth requires Node.js runtime. Add "export const runtime = \'nodejs\'" to your route.');
}

/**
 * Require admin authentication for page components
 * Redirects to signin if not authenticated, to home if not admin
 */
export async function requireAdminAuth(): Promise<AdminUser> {
  // Set request ID for correlation
  setRequestId(crypto.randomUUID?.() ?? String(Date.now()));
  
  try {
    const adminUser = await getAdminUser();
    
    if (!adminUser) {
      secureLog('info', 'ADMIN', {
        code: 'CANONICAL_AUTH_REDIRECT',
        reason: 'not_admin',
        requestId: getRequestId()
      });
      
      // Redirect to signin for unauthenticated users
      // This will be caught by Next.js and handled appropriately
      redirect('/auth/signin?reason=admin_required');
    }
    
    return adminUser;
  } catch (error) {
    secureLog('error', 'ADMIN', {
      code: 'CANONICAL_AUTH_ERROR',
      requestId: getRequestId(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Redirect to home page on auth error
    redirect('/?error=auth_failed');
  }
}

/**
 * Check admin authentication without redirecting
 * Returns null if not admin, user if admin
 */
export async function checkAdminAuth(): Promise<AdminUser | null> {
  // Set request ID for correlation
  setRequestId(crypto.randomUUID?.() ?? String(Date.now()));
  
  try {
    return await getAdminUser();
  } catch (error) {
    secureLog('error', 'ADMIN', {
      code: 'CHECK_ADMIN_AUTH_ERROR',
      requestId: getRequestId(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Require specific admin permission
 * Throws if user doesn't have the permission
 */
export async function requireAdminPermission(permission: string): Promise<AdminUser> {
  // Set request ID for correlation
  setRequestId(crypto.randomUUID?.() ?? String(Date.now()));
  
  const adminUser = await requireAdminUser();
  
  if (!hasPermission(adminUser, permission)) {
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
  // Set request ID for correlation
  setRequestId(crypto.randomUUID?.() ?? String(Date.now()));
  
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
  // Set request ID for correlation
  setRequestId(crypto.randomUUID?.() ?? String(Date.now()));
  
  const adminUser = await requireAdminUser();
  
  // Check permissions
  if (options.permissions) {
    const missingPerms = options.permissions.filter(perm => !hasPermission(adminUser, perm));
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
  // Set request ID for correlation
  setRequestId(crypto.randomUUID?.() ?? String(Date.now()));
  
  return await requireAdminUser();
}

/**
 * Legacy function for backwards compatibility (feature flagged)
 * DO NOT USE - will be removed
 */
export async function requireAdminAuthLegacy(): Promise<AdminUser> {
  if (process.env.ADMIN_LEGACY_AUTH !== 'true') {
    throw new Error('[ADMIN] Legacy auth function disabled. Use requireAdminAuth() instead.');
  }
  
  console.warn('[ADMIN] requireAdminAuthLegacy is deprecated. Use requireAdminAuth() instead.');
  
  return await requireAdminAuth();
}