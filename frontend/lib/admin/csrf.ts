import crypto from 'crypto';

const CSRF_TTL_MS = 60 * 60 * 1000; // 1 hour

function signToken(raw: string): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[ADMIN] CSRF_SECRET must be set in production');
    }
  }
  const hmac = crypto.createHmac('sha256', secret || 'dev_csrf_secret').update(raw).digest('hex');
  return `${raw}.${hmac}`;
}

function verifySignature(signed: string): { raw: string; valid: boolean } {
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return { raw: signed, valid: false };
  const raw = signed.slice(0, idx);
  const expected = signToken(raw);
  return { raw, valid: expected === signed };
}

export function generateSignedCSRFToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, ts: Date.now() });
  return signToken(Buffer.from(payload).toString('base64url'));
}

export function validateSignedCSRFToken(token: string, userId: string): boolean {
  try {
    const { raw, valid } = verifySignature(token);
    if (!valid) return false;
    const json = Buffer.from(raw, 'base64url').toString();
    const { uid, ts } = JSON.parse(json || '{}');
    if (uid !== userId) return false;
    if (typeof ts !== 'number') return false;
    return (Date.now() - ts) < CSRF_TTL_MS;
  } catch {
    return false;
  }
}

// Stateless CSRF: no cookies utility exported
