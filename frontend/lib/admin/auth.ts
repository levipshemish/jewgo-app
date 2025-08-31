import 'server-only';

// DEPRECATED: This file is deprecated and will be removed in the next phase
// Use the new server-only modules instead:
// - lib/server/admin-auth.ts for server-side admin authentication
// - lib/server/admin-utils.ts for admin utility functions
// - lib/server/canonical-auth.ts for canonical admin authentication

// Deprecation warning will be shown when functions are called

// Re-export types only (safe for client)
export type { AdminUser, AdminRole } from './types';

// Hard deprecated function - throws error immediately
export function getAdminRole(userId: string): never {
  console.error('[ADMIN] getAdminRole(userId) is deprecated and unsafe. Use getAdminRoleFromSession() instead.');
  throw new Error('[ADMIN] getAdminRole(userId) is deprecated. Use getAdminRoleFromSession() from lib/server/admin-auth.ts instead.');
}

// Re-export from new server module with deprecation warnings
export async function requireAdmin(request: any) {
  console.warn('[ADMIN] requireAdmin from lib/admin/auth.ts is deprecated. Use lib/server/admin-auth.ts instead.');
  const { requireAdmin: newRequireAdmin } = await import('../server/admin-auth');
  return newRequireAdmin(request);
}

export async function requireAdminOrThrow(request: any) {
  console.warn('[ADMIN] requireAdminOrThrow from lib/admin/auth.ts is deprecated. Use lib/server/admin-auth.ts instead.');
  const { requireAdminOrThrow: newRequireAdminOrThrow } = await import('../server/admin-auth');
  return newRequireAdminOrThrow(request);
}

export async function getAdminUser() {
  console.warn('[ADMIN] getAdminUser from lib/admin/auth.ts is deprecated. Use lib/server/admin-auth.ts instead.');
  const { getAdminUser: newGetAdminUser } = await import('../server/admin-auth');
  return newGetAdminUser();
}

export async function requireAdminUser() {
  console.warn('[ADMIN] requireAdminUser from lib/admin/auth.ts is deprecated. Use lib/server/admin-auth.ts instead.');
  const { requireAdminUser: newRequireAdminUser } = await import('../server/admin-auth');
  return newRequireAdminUser();
}

export async function getAdminRoleFromSession() {
  console.warn('[ADMIN] getAdminRoleFromSession from lib/admin/auth.ts is deprecated. Use lib/server/admin-auth.ts instead.');
  const { getAdminRoleFromSession: newGetAdminRoleFromSession } = await import('../server/admin-auth');
  return newGetAdminRoleFromSession();
}

// Re-export utility functions with deprecation warnings
export async function hasAnyPermission(user: any, permissions: any[]) {
  console.warn('[ADMIN] hasAnyPermission from lib/admin/auth.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { hasAnyPermission: newHasAnyPermission } = await import('../server/admin-utils');
  return newHasAnyPermission(user, permissions);
}

export async function hasAllPermissions(user: any, permissions: any[]) {
  console.warn('[ADMIN] hasAllPermissions from lib/admin/auth.ts is deprecated. Use lib/server/admin-utils.ts instead.');
  const { hasAllPermissions: newHasAllPermissions } = await import('../server/admin-utils');
  return newHasAllPermissions(user, permissions);
}

// Re-export constants with deprecation warnings
export async function getAdminPermissions() {
  console.warn('[ADMIN] ADMIN_PERMISSIONS from lib/admin/auth.ts is deprecated. Use lib/server/admin-constants.ts instead.');
  const { ADMIN_PERMISSIONS } = await import('../server/admin-constants');
  return ADMIN_PERMISSIONS;
}

export async function getRolePermissions() {
  console.warn('[ADMIN] ROLE_PERMISSIONS from lib/admin/auth.ts is deprecated. Use lib/server/admin-constants.ts instead.');
  const { ROLE_PERMISSIONS } = await import('../server/admin-constants');
  return ROLE_PERMISSIONS;
}

// DEPRECATED: CSRF functions replaced with Origin enforcement
export function generateCSRFToken(): never {
  throw new Error('[ADMIN] generateCSRFToken is deprecated. Use Origin enforcement/X-CSRF-Token instead. See lib/server/security.ts for enforceOrigin() function.');
}

export function validateCSRFToken(token: string): never {
  throw new Error('[ADMIN] validateCSRFToken is deprecated. Use Origin enforcement/X-CSRF-Token instead. See lib/server/security.ts for enforceOrigin() function.');
}

/**
 * MIGRATION GUIDE
 * 
 * Old Usage:
 * ```typescript
 * import { requireAdmin, getAdminUser } from '@/lib/admin/auth';
 * ```
 * 
 * New Usage (Server-only):
 * ```typescript
 * import { requireAdminOrThrow, getAdminUser } from '@/lib/server/admin-auth';
 * import { handleRoute } from '@/lib/server/route-helpers';
 * 
 * // Route handler example
 * export const runtime = 'nodejs';
 * export async function POST(request: NextRequest) {
 *   return handleRoute(async () => {
 *     const admin = await requireAdminOrThrow(request);
 *     // ... handle request
 *   });
 * }
 * ```
 * 
 * For Admin Utils:
 * ```typescript
 * import { hasPermission, isAdmin } from '@/lib/server/admin-utils';
 * ```
 * 
 * For Constants:
 * ```typescript
 * import { ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/server/admin-constants';
 * ```
 * 
 * Types (Safe for Client):
 * ```typescript
 * import { AdminUser, AdminRole } from '@/lib/admin/types';
 * ```
 */
