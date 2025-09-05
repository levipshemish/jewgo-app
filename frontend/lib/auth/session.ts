/**
 * Session Management Module
 * Handles user session operations and validation
 */

// PostgreSQL auth - using backend API instead of Supabase
import { TransformedUser } from '../utils/auth-utils';
import { Permission } from '../constants/permissions';

/**
 * Get current user session
 */
export async function getCurrentSession() {
  // PostgreSQL auth - session management not implemented yet
  return null;
}

/**
 * Get current user with session validation
 */
export async function getCurrentUser(): Promise<TransformedUser | null> {
  // PostgreSQL auth - user session not implemented yet
  return null;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: TransformedUser | null, permission: Permission): boolean {
  if (!user) return false;
  
  // Check if user has the specific permission
  return user.permissions?.includes(permission) || false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: TransformedUser | null, permissions: Permission[]): boolean {
  if (!user || !user.permissions) return false;
  
  return permissions.some(permission => user.permissions?.includes(permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: TransformedUser | null, permissions: Permission[]): boolean {
  if (!user || !user.permissions) return false;
  
  return permissions.every(permission => user.permissions?.includes(permission));
}