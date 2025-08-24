"use server";

import { cookies } from "next/headers";
import { verifyTurnstile } from "@/lib/turnstile";
import { consumeCaptchaTokenOnce } from "@/lib/anti-replay";
import { checkRateLimit } from "@/lib/rate-limiting";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractIsAnonymous } from "@/lib/utils/auth-utils";

// Secure authentication using server-side Supabase client
async function doActualSignIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return { ok: false, error: error.message };
  }
  
  return { ok: true, data };
}

async function doActualAnonymousSignIn() {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.signInAnonymously();
  
  if (error) {
    return { ok: false, error: error.message };
  }
  
  return { ok: true, data };
}

export async function signInAction(_: any, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("cf-turnstile-response") ?? "");

  console.log("SignIn Action Debug:", {
    email: email ? "present" : "missing",
    password: password ? "present" : "missing", 
    tokenLength: token.length,
    hasToken: !!token
  });

  try {
    const rateLimitResult = await checkRateLimit("email_auth", "email", "", email);
    if (!rateLimitResult.allowed) {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }

    if (!token || token.length < 10) {
      return { ok: false, message: "Security verification required" };
    }

    const result = await verifyTurnstile(token);

    if (!result.success) {
      // Uniform failure, no oracle
      return { ok: false, message: "Security verification failed" };
    }

    // Hard checks
    const expectedHost = process.env.NEXT_PUBLIC_APP_HOSTNAME || "localhost";
    if (result.hostname && result.hostname !== expectedHost) {
      return { ok: false, message: "Security verification failed" };
    }
    if (result.action && result.action !== "signin") {
      return { ok: false, message: "Security verification failed" };
    }

    // One-shot token consumption (replay guard)
    await consumeCaptchaTokenOnce(token);

    // Now do the real sign in
    const r = await doActualSignIn(email, password);
    if (!r.ok) return { ok: false, message: "Invalid credentials" };

    // Nice UX: short "recent-human" cookie (HttpOnly)
    const cookieStore = await cookies();
    cookieStore.set("recent_human", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    return { ok: true };
  } catch (err: any) {
    if (err?.message === "RATE_LIMITED") {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }
    if (err?.message === "Replay detected") {
      return { ok: false, message: "Security verification failed" };
    }
    // Don't leak details
    return { ok: false, message: "Something went wrong" };
  }
}

export async function anonymousSignInAction(_: any, formData: FormData) {
  const token = String(formData.get("cf-turnstile-response") ?? "");

  try {
    const rateLimitResult = await checkRateLimit("anonymous_auth", "anonymous", "", "");
    if (!rateLimitResult.allowed) {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }

    if (!token || token.length < 10) {
      return { ok: false, message: "Security verification required" };
    }

    const result = await verifyTurnstile(token);

    if (!result.success) {
      // Uniform failure, no oracle
      return { ok: false, message: "Security verification failed" };
    }

    // Hard checks
    const expectedHost = process.env.NEXT_PUBLIC_APP_HOSTNAME || "localhost";
    if (result.hostname && result.hostname !== expectedHost) {
      return { ok: false, message: "Security verification failed" };
    }
    if (result.action && result.action !== "signin") {
      return { ok: false, message: "Security verification failed" };
    }

    // One-shot token consumption (replay guard)
    await consumeCaptchaTokenOnce(token);

    // Now do the real anonymous sign in
    const r = await doActualAnonymousSignIn();
    if (!r.ok) return { ok: false, message: "Failed to continue as guest" };

    // Nice UX: short "recent-human" cookie (HttpOnly)
    const cookieStore = await cookies();
    cookieStore.set("recent_human", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    return { ok: true };
  } catch (err: any) {
    if (err?.message === "RATE_LIMITED") {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }
    if (err?.message === "Replay detected") {
      return { ok: false, message: "Security verification failed" };
    }
    // Don't leak details
    return { ok: false, message: "Something went wrong" };
  }
}
