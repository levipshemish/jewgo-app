import { NextRequest } from 'next/server';

jest.mock('@/lib/server/admin-auth', () => ({
  requireAdminOrThrow: jest.fn(async (_req: any) => ({ adminRole: '', token: 't' })),
}));

describe('RBAC Middleware', () => {
  it('throws 403 for invalid/missing role', async () => {
    const { requireModerator } = await import('@/lib/server/rbac-middleware');
    const req = new NextRequest('http://localhost:3000/api/admin/test');
    await expect(requireModerator(req)).rejects.toThrow('Invalid or missing admin role');
  });
});

