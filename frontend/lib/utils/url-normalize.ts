export type NormalizeOptions = {
  allowHttp?: boolean;           // if false, http → https
  stripTrailingSlash?: boolean;  // default true
  dropTrackingParams?: boolean;  // default true
  allowedProtocols?: Array<'http:' | 'https:'>; // override if needed
};

const DEFAULTS: Required<NormalizeOptions> = {
  allowHttp: true,
  stripTrailingSlash: true,
  dropTrackingParams: true,
  allowedProtocols: ['http:', 'https:'],
};

const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id',
  'gclid','fbclid','msclkid','mc_cid','mc_eid','mkt_tok','igshid','ref','ref_src',
]);

/**
 * Normalize and validate a URL-like string for database storage.
 * Throws on invalid input; returns a canonical string on success.
 */
export function normalizeUrl(input: string, opts: NormalizeOptions = {}): string {
  const o = { ...DEFAULTS, ...opts };

  if (!input || typeof input !== 'string') {
    throw new Error('URL must be a non-empty string.');
  }

  // Trim and remove surrounding invisible whitespace
  let raw = input.trim();

  // If it has no scheme, assume https
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) {
    raw = `https://${  raw}`;
  }

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Invalid URL syntax.');
  }

  // Restrict protocols
  if (!o.allowedProtocols.includes(u.protocol as "http:" | "https:")) {
    throw new Error(`Unsupported protocol: ${u.protocol}`);
  }

  // Optionally force https
  if (!o.allowHttp && u.protocol === 'http:') {
    u.protocol = 'https:';
    // default port fix-up happens below
  }

  // Normalize case & remove credentials & fragments
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();
  u.username = '';
  u.password = '';
  u.hash = '';

  // Strip default ports
  if ((u.protocol === 'http:' && u.port === '80') ||
      (u.protocol === 'https:' && u.port === '443')) {
    u.port = '';
  }

  // Normalize path: collapse multiple slashes; remove dot segments are already handled by URL
  u.pathname = u.pathname.replace(/\/{2,}/g, '/');

  // Optional trailing slash removal for non-root
  if (o.stripTrailingSlash && u.pathname.length > 1) {
    u.pathname = u.pathname.replace(/\/+$/g, '');
    if (u.pathname === '') {u.pathname = '/';}
  }

  // Clean & sort query params
  const params = new URLSearchParams(u.search);
  // Drop empty values and tracking params (optional)
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    const vals = params.getAll(key);
    const shouldDrop =
      (o.dropTrackingParams && TRACKING_PARAMS.has(lower)) ||
      vals.every(v => v === '' || v === null || v === undefined);
    if (shouldDrop) {
      params.delete(key);
    }
  }
  // Sort for stable canonicalization
  const entries = Array.from(params.entries()).sort((a, b) =>
    a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])
  );
  const sorted = new URLSearchParams();
  for (const [k, v] of entries) {sorted.append(k, v);}
  u.search = sorted.toString() ? `?${sorted.toString()}` : '';

  // Final sanity: must have a hostname (URL already rejects most bad hosts)
  if (!u.hostname) {throw new Error('Missing hostname.');}

  // Serialize: WHATWG URL serializes IDNs to punycode, which is ideal for DB uniqueness.
  return u.toString();
}

/**
 * Optional: quick reachability probe (server-side only).
 * Use HEAD, follow redirects, fail fast. Not for client due to CORS.
 */
export async function isLikelyReachable(url: string, timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    return res.ok || (res.status >= 300 && res.status < 400); // treat redirects as "reachable"
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}
