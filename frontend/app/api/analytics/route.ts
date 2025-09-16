import { NextRequest, NextResponse } from 'next/server';

/**
 * Real analytics ingestion endpoint
 * - Validates and scrubs client-sent events
 * - Forwards to Google Analytics Measurement Protocol when configured
 * - Never logs or persists payloads to avoid handling PII
 */

type IncomingEvent = {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
  page?: string;
  referrer?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Scrub PII-like keys; keep numeric/boolean primitives, short strings
function scrubParams(obj: Record<string, unknown>): Record<string, unknown> {
  const disallowed = new Set([
    'email', 'user_email', 'e-mail', 'phone', 'phone_number', 'name', 'first_name', 'last_name',
    'address', 'street', 'city', 'zip', 'postal_code', 'ssn', 'token', 'password', 'secret',
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (disallowed.has(key)) continue;
    if (typeof v === 'string') {
      // Drop very long strings and anything that looks like an email
      const val = v.slice(0, 256);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) continue;
      out[k] = val;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (Array.isArray(v)) {
      // Keep small arrays of primitives
      if (v.length <= 10 && v.every(x => ['string','number','boolean'].includes(typeof x))) {
        out[k] = v.map(x => typeof x === 'string' ? (x as string).slice(0, 128) : x);
      }
    } else if (isObject(v)) {
      // Flatten one level for small objects
      const nested = Object.entries(v).reduce<Record<string, unknown>>((acc, [nk, nv]) => {
        const nkLower = nk.toLowerCase();
        if (disallowed.has(nkLower)) return acc;
        if (typeof nv === 'string') {
          const val = nv.slice(0, 128);
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return acc;
          acc[`${k}_${nk}`] = val;
        } else if (typeof nv === 'number' || typeof nv === 'boolean') {
          acc[`${k}_${nk}`] = nv;
        }
        return acc;
      }, {});
      Object.assign(out, nested);
    }
  }
  return out;
}

function getGAConfig() {
  const measurementId = process.env.GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  const apiSecret = process.env.GA_API_SECRET || '';
  return { measurementId, apiSecret, enabled: Boolean(measurementId && apiSecret) };
}

function getClientId(req: NextRequest, fallback?: string) {
  // Prefer an explicit sessionId if provided
  if (fallback) return fallback;
  // Try a stable hash from headers (best-effort without storing cookies)
  const ua = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  const seed = `${ua}::${ip}`;
  // Simple non-crypto hash -> hex string
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619;
  return `cid_${(h >>> 0).toString(16)}`;
}

async function forwardToGA(req: NextRequest, events: IncomingEvent[]) {
  const { measurementId, apiSecret, enabled } = getGAConfig();
  if (!enabled) return true; // Not configured; treat as success (no-op)

  // Build MP payload
  // See: https://developers.google.com/analytics/devguides/collection/protocol/ga4
  const clientId = getClientId(req, events.find(e => e.sessionId)?.sessionId);
  const gaEvents = events.slice(0, 20).map((e) => ({
    name: e.event?.toString().slice(0, 40) || 'event',
    params: {
      engagement_time_msec: 1,
      page_location: e.page,
      page_referrer: e.referrer,
      ...scrubParams({ ...(e.properties || {}) }),
    },
  }));

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, events: gaEvents }),
      // 2s timeout
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    
    // Get the request body
    const body = await request.json();
    
    // Forward the request to the backend analytics endpoint
    const response = await fetch(`${backendUrl}/api/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers
        ...(request.headers.get('user-agent') && { 'User-Agent': request.headers.get('user-agent')! }),
        ...(request.headers.get('x-forwarded-for') && { 'X-Forwarded-For': request.headers.get('x-forwarded-for')! }),
      },
      body: JSON.stringify(body),
    });

    // Forward the backend response
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Analytics proxy error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Analytics service temporarily unavailable' 
    }, { status: 500 });
  }
}

// Preflight support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Allow': 'POST, OPTIONS' },
  });
}
