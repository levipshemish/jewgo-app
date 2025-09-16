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
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const rawEvents: unknown = body?.events;
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return NextResponse.json({ status: 'no_events' }, { status: 204 });
  }

  // Validate and normalize
  const events: IncomingEvent[] = rawEvents
    .filter((e) => isObject(e) && typeof (e as any).event === 'string')
    .slice(0, 50)
    .map((e: any) => ({
      event: String(e.event),
      properties: isObject(e.properties) ? e.properties : undefined,
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
      userId: typeof e.userId === 'string' ? e.userId : undefined,
      sessionId: typeof e.sessionId === 'string' ? e.sessionId : undefined,
      page: typeof e.page === 'string' ? e.page : undefined,
      referrer: typeof e.referrer === 'string' ? e.referrer : undefined,
    }));

  if (events.length === 0) {
    return NextResponse.json({ status: 'no_valid_events' }, { status: 204 });
  }

  // Forward to GA if configured; otherwise ack
  const ok = await forwardToGA(request, events);
  if (!ok) {
    // Do not retry from the client; we already buffer on the client side
    return NextResponse.json({ status: 'accepted' }, { status: 202 });
  }
  return new NextResponse(null, { status: 204 });
}

// Preflight support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Allow': 'POST, OPTIONS' },
  });
}
