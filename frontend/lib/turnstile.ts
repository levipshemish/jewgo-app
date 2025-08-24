import { headers } from "next/headers";

type VerifyResp = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
};

export async function verifyTurnstile(responseToken: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY!;
  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY missing");
  }

  // Always verify Turnstile tokens
  if (!responseToken || responseToken.length < 32) {
    throw new Error("Invalid Turnstile token");
  }
  
  // Turnstile verification details logged in development
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log("Turnstile verification:", {
      tokenLength: responseToken.length,
      hasSecret: !!secret,
      nodeEnv: process.env.NODE_ENV
    });
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    undefined;

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: responseToken,
        ...(ip ? { remoteip: ip } : {}),
      }),
      // Turnstile is fast; don't stall auth forever
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  const data = (await res.json()) as VerifyResp;
  return data;
}
