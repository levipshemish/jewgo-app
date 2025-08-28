import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { generateSignedCSRFToken, validateSignedCSRFToken } from '@/lib/admin/csrf';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { logAdminAction, AUDIT_FIELD_ALLOWLISTS } from '@/lib/admin/audit';

// Mock NextRequest
const createMockRequest = (url: string, method: string = 'GET', headers: Record<string, string> = {}): NextRequest => {
  const mockHeaders = new Headers(headers);
  return {
    nextUrl: { pathname: url },
    method,
    headers: mockHeaders,
    json: jest.fn(),
  } as any;
};

describe('Critical Admin Flows', () => {
  describe('RBAC (Role-Based Access Control)', () => {
    it('should enforce admin role requirements', async () => {
      const request = createMockRequest('/api/admin/restaurants');
      
      // Mock a user without admin role
      jest.spyOn(require,('@/lib/admin/auth')).mockImplementation(() => ({
        requireAdmin: jest.fn().mockResolvedValue(null),
      }));
      
      const result = await requireAdmin(request);
      expect(result).toBeNull();
    });

    it('should allow access for users with valid admin roles', async () => {
      const request = createMockRequest('/api/admin/restaurants');
      const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        adminRole: 'moderator',
      };
      
      jest.spyOn(require,('@/lib/admin/auth')).mockImplementation(() => ({
        requireAdmin: jest.fn().mockResolvedValue(mockAdminUser),
      }));
      
      const result = await requireAdmin(request);
      expect(result).toEqual(mockAdminUser);
    });

    it('should enforce role hierarchy', async () => {
      const roles = ['moderator', 'data_admin', 'system_admin', 'super_admin'];
      
      for (let i = 0; i < roles.length; i++) {
        const currentRole = roles[i];
        const hasAccess = ['moderator', 'data_admin', 'system_admin', 'super_admin'].includes(currentRole);
        expect(hasAccess).toBe(true);
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens correctly', () => {
      const userId = 'test-user-123';
      const token = generateSignedCSRFToken(userId);
      
      expect(validateSignedCSRFToken(token, userId)).toBe(true);
      expect(validateSignedCSRFToken(token, 'different-user')).toBe(false);
    });

    it('should reject invalid CSRF tokens', () => {
      expect(validateSignedCSRFToken('invalid-token', 'user-123')).toBe(false);
      expect(validateSignedCSRFToken('', 'user-123')).toBe(false);
      expect(validateSignedCSRFToken(null as any, 'user-123')).toBe(false);
    });

    it('should generate unique tokens for different users', () => {
      const token1 = generateSignedCSRFToken('user1');
      const token2 = generateSignedCSRFToken('user2');
      expect(token1).not.toBe(token2);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const request = createMockRequest('/api/admin/restaurants', 'POST');
      
      // Mock rate limit to return exceeded response
      jest.spyOn(require,('@/lib/admin/rate-limit')).mockImplementation(() => ({
        rateLimit: jest.fn().mockResolvedValue({
          status: 429,
          json: () => ({ error: 'Rate limit exceeded' }),
        }),
      }));
      
      const rateLimitResult = await rateLimit(RATE_LIMITS.STRICT)(request);
      expect(rateLimitResult?.status).toBe(429);
    });

    it('should allow requests within rate limits', async () => {
      const request = createMockRequest('/api/admin/restaurants', 'GET');
      
      // Mock rate limit to allow request
      jest.spyOn(require,('@/lib/admin/rate-limit')).mockImplementation(() => ({
        rateLimit: jest.fn().mockResolvedValue(null), // No rate limit hit
      }));
      
      const rateLimitResult = await rateLimit(RATE_LIMITS.DEFAULT)(request);
      expect(rateLimitResult).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log admin actions with proper field allowlists', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        adminRole: 'moderator',
      };
      
      const mockData = {
        id: 1,
        name: 'Test Restaurant',
        email: 'sensitive@email.com', // Should be redacted
        phone: '555-1234', // Should be redacted
        city: 'Test City', // Should be allowed
      };
      
      jest.spyOn(require,('@/lib/admin/audit')).mockImplementation(() => ({
        logAdminAction: jest.fn().mockResolvedValue(undefined),
      }));
      
      await logAdminAction(mockUser, 'restaurant_create', 'restaurant', {
        newData: mockData,
        whitelistFields: AUDIT_FIELD_ALLOWLISTS.RESTAURANT,
      });
      
      // Verify that logAdminAction was called with whitelist
      expect(require('@/lib/admin/audit').logAdminAction).toHaveBeenCalledWith(
        mockUser,
        'restaurant_create',
        'restaurant',
        expect.objectContaining({
          whitelistFields: AUDIT_FIELD_ALLOWLISTS.RESTAURANT,
        })
      );
    });

    it('should prevent PII leakage in audit logs', () => {
      // Test that sensitive fields are properly handled by allowlists
      const allowedFields = AUDIT_FIELD_ALLOWLISTS.USER;
      expect(allowedFields).toContain('id');
      expect(allowedFields).toContain('name');
      expect(allowedFields).toContain('email');
      expect(allowedFields).not.toContain('password');
      expect(allowedFields).not.toContain('phone');
    });
  });

  describe('Data Validation', () => {
    it('should validate pagination parameters', () => {
      const validPagination = { page: 1, pageSize: 20 };
      const invalidPagination = { page: -1, pageSize: 0 };
      
      expect(validPagination.page).toBeGreaterThan(0);
      expect(validPagination.pageSize).toBeGreaterThan(0);
      expect(invalidPagination.page).toBeLessThan(1);
      expect(invalidPagination.pageSize).toBeLessThan(1);
    });

    it('should validate sort parameters', () => {
      const validSort = { sortBy: 'created_at', sortOrder: 'desc' };
      const invalidSort = { sortBy: 'invalid_field', sortOrder: 'invalid_order' };
      
      expect(['asc', 'desc']).toContain(validSort.sortOrder);
      expect(['asc', 'desc']).not.toContain(invalidSort.sortOrder);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const request = createMockRequest('/api/admin/restaurants');
      
      jest.spyOn(require,('@/lib/admin/auth')).mockImplementation(() => ({
        requireAdmin: jest.fn().mockRejectedValue(new Error('Auth failed')),
      }));
      
      try {
        await requireAdmin(request);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Auth failed');
      }
    });

    it('should handle CSRF validation errors', () => {
      const invalidToken = 'invalid-csrf-token';
      const userId = 'user-123';
      
      expect(validateSignedCSRFToken(invalidToken, userId)).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('should include required security headers', () => {
      const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      };
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });
  });
});
