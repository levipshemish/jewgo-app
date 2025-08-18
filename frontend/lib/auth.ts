import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Unified authentication system that works with both Supabase and NextAuth
export async function getSessionUser() {
  try {
    // Try Supabase first (primary auth system)
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (user && !error) {
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        image: user.user_metadata?.avatar_url,
        provider: 'supabase'
      };
    }
  } catch (error) {
    console.warn('Supabase auth check failed:', error);
  }

  // Fallback to NextAuth if Supabase fails
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      return {
        ...session.user,
        provider: 'nextauth'
      };
    }
  } catch (error) {
    console.warn('NextAuth fallback failed:', error);
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
  if (!user) return null;
  
  // You can extend this to fetch additional profile data from your database
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    provider: user.provider
  };
}
