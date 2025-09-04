import { getAdminRole } from '@/lib/server/admin-utils';

// Mock the user data for testing
const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  isSuperAdmin: false,
  adminRole: 'moderator' as const,
  roleLevel: 1,
  permissions: ['read', 'write']
};

describe('Admin Role Logic', () => {
  describe('getAdminRole', () => {
    it('should return super_admin when user has isSuperAdmin=true', () => {
      const superAdminUser = { ...mockUser, isSuperAdmin: true, adminRole: 'super_admin' as const };
      const result = getAdminRole(superAdminUser);
      expect(result).toBe('super_admin');
    });

    it('should return admin role from user object', () => {
      const result = getAdminRole(mockUser);
      expect(result).toBe('moderator');
    });

    it('should return null when user is not admin', () => {
      const nonAdminUser = { ...mockUser, adminRole: null, isSuperAdmin: false };
      const result = getAdminRole(nonAdminUser);
      expect(result).toBe(null);
    });

    it('should return null when no user provided', () => {
      const result = getAdminRole(null);
      expect(result).toBe(null);
    });

    it('should respect role precedence: super_admin > system_admin > data_admin > moderator', () => {
      const testCases = [
        { user: { ...mockUser, adminRole: 'moderator' as const }, expected: 'moderator' },
        { user: { ...mockUser, adminRole: 'data_admin' as const }, expected: 'data_admin' },
        { user: { ...mockUser, adminRole: 'system_admin' as const }, expected: 'system_admin' },
        { user: { ...mockUser, adminRole: 'super_admin' as const, isSuperAdmin: true }, expected: 'super_admin' },
      ];

      for (const testCase of testCases) {
        const result = getAdminRole(testCase.user);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should handle undefined adminRole gracefully', () => {
      const userWithUndefinedRole = { ...mockUser, adminRole: undefined };
      const result = getAdminRole(userWithUndefinedRole);
      expect(result).toBe(undefined);
    });
  });
});
