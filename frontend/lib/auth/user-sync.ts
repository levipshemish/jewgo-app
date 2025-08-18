import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export interface SyncedUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  isSuperAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync Supabase user to Neon database
 */
export async function syncSupabaseUserToNeon(supabaseUser: any): Promise<SyncedUser> {
  try {
    // Check if user already exists in Neon
    const existingUser = await prisma.user.findUnique({
      where: { email: supabaseUser.email }
    });

    if (existingUser) {
      // Update existing user with latest Supabase data
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || existingUser.name,
          image: supabaseUser.user_metadata?.avatar_url || existingUser.image,
          updatedAt: new Date(),
        }
      });

              return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar_url: updatedUser.image,
          isSuperAdmin: updatedUser.isSuperAdmin,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        };
    } else {
      // Create new user in Neon
      const newUser = await prisma.user.create({
        data: {
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
          image: supabaseUser.user_metadata?.avatar_url,
          isSuperAdmin: false, // Default to false, can be updated manually
        }
      });

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatar_url: newUser.image,
        isSuperAdmin: newUser.isSuperAdmin,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      };
    }
  } catch (error) {
    console.error('Error syncing user to Neon:', error);
    throw new Error('Failed to sync user data');
  }
}

/**
 * Get user from Neon database by Supabase user
 */
export async function getNeonUserFromSupabase(supabaseUser: any): Promise<SyncedUser | null> {
  try {
    const neonUser = await prisma.user.findUnique({
      where: { email: supabaseUser.email }
    });

    if (!neonUser) {
      return null;
    }

                  return {
          id: neonUser.id,
          email: neonUser.email,
          name: neonUser.name,
          avatar_url: neonUser.image,
          isSuperAdmin: neonUser.isSuperAdmin,
          createdAt: neonUser.createdAt,
          updatedAt: neonUser.updatedAt,
        };
  } catch (error) {
    console.error('Error getting Neon user:', error);
    return null;
  }
}

/**
 * Ensure user is synced (used in auth callbacks)
 */
export async function ensureUserSynced(supabaseUser: any): Promise<SyncedUser> {
  // First try to get existing user
  const existingUser = await getNeonUserFromSupabase(supabaseUser);
  
  if (existingUser) {
    // User exists, sync any updates
    return await syncSupabaseUserToNeon(supabaseUser);
  } else {
    // User doesn't exist, create new user
    return await syncSupabaseUserToNeon(supabaseUser);
  }
}

/**
 * Get all users from Neon database
 */
export async function getAllNeonUsers(): Promise<SyncedUser[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.image,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw new Error('Failed to get users');
  }
}

/**
 * Update user admin status
 */
export async function updateUserAdminStatus(userId: string, isSuperAdmin: boolean): Promise<SyncedUser> {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        isSuperAdmin,
        updatedAt: new Date()
      }
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar_url: updatedUser.image,
      isSuperAdmin: updatedUser.isSuperAdmin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  } catch (error) {
    console.error('Error updating user admin status:', error);
    throw new Error('Failed to update user admin status');
  }
}
