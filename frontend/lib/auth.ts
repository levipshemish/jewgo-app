import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Supabase authentication system
export async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        image: user.user_metadata?.avatar_url,
        provider: 'supabase'
      };
    }
  } catch (error) {
    // Supabase auth check failed - silent fail
  }

  return null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  
  // Check admin emails (configurable)
  const adminEmails = new Set<string>([
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@jewgo.com",
    // Add more admin emails as needed
  ]);
  
  if (!adminEmails.has(user.email ?? "")) {
    redirect("/"); // or /403
  }
  
  return user;
}

// Check if user is authenticated (for client-side use)
export async function isAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return !!user;
}

// Get user profile data
export async function getUserProfile() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  
  // You can extend this to fetch additional profile data from your database
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    provider: user.provider
  };
}
