/**
 * Google reCAPTCHA v3 verification utility (server-side)
 */

export type RecaptchaVerifyResult = {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  errorCodes?: string[];
};

/**
 * Verify a reCAPTCHA v3 token with Google.
 * - actionExpected: optional action name to enforce (e.g., 'login')
 * - minScore: default threshold 0.5
 */
export async function verifyRecaptchaToken(
  token: string | null | undefined,
  actionExpected?: string,
  minScore: number = 0.5
): Promise<{ ok: boolean; result: RecaptchaVerifyResult }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!token) {
    return { ok: false, result: { success: false, errorCodes: ['missing-token'] } };
  }

  if (!secret) {
    // In development, allow bypass if secret is not set
    if (process.env.NODE_ENV !== 'production') {
      return { ok: true, result: { success: true, score: 0.9, action: actionExpected } };
    }
    return { ok: false, result: { success: false, errorCodes: ['missing-secret'] } };
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });

    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      cache: 'no-store',
    });

    const data = (await resp.json()) as RecaptchaVerifyResult & { challenge_ts?: string };

    if (!data.success) {
      return { ok: false, result: data };
    }

    if (typeof data.score === 'number' && data.score < minScore) {
      return { ok: false, result: data };
    }

    if (actionExpected && data.action && data.action !== actionExpected) {
      return { ok: false, result: data };
    }

    return { ok: true, result: data };
  } catch {
    return { ok: false, result: { success: false, errorCodes: ['verification-failed'] } };
  }
}

