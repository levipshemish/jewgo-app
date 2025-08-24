/**
 * Security Hardening Middleware
 * Implements CSRF protection, security headers, rate limiting, and session management
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
// Only import rate limiting if Redis is configured
let Ratelimit: any = null;
let Redis: any = null;

if (process.env.UPSTASH_REDIS_REST_URL) {
  try {
    const rateLimitModule = require("@upstash/ratelimit");
    const redisModule = require("@upstash/redis");
    Ratelimit = rateLimitModule.Ratelimit;
    Redis = redisModule.Redis;
  } catch (error) {
    console.warn("Upstash modules not available, rate limiting disabled");
  }
}

// Initialize Redis for rate limiting
const redis = (process.env.UPSTASH_REDIS_REST_URL && Redis) 
  ? Redis.fromEnv()
  : null;

// Rate limiters for different endpoints
const authLimiter = (redis && Ratelimit) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 attempts per 15 minutes
  analytics: true,
}) : null;

const apiLimiter = (redis && Ratelimit) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
}) : null;

export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl;

  // Get client IP for rate limiting
  const ip = request.ip ?? 
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? 
    request.headers.get("x-real-ip") ?? 
    "127.0.0.1";

  // =============================================================================
  // RATE LIMITING
  // =============================================================================
  
  // Rate limit auth endpoints more strictly
  if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/auth/")) {
    if (authLimiter) {
      const { success, limit, reset, remaining } = await authLimiter.limit(
        `auth_${ip}`
      );

      if (!success) {
        const retryAfter = Math.round((reset - Date.now()) / 1000);
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        });
      }

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", reset.toString());
    }
  }

  // Rate limit API endpoints
  if (url.pathname.startsWith("/api/") && apiLimiter) {
    const { success, limit, reset, remaining } = await apiLimiter.limit(
      `api_${ip}`
    );

    if (!success) {
      const retryAfter = Math.round((reset - Date.now()) / 1000);
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }

    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());
  }

  // =============================================================================
  // CSRF PROTECTION
  // =============================================================================
  
  // CSRF protection for state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    
    // Allow same-origin requests
    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      process.env.NEXT_PUBLIC_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
      return new NextResponse("Forbidden - Invalid Origin", { status: 403 });
    }

    // For server actions, check the Next.js action header
    if (url.pathname.startsWith("/api/") && !request.headers.get("next-action")) {
      const referer = request.headers.get("referer");
      if (referer && !allowedOrigins.some(allowed => referer.startsWith(allowed))) {
        return new NextResponse("Forbidden - Invalid Referer", { status: 403 });
      }
    }
  }

  // =============================================================================
  // SECURITY HEADERS
  // =============================================================================
  
  // Content Security Policy
  const isDev = process.env.NODE_ENV === "development";
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://www.google-analytics.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "report-uri /api/csp-report",
    "report-to csp-endpoint",
    isDev ? "upgrade-insecure-requests" : "",
  ].filter(Boolean).join("; ");

  response.headers.set("Content-Security-Policy", cspDirectives);

  // Other security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  
  // HSTS in production
  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================
  
  // Update Supabase session if needed
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: !isDev,
              sameSite: "lax",
            })
          );
        },
      },
    }
  );

  // Refresh session if needed
  await supabase.auth.getUser();

  return response;
}

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

export function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);

  const headers = new Headers();

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  headers.set("Access-Control-Max-Age", "86400");

  return headers;
}
