import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

// Example: gate admins via your Neon users table later.
// For now, use email allowlist or Supabase user metadata.
export async function requireAdmin() {
  const user = await requireUser();
  const adminEmails = new Set<string>([
    // "you@yourdomain.com"
  ]);
  if (!adminEmails.has(user.email ?? "")) {
    redirect("/"); // or /403
  }
  return user;
}
