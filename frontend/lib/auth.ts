import { redirect } from "next/navigation";
import { postgresAuth, type AuthUser } from "@/lib/auth/postgres-auth";

// PostgreSQL-based authentication system
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    // Check if user is authenticated via PostgreSQL auth
    if (!postgresAuth.isAuthenticated()) {
      return null;
    }

    // Get user profile from PostgreSQL auth
    const user = await postgresAuth.getProfile();
    return user;
  } catch (error) {
    console.error('[Auth] PostgreSQL auth check failed:', error);
    // PostgreSQL auth check failed - silent fail
  }

  return null;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

/**
 * Get session user with guaranteed role information
 * Useful for admin routes that need role data
 */
export async function getSessionUserWithRoles(): Promise<AuthUser | null> {
  try {
    // Check if user is authenticated via PostgreSQL auth
    if (!postgresAuth.isAuthenticated()) {
      return null;
    }

    // Get user profile with roles from PostgreSQL auth
    const user = await postgresAuth.getProfile();
    return user;
  } catch (error) {
    console.error('[Auth] Error getting user with roles:', error);
  }

  return null;
}

/**
 * Require user with admin role
 * Redirects to signin if not authenticated or not admin
 */
export async function requireAdminUser(): Promise<AuthUser> {
  const user = await getSessionUserWithRoles();
  
  if (!user) {
    redirect("/auth/signin");
  }
  
  // Check if user has admin role
  const isAdmin = await postgresAuth.isAdmin();
  if (!isAdmin) {
    // Authenticated but not an admin
    redirect("/");
  }
  
  return user;
}

/**
 * Check if current user has specific permission
 */
export async function hasUserPermission(permission: string): Promise<boolean> {
  try {
    const user = await getSessionUser();
    if (!user) return false;
    
    // Check if user has admin role (full permissions)
    const isAdmin = await postgresAuth.isAdmin();
    if (isAdmin) return true;
    
    // Check specific permission based on user roles
    // This is a simplified implementation - you can enhance this based on your permission system
    return user.roles.some(role => role.role === 'admin' || role.role === 'moderator');
  } catch (error) {
    console.error('[Auth] Permission check failed:', error);
    return false;
  }
}

/**
 * Check if current user has minimum role level
 */
export async function hasMinimumRoleLevel(requiredLevel: number): Promise<boolean> {
  try {
    const user = await getSessionUser();
    if (!user) return false;
    
    return await postgresAuth.hasMinimumRoleLevel(requiredLevel);
  } catch (error) {
    console.error('[Auth] Role level check failed:', error);
    return false;
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const user = await getSessionUser();
    return user?.id || null;
  } catch (error) {
    console.error('[Auth] Get user ID failed:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    return postgresAuth.isAuthenticated();
  } catch (error) {
    console.error('[Auth] Authentication check failed:', error);
    return false;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<AuthUser | null> {
  try {
    if (!postgresAuth.isAuthenticated()) {
      return null;
    }
    return await postgresAuth.getProfile();
  } catch (error) {
    console.error('[Auth] Get profile failed:', error);
    return null;
  }
}
