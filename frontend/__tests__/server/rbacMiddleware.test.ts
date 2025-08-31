import { NextRequest } from 'next/server';

jest.mock('@/lib/server/admin-auth', () => ({
  requireAdminOrThrow: jest.fn(async () => ({ adminRole: 'moderator' })),
}));

describe('RBAC middleware helpers', () => {
  it('withMinRole throws using admin error helper', async () => {
    const { requireSuperAdmin } = await import('@/lib/server/rbac-middleware');
    const req = new NextRequest('http://localhost:3000/api/admin/test');
    await expect(requireSuperAdmin(req)).rejects.toThrow('Insufficient permissions');
  });

  it('invalid role throws invalid admin role', async () => {
    jest.resetModules();
    jest.doMock('@/lib/server/admin-auth', () => ({
      requireAdminOrThrow: jest.fn(async () => ({ adminRole: '' })),
    }));
    const { requireModerator } = await import('@/lib/server/rbac-middleware');
    const req = new NextRequest('http://localhost:3000/api/admin/test');
    await expect(requireModerator(req)).rejects.toThrow('Invalid or missing admin role');
  });
});

