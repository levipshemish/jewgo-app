import { createHash } from "crypto";
import { headers } from "next/headers";

// Simple in-memory token storage for development
// In production, this should use Redis
const usedTokens = new Set<string>();

export async function consumeCaptchaTokenOnce(token: string, ttlSec = 120) {
  const key = "ts:tok:" + createHash("sha256").update(token).digest("hex").slice(0, 32);
  
  // Check if token was already used
  if (usedTokens.has(key)) {
    throw new Error("Replay detected");
  }
  
  // Mark token as used
  usedTokens.add(key);
  
  // Clean up after TTL (simple setTimeout for development)
  setTimeout(() => {
    usedTokens.delete(key);
  }, ttlSec * 1000);
}
