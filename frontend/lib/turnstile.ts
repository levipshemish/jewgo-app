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
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY missing");

  // Development bypass for test keys
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTestKey = siteKey === "1x00000000000000000000AA";
  const isDevelopment = process.env.NODE_ENV === "development";
  
  console.log("Turnstile verification:", {
    tokenLength: responseToken.length,
    isTestKey,
    isDevelopment,
    hasSecret: !!secret
  });
  
  if (isDevelopment && isTestKey) {
    // Return a mock successful response for development
    console.log("Using development bypass for Turnstile");
    return {
      success: true,
      challenge_ts: new Date().toISOString(),
      hostname: "localhost",
      action: "signin"
    };
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
