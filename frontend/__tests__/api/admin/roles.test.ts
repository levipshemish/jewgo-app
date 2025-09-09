import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/roles/route';
import { GET as getAvailable } from '@/app/api/admin/roles/available/route';
import { withMinRole, withPermission, withAnyPermission } from '@/lib/server/rbac-middleware';

// Mock dependencies
jest.mock('@/lib/server/admin-auth', () => ({
  requireAdminOrThrow: jest.fn(),
}));

jest.mock('@/lib/server/rbac-middleware', () => ({
  withMinRole: jest.fn(),
  withPermission: jest.fn(),
  withAnyPermission: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/lib/server/route-helpers', () => ({
  handleRoute: jest.fn((handler) => handler()),
}));

const mockRequireAdminOrThrow = require('@/lib/server/admin-auth').requireAdminOrThrow;
const mockWithPermission = require('@/lib/server/rbac-middleware').withPermission;
const mockRequireSuperAdmin = require('@/lib/server/rbac-middleware').requireSuperAdmin;

describe('Admin Roles API Routes', () => {
  let mockRequest: NextRequest;
  let mockAdminUser: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock admin user
    mockAdminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      adminRole: 'super_admin',
      roleLevel: 4,
      token: 'mock-jwt-token',
    };

    // Mock request
    mockRequest = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'GET',
    });

    // Setup default mock implementations
    mockRequireAdminOrThrow.mockResolvedValue(mockAdminUser);
    mockWithPermission.mockImplementation((permission) => {
      return async (_request: NextRequest) => {
        if (permission === 'role:manage') {
          return mockAdminUser;
        }
        throw new Error('Insufficient permissions');
      };
    });
    mockRequireSuperAdmin.mockResolvedValue(mockAdminUser);
  });

  describe('GET /api/admin/roles', () => {
    it('should return 200 with role data for authorized user', async () => {
      // Mock successful backend response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            users: [
              {
                id: 'user-1',
                name: 'Test User',
                email: 'test@example.com',
                role: 'moderator',
                role_level: 1,
                assigned_at: '2024-01-01T00:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            limit: 50,
            has_more: false,
          },
          message: 'Success',
        }),
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].role).toBe('moderator');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockRequireAdminOrThrow.mockRejectedValue(new Error('Authentication required'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should return 403 for user without role management permission', async () => {
      mockWithPermission.mockImplementation(() => {
        return async () => {
          throw new Error('Insufficient permissions');
        };
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Mock rate limiter to reject
      const _originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should handle backend errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('POST /api/admin/roles', () => {
    beforeEach(() => {
      mockRequest = new NextRequest('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'assign',
          user_id: 'user-123',
          role: 'moderator',
          expires_at: '2024-12-31T23:59:59Z',
          notes: 'Test assignment',
        }),
      });
    });

    it('should return 200 for successful role assignment', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            user_id: 'user-123',
            role: 'moderator',
            assigned_by: 'admin-123',
            assigned_at: '2024-01-01T00:00:00Z',
          },
          message: 'Role assigned successfully',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Role assigned successfully');
    });

    it('should return 200 for successful role revocation', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'revoke',
          user_id: 'user-123',
          role: 'moderator',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            user_id: 'user-123',
            role: 'moderator',
            removed_by: 'admin-123',
            removed_at: '2024-01-01T00:00:00Z',
          },
          message: 'Role revoked successfully',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Role revoked successfully');
    });

    it('should return 400 for invalid request body', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'assign',
          // Missing required fields
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 403 for insufficient permissions', async () => {
      mockRequireSuperAdmin.mockRejectedValue(new Error('Insufficient permissions'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 409 for role assignment conflict', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'User already has this role',
          error_type: 'conflict',
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('User already has this role');
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Mock rate limiter to reject
      const _originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Rate limit exceeded');
    });
  });

  describe('GET /api/admin/roles/available', () => {
    it('should return 200 with available roles', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            name: 'moderator',
            level: 1,
            description: 'Content moderation',
            permissions: ['content:moderate', 'user:view'],
          },
          {
            name: 'super_admin',
            level: 4,
            description: 'Full system access',
            permissions: ['role:manage', 'admin:all'],
          },
        ],
      });

      const response = await getAvailable(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('moderator');
      expect(data.data[1].name).toBe('super_admin');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockRequireAdminOrThrow.mockRejectedValue(new Error('Authentication required'));

      const response = await getAvailable(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });
  });
});

describe('RBAC Middleware', () => {
  let mockRequest: NextRequest;
  let mockAdminUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAdminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      adminRole: 'system_admin',
      roleLevel: 3,
    };

    mockRequest = new NextRequest('http://localhost:3000/api/admin/roles', {
      method: 'GET',
    });

    mockRequireAdminOrThrow.mockResolvedValue(mockAdminUser);
  });

  describe('withMinRole', () => {
    it('should allow access for user with sufficient role level', async () => {
      const minRoleHandler = withMinRole(2); // data_admin level
      const result = await minRoleHandler(mockRequest);

      expect(result).toEqual(mockAdminUser);
    });

    it('should deny access for user with insufficient role level', async () => {
      const minRoleHandler = withMinRole(4); // super_admin level
      
      await expect(minRoleHandler(mockRequest)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('withPermission', () => {
    it('should allow access for super_admin regardless of permission', async () => {
      mockAdminUser.adminRole = 'super_admin';
      mockAdminUser.roleLevel = 4;

      const permissionHandler = withPermission('role:manage');
      const result = await permissionHandler(mockRequest);

      expect(result).toEqual(mockAdminUser);
    });

    it('should deny access for user without required permission', async () => {
      const permissionHandler = withPermission('role:manage');
      
      await expect(permissionHandler(mockRequest)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('withAnyPermission', () => {
    it('should allow access if user has any of the required permissions', async () => {
      const anyPermissionHandler = withAnyPermission(['user:view', 'data:export']);
      const result = await anyPermissionHandler(mockRequest);

      expect(result).toEqual(mockAdminUser);
    });

    it('should deny access if user has none of the required permissions', async () => {
      const anyPermissionHandler = withAnyPermission(['role:manage', 'admin:all']);
      
      await expect(anyPermissionHandler(mockRequest)).rejects.toThrow('Insufficient permissions');
    });
  });
});
