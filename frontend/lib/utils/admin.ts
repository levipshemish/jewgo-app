import 'server-only';

// DEPRECATED: This file is deprecated and will be removed in the next phase
// Use lib/server/admin-utils.ts instead

console.warn('[ADMIN] lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');

// Import types (safe for server)
import type { TransformedUser } from '@/lib/utils/auth-utils';

// Re-export from new server module with deprecation warnings
export async function isAdmin(...args: any[]) {
  console.warn('[ADMIN] isAdmin from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { isAdmin: newIsAdmin } = await import('../server/admin-utils');
  return newIsAdmin(...args);
}

export async function hasAdminPermission(...args: any[]) {
  console.warn('[ADMIN] hasAdminPermission from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { hasAdminPermission: newHasAdminPermission } = await import('../server/admin-utils');
  return newHasAdminPermission(...args);
}

export async function hasMinimumAdminLevel(...args: any[]) {
  console.warn('[ADMIN] hasMinimumAdminLevel from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { hasMinimumAdminLevel: newHasMinimumAdminLevel } = await import('../server/admin-utils');
  return newHasMinimumAdminLevel(...args);
}

export async function isSuperAdmin(...args: any[]) {
  console.warn('[ADMIN] isSuperAdmin from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { isSuperAdmin: newIsSuperAdmin } = await import('../server/admin-utils');
  return newIsSuperAdmin(...args);
}

export async function getAdminRole(...args: any[]) {
  console.warn('[ADMIN] getAdminRole from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { getAdminRole: newGetAdminRole } = await import('../server/admin-utils');
  return newGetAdminRole(...args);
}

export async function getRoleLevel(...args: any[]) {
  console.warn('[ADMIN] getRoleLevel from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { getRoleLevel: newGetRoleLevel } = await import('../server/admin-utils');
  return newGetRoleLevel(...args);
}

export async function getUserPermissions(...args: any[]) {
  console.warn('[ADMIN] getUserPermissions from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { getUserPermissions: newGetUserPermissions } = await import('../server/admin-utils');
  return newGetUserPermissions(...args);
}

export async function assertIsAdmin(...args: any[]) {
  console.warn('[ADMIN] assertIsAdmin from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { assertIsAdmin: newAssertIsAdmin } = await import('../server/admin-utils');
  return newAssertIsAdmin(...args);
}

export async function getAdminSummary(...args: any[]) {
  console.warn('[ADMIN] getAdminSummary from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { getAdminSummary: newGetAdminSummary } = await import('../server/admin-utils');
  return newGetAdminSummary(...args);
}

export async function validateAdminAction(...args: any[]) {
  console.warn('[ADMIN] validateAdminAction from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { validateAdminAction: newValidateAdminAction } = await import('../server/admin-utils');
  return newValidateAdminAction(...args);
}

export async function migrateAdminCheck(...args: any[]) {
  console.warn('[ADMIN] migrateAdminCheck from lib/utils/admin.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { migrateAdminCheck: newMigrateAdminCheck } = await import('../server/admin-utils');
  return newMigrateAdminCheck(...args);
}

// Hard deprecated function with strong warning
export function isAdminEmail(email: string): boolean {
  console.error('[ADMIN] isAdminEmail is deprecated and unsafe. Use isAdmin(user) with TransformedUser instead.');
  
  // Legacy fallback with strong deprecation warning
  if (!email) {
    return false;
  }
  
  // Only check for @jewgo.com domain (remove NEXT_PUBLIC_ADMIN_EMAIL dependency)
  const result = email.endsWith('@jewgo.com');
  
  console.warn('[ADMIN] Email-based admin check used. Migrate to role-based checking immediately.');
  
  return result;
}

/**
 * MIGRATION GUIDE
 * 
 * Old Usage:
 * ```typescript
 * import { isAdmin, hasAdminPermission } from '@/lib/utils/admin';
 * ```
 * 
 * New Usage (Server-only):
 * ```typescript
 * import { isAdmin, hasAdminPermission } from '@/lib/server/admin-utils';
 * ```
 * 
 * For Email-based Checks (DEPRECATED):
 * ```typescript
 * // OLD (deprecated)
 * const isAdminUser = isAdminEmail(user.email);
 * 
 * // NEW (secure)
 * import { isAdmin } from '@/lib/server/admin-utils';
 * const isAdminUser = isAdmin(user); // user is TransformedUser with roles
 * ```
 * 
 * For Permission Checks:
 * ```typescript
 * import { hasPermission, hasAnyPermission } from '@/lib/server/admin-utils';
 * 
 * const canEdit = hasPermission(user, 'restaurant:edit');
 * const canModerate = hasAnyPermission(user, ['review:moderate', 'restaurant:moderate']);
 * ```
 * 
 * For Role Level Checks:
 * ```typescript
 * import { hasMinimumAdminLevel } from '@/lib/server/admin-utils';
 * 
 * const isSystemAdmin = hasMinimumAdminLevel(user, 3);
 * ```
 */
