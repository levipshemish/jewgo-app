import { NextRequest } from 'next/server';

jest.mock('@/lib/server/admin-auth', () => ({
  requireSuperAdmin: jest.fn(async (_req: any) => ({ token: 't', adminRole: 'super_admin' })),
  requireAdminOrThrow: jest.fn(async (_req: any) => ({ token: 't', adminRole: 'super_admin' })),
}));

describe('API Route: /api/admin/roles', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch as any;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('POST returns backend error payload/status on !ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'forbidden' })
    });
    const { POST } = await import('@/app/api/admin/roles/route');
    const req = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ action: 'assign', user_id: 'u', role: 'moderator' }),
    } as any);
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });

  it('POST returns 503 on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net down'));
    const { POST } = await import('@/app/api/admin/roles/route');
    const req = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ action: 'assign', user_id: 'u', role: 'moderator' }),
    } as any);
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('GET proxies backend roles list', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { users: [], total: 0, page: 1, limit: 50, has_more: false } }),
    });
    const { GET } = await import('@/app/api/admin/roles/route');
    const req = new NextRequest('http://localhost:3000/api/admin/roles');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

