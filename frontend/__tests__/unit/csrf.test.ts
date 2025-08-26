import { generateSignedCSRFToken, validateSignedCSRFToken } from '../../lib/admin/csrf';

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
});

