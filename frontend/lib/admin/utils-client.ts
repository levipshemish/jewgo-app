// Client-safe admin utilities (no server-only imports)
import type { TransformedUser } from '@/lib/utils/auth-utils';
import type { AdminUser, AdminRole } from '@/lib/admin/types';
import type { Permission } from '@/lib/constants/permissions';
import { getPermissionsForRole } from './constants-client';

/**
 * Check if user is an admin (has any admin role) - client-safe
 */
export function isAdmin(user: TransformedUser | null): user is AdminUser {
  if (!user) return false;
  return !!(user.adminRole && (user.roleLevel || 0) > 0);
}

/**
 * Check if user has a specific permission - client-safe
 */
export function hasPermission(user: AdminUser, permission: Permission): boolean {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission) || user.isSuperAdmin;
}

/**
 * Check if user has any of the specified permissions - client-safe
 */
export function hasAnyPermission(user: AdminUser, permissions: Permission[]): boolean {
  if (!user || !user.permissions) return false;
  if (user.isSuperAdmin) return true;
  return permissions.some(perm => user.permissions.includes(perm));
}

/**
 * Check if user has all of the specified permissions - client-safe
 */
export function hasAllPermissions(user: AdminUser, permissions: Permission[]): boolean {
  if (!user || !user.permissions) return false;
  if (user.isSuperAdmin) return true;
  return permissions.every(perm => user.permissions.includes(perm));
}

/**
 * Check if user has minimum admin level - client-safe
 */
export function hasMinimumAdminLevel(user: TransformedUser | null, minLevel: number): boolean {
  if (!user || !isAdmin(user)) return false;
  return (user.roleLevel || 0) >= minLevel;
}

/**
 * Check if user is super admin - client-safe
 */
export function isSuperAdmin(user: TransformedUser | null): boolean {
  if (!user) return false;
  return user.isSuperAdmin === true || user.adminRole === 'super_admin';
}

/**
 * Get user's admin role - client-safe
 */
export function getAdminRole(user: TransformedUser | null): AdminRole | null {
  if (!user || !isAdmin(user)) return null;
  return user.adminRole;
}

/**
 * Get user's role level - client-safe
 */
export function getRoleLevel(user: TransformedUser | null): number {
  if (!user) return 0;
  return user.roleLevel || 0;
}

/**
 * Get user's permissions array - client-safe
 */
export function getUserPermissions(user: TransformedUser | null): Permission[] {
  if (!user || !isAdmin(user)) return [];
  return user.permissions || [];
}

/**
 * Get permissions for user's role - client-safe
 */
export function getRolePermissions(user: TransformedUser | null): Permission[] {
  if (!user || !user.adminRole) return [];
  return getPermissionsForRole(user.adminRole as AdminRole) as Permission[];
}

/**
 * Check if user can perform action based on role level - client-safe
 */
export function canPerformAction(user: TransformedUser | null, requiredLevel: number): boolean {
  if (!user || !isAdmin(user)) return false;
  if (user.isSuperAdmin) return true;
  return (user.roleLevel || 0) >= requiredLevel;
}

/**
 * Filter permissions by category - client-safe
 */
export function filterPermissionsByCategory(permissions: Permission[], category: string): Permission[] {
  const categoryMap: Record<string, Permission[]> = {
    restaurant: permissions.filter(p => p.startsWith('restaurant:')) as Permission[],
    review: permissions.filter(p => p.startsWith('review:')) as Permission[],
    user: permissions.filter(p => p.startsWith('user:')) as Permission[],
    system: permissions.filter(p => p.startsWith('system:')) as Permission[],
    audit: permissions.filter(p => p.startsWith('audit:')) as Permission[],
    operations: permissions.filter(p => p.startsWith('bulk:') || p.startsWith('data:')) as Permission[],
    roles: permissions.filter(p => p.startsWith('role:')) as Permission[],
    image: permissions.filter(p => p.startsWith('image:')) as Permission[],
    synagogue: permissions.filter(p => p.startsWith('synagogue:')) as Permission[],
    kosher_place: permissions.filter(p => p.startsWith('kosher_place:')) as Permission[],
    analytics: permissions.filter(p => p.startsWith('analytics:')) as Permission[]
  };
  
  return categoryMap[category] || [];
}

/**
 * Get permission categories - client-safe
 */
export function getPermissionCategories(): string[] {
  return [
    'restaurant',
    'review', 
    'user',
    'system',
    'audit',
    'operations',
    'roles',
    'image',
    'synagogue',
    'kosher_place',
    'analytics'
  ];
}
