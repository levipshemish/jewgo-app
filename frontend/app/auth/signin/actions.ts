"use server";

import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limiting";
import { verifyTurnstile } from "@/lib/turnstile";
import { consumeCaptchaTokenOnce } from "@/lib/anti-replay";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Validate Turnstile hostname with relaxed rules for subdomains and ports
 */
function validateTurnstileHostname(resultHostname: string | undefined): boolean {
  if (!resultHostname) return true;
  
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

export async function anonymousSignInAction(prevState: any, formData: FormData) {
  const token = formData.get("cf-turnstile-response") as string;

  try {
    const rateLimitResult = await checkRateLimit("anonymous_auth", "anonymous", "", "");
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

    // Attempt anonymous sign in
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      return { ok: false, message: "Failed to continue as guest" };
    }

    if (data.user) {
      return { ok: true, message: "Guest sign in successful" };
    }

    return { ok: false, message: "Failed to continue as guest" };
  } catch (error) {
    return { ok: false, message: "An error occurred during guest sign in" };
  }
}
