"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limiting";

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  try {
    // Rate limit password reset requests
    const rateLimitResult = await checkRateLimit("password_reset", "email", "", email);
    if (!rateLimitResult.allowed) {
      return { ok: false, message: "Too many password reset attempts. Try again shortly." };
    }

    // Validate email format
    if (!email || !email.includes("@")) {
      return { ok: false, message: "Please enter a valid email address" };
    }

    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
      // Don't leak whether email exists or not
      console.error('Password reset error:', error);
      return { ok: false, message: "If an account exists with this email, you will receive a password reset link." };
    }

    return { ok: true, message: "If an account exists with this email, you will receive a password reset link." };
  } catch (err: any) {
    if (err?.message === "RATE_LIMITED") {
      return { ok: false, message: "Too many password reset attempts. Try again shortly." };
    }
    // Don't leak details
    console.error('Password reset unexpected error:', err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
