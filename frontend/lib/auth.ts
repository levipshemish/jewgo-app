import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { 
  isSupabaseConfigured, 
  transformSupabaseUser, 
  type TransformedUser 
} from "@/lib/utils/auth-utils";

// Enhanced Supabase authentication system with role integration
export async function getSessionUser(): Promise<TransformedUser | null> {
  try {
    // Check if Supabase is configured using centralized utility
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get session for JWT token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Transform user with role information
      return await transformSupabaseUser(user, {
        includeRoles: !!session?.access_token,
        userToken: session?.access_token || undefined
      });
    }
  } catch (error) {
    console.error('[Auth] Supabase auth check failed:', error);
    // Supabase auth check failed - silent fail
  }

  return null;
}

export async function requireUser(): Promise<TransformedUser> {
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
export async function getSessionUserWithRoles(): Promise<TransformedUser | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.warn('[Auth] No session token available for role fetching');
        // Return user without roles rather than failing
        return await transformSupabaseUser(user, { includeRoles: false });
      }
      
      // Always fetch roles for this function
      return await transformSupabaseUser(user, {
        includeRoles: true,
        userToken: session.access_token
      });
    }
  } catch (error) {
    console.error('[Auth] Error getting user with roles:', error);
  }

  return null;
}

/**
 * Require user with admin role
 * Redirects to signin if not authenticated or not admin
 */
export async function requireAdminUser(): Promise<TransformedUser> {
  const user = await getSessionUserWithRoles();
  
  if (!user) {
    redirect("/auth/signin");
  }
  
  if (!(user.isSuperAdmin || user.adminRole || (user.roleLevel ?? 0) > 0)) {
    // Authenticated but not an admin
    redirect("/");
  }
  
  return user;
}

/**
 * Check if user has specific permission
 */
export async function checkUserPermission(permission: string): Promise<boolean> {
  const user = await getSessionUserWithRoles();
  
  if (!user) {
    return false;
  }
  
  return user.isSuperAdmin || (user.permissions || []).includes(permission);
}

/**
 * Check if user has minimum role level
 */
export async function checkMinimumRoleLevel(minLevel: number): Promise<boolean> {
  const user = await getSessionUserWithRoles();
  
  if (!user) {
    return false;
  }
  
  return (user.roleLevel || 0) >= minLevel;
}
