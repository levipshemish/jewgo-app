"use server";
import { checkRateLimit } from "@/lib/rate-limiting";
import { verifyTurnstile } from "@/lib/turnstile";
import { consumeCaptchaTokenOnce } from "@/lib/anti-replay";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Validate Turnstile hostname with relaxed rules for subdomains and ports
 */
function validateTurnstileHostname(resultHostname: string | undefined): boolean {
  // In production, require a hostname assertion
  if (process.env.NODE_ENV === 'production' && !resultHostname) return false;
  
  // If no hostname provided, only allow in development
  if (!resultHostname) return process.env.NODE_ENV !== 'production';
  
  const expectedHost = process.env.NEXT_PUBLIC_APP_HOSTNAME || "localhost";
  const expectedHostname = expectedHost.split(':')[0]; // Remove port if present
  const resultHostnameClean = resultHostname.split(':')[0]; // Remove port if present
  
  // Allow exact match, subdomains, and localhost
  return resultHostnameClean === expectedHostname || 
         resultHostnameClean.endsWith('.' + expectedHostname) ||
         expectedHostname === 'localhost';
}

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

    if (!token || token.length < 10) {
      return { ok: false, message: "Security verification required" };
    }

    const result = await verifyTurnstile(token);
    
    // Turnstile verification failed
    if (!result.success) {
      return { ok: false, message: "Security verification failed" };
    }

    // Validate action
    if (result.action && result.action !== "signin" && result.action !== "anonymous_signin") {
      return { ok: false, message: "Security verification failed" };
    }

    // Validate hostname (relaxed to allow subdomains and ports)
    if (!validateTurnstileHostname(result.hostname)) {
      return { ok: false, message: "Security verification failed" };
    }

    // One-shot token consumption (replay guard) - always enforce
    await consumeCaptchaTokenOnce(token);

    // Attempt sign in
    const supabase = await createServerSupabaseClient();
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
  } catch (error) {
    return { ok: false, message: "An error occurred during sign in" };
  }
}

// Note: anonymous sign-in now flows through /api/auth/anonymous from the client
