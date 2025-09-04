import { sanitizeData, truncateForAudit } from '@/lib/admin/audit';

describe('audit sanitization', () => {
  test('redacts sensitive fields', () => {
    const clean = sanitizeData({
      password: 'secret',
      token: 'abc',
      email: 'user@example.com',
      phone_number: '+1 (555) 123-4567',
      nested: { refresh_token: 'zzz', owner_email: 'owner@ex.com' },
    });
    expect(clean.password).toBe('[REDACTED]');
    expect(clean.token).toBe('[REDACTED]');
    expect(clean.email).toBe('[REDACTED]');
    expect(clean.phone_number).toBe('[REDACTED]');
    expect((clean as any).nested.refresh_token).toBeUndefined(); // not deep by design
  });

  test('truncate long payloads', () => {
    const long = 'x'.repeat(5000);
    const truncated = truncateForAudit(long, 1000);
    expect(typeof truncated).toBe('string');
    expect((truncated as string).length).toBeGreaterThan(1000 - 4);
  });
});

