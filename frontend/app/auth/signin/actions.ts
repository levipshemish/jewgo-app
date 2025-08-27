"use server";
import { _checkRateLimit} from "@/lib/rate-limiting";
import { _createServerSupabaseClient} from "@/lib/supabase/server";
import { _verifyRecaptchaToken} from "@/lib/utils/recaptcha";

// Note: No CAPTCHA verification required.
// Supabase Auth verifies captcha tokens itself. Double-verification can
// consume the one-time token before Supabase sees it and cause failures.

export async function signInAction(prevState: any, formData: FormData) {
  const _email = formData.get("email") as string;
  const _password = formData.get("password") as string;
  const _recaptchaToken = formData.get("recaptchaToken") as string | null;
  const _recaptchaAction = (formData.get("recaptchaAction") as string | null) || 'login';
  

  if (!email || !password) {
    return { ok: false, message: "Email and password are required" };
  }

  try {
    // Verify reCAPTCHA v3 (only enforce in production; allow in dev if not configured)
    const _captchaCheck = await verifyRecaptchaToken(recaptchaToken, recaptchaAction || undefined, 0.5);
    if (!captchaCheck.ok) {
      return { ok: false, message: "Captcha verification failed. Please try again." };
    }

    const _rateLimitResult = await checkRateLimit("email_auth", "email", "", email);
    if (!rateLimitResult.allowed) {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }



    // Attempt sign in
    const _supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
