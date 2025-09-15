"use server";

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

    // Send password reset request to PostgreSQL auth backend
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      'https://api.jewgo.app';

    const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Don't leak whether email exists or not
      console.error('Password reset error:', result);
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
