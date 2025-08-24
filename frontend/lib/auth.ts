import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { 
  isSupabaseConfigured, 
  transformSupabaseUser, 
  type TransformedUser 
} from "@/lib/utils/auth-utils";

// Supabase authentication system
export async function getSessionUser(): Promise<TransformedUser | null> {
  try {
    // Check if Supabase is configured using centralized utility
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      return transformSupabaseUser(user);
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
