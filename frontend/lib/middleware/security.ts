import { NextRequest, NextResponse } from 'next/server';

// Security headers applied consistently for admin and API routes
export function buildSecurityHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get('origin') || '';
  const requestOrigin = req.nextUrl.origin;

  // Configure allowed origins
  const allowlist: string[] = [];
  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowlist.push(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    allowlist.push(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);
  }
  // Always allow same-origin
  allowlist.push(requestOrigin);

  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': "camera=(), microphone=(), geolocation=()",
    'Vary': 'Origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
  };

  // CORS: only reflect allowed origins, never '*'
  if (origin && allowlist.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

// Lightweight security check hook; return 200 to continue
export async function securityMiddleware(_req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

// Preflight/response CORS headers with strict origin handling
export function corsHeaders(req: NextRequest): HeadersInit {
  const base = buildSecurityHeaders(req);
  return {
    ...base,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-csrf-token, Authorization',
    'Access-Control-Max-Age': '600',
  };
}
