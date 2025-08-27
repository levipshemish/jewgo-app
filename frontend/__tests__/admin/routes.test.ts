import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock the auth and database modules
jest.mock('@/lib/admin/auth', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/admin/database', () => ({
  AdminDatabaseService: {
    getPaginatedData: jest.fn(),
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
    deleteRecord: jest.fn(),
  },
}));

jest.mock('@/lib/admin/csrf', () => ({
  validateSignedCSRFToken: jest.fn(),
}));

jest.mock('@/lib/admin/audit', () => ({
  logAdminAction: jest.fn(),
}));

jest.mock('@/lib/admin/rate-limit', () => ({
  rateLimit: jest.fn(() => jest.fn(() => null)),
  RATE_LIMITS: {
    DEFAULT: { limit: 100, windowMs: 60000 },
    STRICT: { limit: 30, windowMs: 60000 },
  },
}));

describe('Admin API Routes', () => {
  let mockRequest: NextRequest;

  beforeAll(() => {
    // Create a mock request
    mockRequest = new NextRequest('http://localhost:3000/api/admin/test', {
      method: 'GET',
      headers: {
        'x-csrf-token': 'mock-csrf-token',
      },
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('CSRF Route', () => {
    it('should return CSRF token for authenticated admin', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      const { generateSignedCSRFToken } = await import('@/lib/admin/csrf');
      
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'super_admin',
      });
      
      (generateSignedCSRFToken as jest.Mock).mockReturnValue('mock-signed-token');

      const { GET } = await import('@/app/api/admin/csrf/route');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(data.token).toBe('mock-signed-token');
    });

    it('should return 401 for unauthenticated user', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      (requireAdmin as jest.Mock).mockResolvedValue(null);

      const { GET } = await import('@/app/api/admin/csrf/route');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Restaurants Route', () => {
    it('should return paginated restaurants for authenticated admin', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      const { AdminDatabaseService } = await import('@/lib/admin/database');
      
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'super_admin',
        permissions: ['restaurant:view'],
      });
      
      (AdminDatabaseService.getPaginatedData as jest.Mock).mockResolvedValue({
        data: [
          { id: 1, name: 'Test Restaurant', city: 'Test City' },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const { GET } = await import('@/app/api/admin/restaurants/route');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.data).toHaveLength(1);
    });

    it('should return 403 for insufficient permissions', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'moderator',
        permissions: [], // No restaurant view permission
      });

      const { GET } = await import('@/app/api/admin/restaurants/route');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('Reviews Route', () => {
    it('should return paginated reviews for authenticated admin', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      const { AdminDatabaseService } = await import('@/lib/admin/database');
      
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'super_admin',
        permissions: ['review:view'],
      });
      
      (AdminDatabaseService.getPaginatedData as jest.Mock).mockResolvedValue({
        data: [
          { id: 'review123', rating: 5, title: 'Great Review' },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const { GET } = await import('@/app/api/admin/reviews/route');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.data).toHaveLength(1);
    });
  });

  describe('Users Route', () => {
    it('should return paginated users for authenticated admin', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      const { AdminDatabaseService } = await import('@/lib/admin/database');
      
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'super_admin',
        permissions: ['user:view'],
      });
      
      (AdminDatabaseService.getPaginatedData as jest.Mock).mockResolvedValue({
        data: [
          { id: 'user123', email: 'user@example.com', name: 'Test User' },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const { GET } = await import('@/app/api/admin/users/route');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.data).toHaveLength(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to POST requests', async () => {
      const { rateLimit } = await import('@/lib/admin/rate-limit');
      const mockRateLimit = jest.fn(() => null);
      (rateLimit as jest.Mock).mockReturnValue(mockRateLimit);

      const { requireAdmin } = await import('@/lib/admin/auth');
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'super_admin',
        permissions: ['restaurant:edit'],
      });

      const { validateSignedCSRFToken } = await import('@/lib/admin/csrf');
      (validateSignedCSRFToken as jest.Mock).mockReturnValue(true);

      const postRequest = new NextRequest('http://localhost:3000/api/admin/restaurants', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'mock-csrf-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Restaurant' }),
      });

      const { POST } = await import('@/app/api/admin/restaurants/route');
      await POST(postRequest);

      expect(mockRateLimit).toHaveBeenCalledWith(postRequest);
    });
  });

  describe('CSRF Validation', () => {
    it('should reject requests without valid CSRF token', async () => {
      const { requireAdmin } = await import('@/lib/admin/auth');
      const { validateSignedCSRFToken } = await import('@/lib/admin/csrf');
      
      (requireAdmin as jest.Mock).mockResolvedValue({
        id: 'admin123',
        email: 'admin@example.com',
        adminRole: 'super_admin',
        permissions: ['restaurant:edit'],
      });
      
      (validateSignedCSRFToken as jest.Mock).mockReturnValue(false);

      const postRequest = new NextRequest('http://localhost:3000/api/admin/restaurants', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'invalid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Restaurant' }),
      });

      const { POST } = await import('@/app/api/admin/restaurants/route');
      const response = await POST(postRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(data.code).toBe('CSRF');
    });
  });
});
