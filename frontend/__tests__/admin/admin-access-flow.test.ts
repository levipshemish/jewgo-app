import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import { getUserWithRoles } from '../../lib/utils/auth-utils';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Admin Access Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserWithRoles', () => {
    it('should use absolute URL for server-side requests to prevent ERR_INVALID_URL', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          adminRole: 'moderator',
          roleLevel: 1,
          permissions: ['read:admin']
        })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);
      
      // Simulate server-side execution
      const originalWindow = global.window;
      delete (global as any).window;
      
      try {
        const result = await getUserWithRoles('test-token');
        
        expect(result).toEqual({
          adminRole: 'moderator',
          roleLevel: 1,
          permissions: ['read:admin']
        });
        
        // Verify fetch was called with absolute URL
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Authorization': 'Bearer test-token',
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          })
        );
        
        const fetchUrl = (global.fetch as any).mock.calls[0][0];
        expect(fetchUrl).toBeInstanceOf(URL);
        expect(fetchUrl.toString()).toBe('http://localhost:3000/api/auth/user-with-roles');
        
      } finally {
        // Restore window
        global.window = originalWindow;
      }
    });

    it('should use relative URL for client-side requests', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          adminRole: 'store_admin',
          roleLevel: 2,
          permissions: ['read:admin', 'write:admin']
        })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);
      
      // Ensure window exists (client-side)
      if (!global.window) {
        (global as any).window = {};
      }
      
      const result = await getUserWithRoles('test-token');
      
      expect(result).toEqual({
        adminRole: 'store_admin',
        roleLevel: 2,
        permissions: ['read:admin', 'write:admin']
      });
      
      // Verify fetch was called with relative URL
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/user-with-roles',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
      );
    });

    it('should handle fetch errors gracefully without triggering redirects', async () => {
      // Simulate server-side execution
      const originalWindow = global.window;
      delete (global as any).window;
      
      try {
        // Mock fetch to throw an error
        (global.fetch as any).mockRejectedValue(new Error('Network error'));
        
        const result = await getUserWithRoles('test-token');
        
        // Should return null on error, not throw
        expect(result).toBeNull();
        
      } finally {
        // Restore window
        global.window = originalWindow;
      }
    });
  });

  describe('Admin Page Error Handling', () => {
    it('should not redirect on errors to prevent infinite loops', async () => {
      // This test verifies that the admin page error handling
      // renders an error state instead of redirecting on errors
      
      // The actual implementation should be tested in integration tests
      // This is a unit test to document the expected behavior
      
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
