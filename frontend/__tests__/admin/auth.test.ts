import { getAdminRole } from '@/lib/admin/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('Admin Role Logic', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    or: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getAdminRole', () => {
    it('should return super_admin when user has issuperadmin=true', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { issuperadmin: true },
        error: null,
      });

      const result = await getAdminRole('test-user-id');
      expect(result).toBe('super_admin');
    });

    it('should return highest priority role from admin_roles table', async () => {
      // Mock user not being super admin
      mockSupabase.single.mockResolvedValueOnce({
        data: { issuperadmin: false },
        error: null,
      });

      // Mock admin roles with multiple roles
      mockSupabase.single.mockResolvedValueOnce({
        data: [
          { role: 'moderator' },
          { role: 'system_admin' },
          { role: 'data_admin' },
        ],
        error: null,
      });

      const result = await getAdminRole('test-user-id');
      expect(result).toBe('system_admin'); // Highest priority
    });

    it('should return moderator when no roles found', async () => {
      // Mock user not being super admin
      mockSupabase.single.mockResolvedValueOnce({
        data: { issuperadmin: false },
        error: null,
      });

      // Mock no admin roles
      mockSupabase.single.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getAdminRole('test-user-id');
      expect(result).toBe('moderator');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(getAdminRole('test-user-id')).rejects.toThrow('Admin RBAC lookup failed');
    });

    it('should respect role precedence: super_admin > system_admin > data_admin > moderator', async () => {
      // Mock user not being super admin
      mockSupabase.single.mockResolvedValueOnce({
        data: { issuperadmin: false },
        error: null,
      });

      // Mock admin roles with different priorities
      const testCases = [
        { roles: ['moderator', 'data_admin'], expected: 'data_admin' },
        { roles: ['data_admin', 'system_admin'], expected: 'system_admin' },
        { roles: ['system_admin', 'super_admin'], expected: 'super_admin' },
        { roles: ['moderator', 'data_admin', 'system_admin'], expected: 'system_admin' },
      ];

      for (const testCase of testCases) {
        mockSupabase.single.mockResolvedValueOnce({
          data: testCase.roles.map(role => ({ role })),
          error: null,
        });

        const result = await getAdminRole('test-user-id');
        expect(result).toBe(testCase.expected);
      }
    });

    it('should filter out invalid roles', async () => {
      // Mock user not being super admin
      mockSupabase.single.mockResolvedValueOnce({
        data: { issuperadmin: false },
        error: null,
      });

      // Mock admin roles with invalid role
      mockSupabase.single.mockResolvedValueOnce({
        data: [
          { role: 'moderator' },
          { role: 'invalid_role' },
          { role: 'data_admin' },
        ],
        error: null,
      });

      const result = await getAdminRole('test-user-id');
      expect(result).toBe('data_admin'); // Should ignore invalid_role
    });
  });
});
