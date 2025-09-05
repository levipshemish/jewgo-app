"use server";
import { checkRateLimit} from "@/lib/rate-limiting";
import { verifyRecaptchaToken} from "@/lib/utils/recaptcha";

// PostgreSQL authentication signin action

export async function signInAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const recaptchaToken = formData.get("recaptchaToken") as string | null;
  const recaptchaAction = (formData.get("recaptchaAction") as string | null) || 'login';
  

  if (!email || !password) {
    return { ok: false, message: "Email and password are required" };
  }

  try {
    // Verify reCAPTCHA v3 (only enforce in production; allow in dev if not configured)
    const captchaCheck = await verifyRecaptchaToken(recaptchaToken, recaptchaAction || undefined, 0.5);
    if (!captchaCheck.ok) {
      return { ok: false, message: "Captcha verification failed. Please try again." };
    }

    const rateLimitResult = await checkRateLimit("emailauth", "email", "", email);
    if (!rateLimitResult.allowed) {
      return { ok: false, message: "Too many attempts. Try again shortly." };
    }



    // Attempt sign in with PostgreSQL auth backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (!backendUrl) {
      return { ok: false, message: "Backend not configured" };
    }

    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { ok: false, message: result.message || "Sign in failed" };
    }

    if (result.access_token) {
      return { ok: true, message: "Sign in successful" };
    }

    return { ok: false, message: "Sign in failed" };
  } catch (_error) {
    return { ok: false, message: "An error occurred during sign in" };
  }
}

// Note: anonymous sign-in now flows through /api/auth/anonymous from the client
