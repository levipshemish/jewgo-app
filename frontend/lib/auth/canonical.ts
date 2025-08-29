/**
 * Canonical Authentication Module
 * Single source of truth for all authentication operations
 */

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { 
  isSupabaseConfigured, 
  transformSupabaseUser, 
  type TransformedUser 
} from "@/lib/utils/auth-utils";

// Core authentication functions
export async function getSessionUser(): Promise<TransformedUser | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      return await transformSupabaseUser(user);
    }
  } catch (error) {
    console.error('[Auth] Supabase auth check failed:', error);
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

export async function requireAdmin(): Promise<TransformedUser> {
  const user = await requireUser();
  
  const adminEmails = new Set<string>([
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@jewgo.com",
  ]);
  
  if (!adminEmails.has(user.email ?? "")) {
    redirect("/");
  }
  
  return user;
}

// Authentication state helpers
export async function isAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return !!user;
}

export async function getUserProfile() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    provider: user.provider
  };
}

// Re-export types for convenience
export type { TransformedUser };
