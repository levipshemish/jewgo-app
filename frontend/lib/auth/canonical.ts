import 'server-only';

// DEPRECATED: This file is deprecated and will be removed in the next phase
// Use lib/server/canonical-auth.ts instead

console.warn('[ADMIN] lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');

// Re-export from new server module with deprecation warnings
export async function requireAdminAuth(...args: any[]) {
  console.warn('[ADMIN] requireAdminAuth from lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');
  const { requireAdminAuth: newRequireAdminAuth } = await import('../server/canonical-auth');
  return newRequireAdminAuth(...args);
}

export async function checkAdminAuth(...args: any[]) {
  console.warn('[ADMIN] checkAdminAuth from lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');
  const { checkAdminAuth: newCheckAdminAuth } = await import('../server/canonical-auth');
  return newCheckAdminAuth(...args);
}

export async function requireAdminPermission(...args: any[]) {
  console.warn('[ADMIN] requireAdminPermission from lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');
  const { requireAdminPermission: newRequireAdminPermission } = await import('../server/canonical-auth');
  return newRequireAdminPermission(...args);
}

export async function requireMinimumRoleLevel(...args: any[]) {
  console.warn('[ADMIN] requireMinimumRoleLevel from lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');
  const { requireMinimumRoleLevel: newRequireMinimumRoleLevel } = await import('../server/canonical-auth');
  return newRequireMinimumRoleLevel(...args);
}

export async function validateAdminAccess(...args: any[]) {
  console.warn('[ADMIN] validateAdminAccess from lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');
  const { validateAdminAccess: newValidateAdminAccess } = await import('../server/canonical-auth');
  return newValidateAdminAccess(...args);
}

export async function assertAdminUser(...args: any[]) {
  console.warn('[ADMIN] assertAdminUser from lib/auth/canonical.ts is deprecated. Use lib/server/canonical-auth.ts instead.');
  const { assertAdminUser: newAssertAdminUser } = await import('../server/canonical-auth');
  return newAssertAdminUser(...args);
}

// Legacy function with feature flag
export async function requireAdminAuthLegacy(...args: any[]) {
  console.warn('[ADMIN] requireAdminAuthLegacy is deprecated and feature-flagged. Use requireAdminAuth instead.');
  const { requireAdminAuthLegacy: newRequireAdminAuthLegacy } = await import('../server/canonical-auth');
  return newRequireAdminAuthLegacy(...args);
}

/**
 * MIGRATION GUIDE
 * 
 * Old Usage:
 * ```typescript
 * import { requireAdminAuth } from '@/lib/auth/canonical';
 * ```
 * 
 * New Usage (Server-only):
 * ```typescript
 * import { requireAdminAuth } from '@/lib/server/canonical-auth';
 * import { handleRoute } from '@/lib/server/route-helpers';
 * 
 * // Page component example
 * export default async function AdminPage() {
 *   const admin = await requireAdminAuth();
 *   return <div>Welcome {admin.name}</div>;
 * }
 * 
 * // Route handler example
 * export const runtime = 'nodejs';
 * export async function GET() {
 *   return handleRoute(async () => {
 *     const admin = await requireAdminAuth();
 *     return Response.json({ user: admin.name });
 *   });
 * }
 * ```
 * 
 * For Permission Checks:
 * ```typescript
 * import { requireAdminPermission } from '@/lib/server/canonical-auth';
 * 
 * const admin = await requireAdminPermission('restaurant:edit');
 * ```
 * 
 * For Role Level Checks:
 * ```typescript
 * import { requireMinimumRoleLevel } from '@/lib/server/canonical-auth';
 * 
 * const admin = await requireMinimumRoleLevel(3); // system_admin or higher
 * ```
 */
