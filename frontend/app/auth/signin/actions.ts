"use server";
import { checkRateLimit } from "@/lib/rate-limiting";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Note: We no longer verify or consume Turnstile tokens here.
// Supabase Auth verifies captcha tokens itself. Double-verification can
// consume the one-time token before Supabase sees it and cause failures.

export async function signInAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const token = formData.get("cf-turnstile-response") as string;

  if (!email || !password) {
    return { ok: false, message: "Email and password are required" };
  }

  try {
    const rateLimitResult = await checkRateLimit("email_auth", "email", "", email);
    if (!rateLimitResult.allowed) {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }

    // Require a token but let Supabase perform verification to avoid
    // consuming the one-time token prematurely.
    if (!token || token.length < 10) {
      return { ok: false, message: "Security verification required" };
    }

    // Attempt sign in
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken: token,
      },
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    if (data.user) {
      return { ok: true, message: "Sign in successful" };
    }

    return { ok: false, message: "Sign in failed" };
  } catch (_error) {
    return { ok: false, message: "An error occurred during sign in" };
  }
}

// Note: anonymous sign-in now flows through /api/auth/anonymous from the client
