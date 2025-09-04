import { generateSignedCSRFToken, validateSignedCSRFToken } from '@/lib/admin/csrf';

describe('CSRF token', () => {
  const OLD_ENV = process.env;
  beforeAll(() => {
    process.env = { ...OLD_ENV, CSRF_SECRET: 'test_secret', NODE_ENV: 'test' } as any;
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('generates and validates a signed token bound to user id', () => {
    const token = generateSignedCSRFToken('user-123');
    expect(typeof token).toBe('string');
    expect(validateSignedCSRFToken(token, 'user-123')).toBe(true);
    expect(validateSignedCSRFToken(token, 'user-456')).toBe(false);
  });

  test('uses dev fallback secret when missing (non-production)', () => {
    const prev = { ...process.env };
    delete (process.env as any).CSRF_SECRET;
    process.env.NODE_ENV = 'development';
    const token = generateSignedCSRFToken('dev-user');
    expect(validateSignedCSRFToken(token, 'dev-user')).toBe(true);
    process.env = prev as any;
  });

  test('throws in production when CSRF secret missing', () => {
    const prev = { ...process.env };
    delete (process.env as any).CSRF_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => generateSignedCSRFToken('prod-user')).toThrow();
    process.env = prev as any;
  });

  test('malformed but correctly signed token triggers catch and returns false', () => {
    const prev = { ...process.env };
    process.env.CSRF_SECRET = 'test_secret';
    const crypto = require('crypto');
    const raw = '!!!not_base64url!!!';
    const sig = crypto.createHmac('sha256', process.env.CSRF_SECRET).update(raw).digest('hex');
    const bad = `${raw}.${sig}`;
    expect(validateSignedCSRFToken(bad, 'any')).toBe(false);
    process.env = prev as any;
  });

  test('token with non-number ts is rejected', () => {
    const prev = { ...process.env };
    process.env.CSRF_SECRET = 'test_secret';
    const crypto = require('crypto');
    const rawObj = { uid: 'user-x', ts: 'not-a-number' as any };
    const raw = Buffer.from(JSON.stringify(rawObj)).toString('base64url');
    const sig = crypto.createHmac('sha256', process.env.CSRF_SECRET).update(raw).digest('hex');
    const tok = `${raw}.${sig}`;
    expect(validateSignedCSRFToken(tok, 'user-x')).toBe(false);
    process.env = prev as any;
  });

  test('rejects expired or tampered tokens', () => {
    // Tamper user id
    const token = generateSignedCSRFToken('uid-a');
    expect(validateSignedCSRFToken(token, 'uid-b')).toBe(false);

    // Expired token: craft with old timestamp
    const crypto = require('crypto');
    const secret = process.env.CSRF_SECRET || 'dev_csrf_secret';
    const raw = Buffer.from(JSON.stringify({ uid: 'old-user', ts: Date.now() - (2 * 60 * 60 * 1000) })).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const expired = `${raw}.${sig}`;
    expect(validateSignedCSRFToken(expired, 'old-user')).toBe(false);
  });
});
