import { NextRequest } from 'next/server';

jest.mock('@/lib/server/admin-auth', () => ({
  requireAdminOrThrow: jest.fn(async () => ({ token: 't', adminRole: 'super_admin' })),
  requireSuperAdmin: jest.fn(async () => ({ token: 't', adminRole: 'super_admin' })),
}));

describe('admin roles route (GET/POST) normalization', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch as any; jest.resetModules(); });

  it('GET normalizes flattened payload to success envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ users: [], total: 0, page: 1, limit: 50, has_more: false }) });
    const { GET } = await import('@/app/api/admin/roles/route');
    const res = await GET(new NextRequest('http://localhost:3000/api/admin/roles'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('users');
  });

  it('POST passes through backend 403 message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Insufficient permissions: super_admin role required' }) });
    const { POST } = await import('@/app/api/admin/roles/route');
    const req = new NextRequest('http://localhost:3000/api/admin/roles', { method: 'POST', body: JSON.stringify({ action: 'assign', user_id: 'u', role: 'moderator' }) } as any);
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/super_admin/);
  });
});

