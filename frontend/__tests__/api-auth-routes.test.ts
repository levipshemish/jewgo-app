import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInAnonymously: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })),
    upsert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
  })),
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase)
}));

jest.mock('@/lib/utils/auth-utils.server', () => ({
  validateCSRFServer: jest.fn(() => true),
  validateSupabaseFeaturesWithLogging: jest.fn(async () => true),
}));

jest.mock('@/lib/rate-limiting', () => ({
  checkRateLimit: jest.fn(async () => ({ allowed: true, remaining_attempts: 2, reset_in_seconds: 300 })),
}));

jest.mock('@/lib/turnstile', () => ({
  verifyTurnstile: jest.fn(async () => ({ success: true, hostname: 'localhost' }))
}));

jest.mock('@/lib/anti-replay', () => ({
  consumeCaptchaTokenOnce: jest.fn(async () => {})
}));

// Minimal NextRequest-like helper
function makeRequest(method: string, url: string, opts: any = {}) {
  const headersObj: Record<string,string> = opts.headers || {};
  return {
    method,
    headers: {
      get: (name: string) => headersObj[name.toLowerCase()] || headersObj[name] || null,
    },
    json: async () => opts.json || {},
    url,
  } as any;
}

describe('API routes: auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/auth/anonymous', () => {
    it('denies when CSRF invalid', async () => {
      jest.spyOn(require('@/lib/utils/auth-utils.server'), 'validateCSRFServer').mockReturnValue(false);
      const { POST } = await import('@/app/api/auth/anonymous/route');
      const req = makeRequest('POST', 'http://localhost/api/auth/anonymous', { headers: { origin: 'http://localhost' } });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('rate limits when backend denies', async () => {
      jest.spyOn(require('@/lib/utils/auth-utils.server'), 'validateCSRFServer').mockReturnValue(true);
      jest.spyOn(require('@/lib/rate-limiting'), 'checkRateLimit').mockResolvedValue({ allowed: false, remaining_attempts: 0, reset_in_seconds: 300 });
      const { POST } = await import('@/app/api/auth/anonymous/route');
      const req = makeRequest('POST', 'http://localhost/api/auth/anonymous', { headers: { origin: 'http://localhost', referer: 'http://localhost/auth/signin' } });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it('succeeds when all checks pass', async () => {
      jest.spyOn(require('@/lib/utils/auth-utils.server'), 'validateCSRFServer').mockReturnValue(true);
      jest.spyOn(require('@supabase/ssr'), 'createServerClient').mockReturnValue(mockSupabase as any);
      mockSupabase.auth.signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon' } }, error: null });

      const { POST } = await import('@/app/api/auth/anonymous/route');
      const req = makeRequest('POST', 'http://localhost/api/auth/anonymous', {
        headers: { origin: 'http://localhost', referer: 'http://localhost/auth/signin' },
        json: { turnstileToken: 'token1234567890' }
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe('/api/auth/sync-user', () => {
    it('requires authentication', async () => {
      jest.spyOn(require('@/lib/utils/auth-utils.server'), 'validateCSRFServer').mockReturnValue(true);
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('no user') });
      const { POST } = await import('@/app/api/auth/sync-user/route');
      const req = makeRequest('POST', 'http://localhost/api/auth/sync-user', { headers: { origin: 'http://localhost', referer: 'http://localhost/auth/callback' }, json: {} });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('upserts profile and returns ok', async () => {
      jest.spyOn(require('@/lib/utils/auth-utils.server'), 'validateCSRFServer').mockReturnValue(true);
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'uid', user_metadata: {} } }, error: null });

      // select existing -> not found
      const selectChain = { single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) };
      (mockSupabase.from as any).mockReturnValueOnce({ select: jest.fn(() => ({ eq: jest.fn(() => selectChain) })) });

      // upsert -> ok
      const upsertChain = { single: jest.fn().mockResolvedValue({ data: {}, error: null }) };
      ;(mockSupabase.from as any).mockReturnValueOnce({ upsert: jest.fn(() => ({ select: jest.fn(() => upsertChain) })) });

      const { POST } = await import('@/app/api/auth/sync-user/route');
      const req = makeRequest('POST', 'http://localhost/api/auth/sync-user', {
        headers: { origin: 'http://localhost', referer: 'http://localhost/auth/callback' },
        json: { name: 'User Name', avatar_url: 'http://img' }
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});

