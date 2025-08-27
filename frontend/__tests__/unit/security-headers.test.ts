import { buildSecurityHeaders, corsHeaders } from '@/lib/middleware/security';

describe('security headers', () => {
  function mockReq(origin?: string) {
    return {
      headers: new Headers(origin ? { origin } : {}),
      nextUrl: { origin: 'http://localhost' },
    } as any;
  }

  test('buildSecurityHeaders returns base headers', () => {
    const req = mockReq();
    const headers = buildSecurityHeaders(req);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Vary']).toBe('Origin');
  });

  test('corsHeaders includes allow headers', () => {
    const req = mockReq('http://localhost');
    const headers = corsHeaders(req) as any;
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Headers']).toContain('x-csrf-token');
  });
});

