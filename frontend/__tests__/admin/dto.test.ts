import { mapUsersToApiResponse, mapApiRequestToUser } from '@/lib/admin/dto/user';

describe('User DTO Functions', () => {
  describe('mapUsersToApiResponse', () => {
    it('should map database users to API response format', () => {
      const dbUsers = [
        {
          id: 'user1',
          email: 'test@example.com',
          name: 'Test User',
          issuperadmin: true,
          createdat: '2023-01-01T00:00:00Z',
          updatedat: '2023-01-02T00:00:00Z',
          emailverified: true,
          avatar_url: 'https://example.com/avatar.jpg',
          provider: 'google',
        },
        {
          id: 'user2',
          email: 'test2@example.com',
          name: null,
          issuperadmin: false,
          createdat: null,
          updatedat: null,
          emailverified: false,
          avatar_url: null,
          provider: null,
        },
      ];

      const result = mapUsersToApiResponse(dbUsers);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        isSuperAdmin: true,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-02T00:00:00Z'),
        emailVerified: true,
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
      });
      expect(result[1]).toEqual({
        id: 'user2',
        email: 'test2@example.com',
        name: undefined,
        isSuperAdmin: false,
        createdAt: undefined,
        updatedAt: undefined,
        emailVerified: false,
        avatarUrl: undefined,
        provider: undefined,
      });
    });

    it('should handle empty array', () => {
      const result = mapUsersToApiResponse([]);
      expect(result).toEqual([]);
    });
  });

  describe('mapApiRequestToUser', () => {
    it('should map API request to database fields', () => {
      const apiRequest = {
        email: 'test@example.com',
        name: 'Test User',
        isSuperAdmin: true,
        emailVerified: true,
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
      };

      const result = mapApiRequestToUser(apiRequest);

      expect(result).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        issuperadmin: true,
        emailverified: true,
        avatar_url: 'https://example.com/avatar.jpg',
        provider: 'google',
      });
    });

    it('should handle null values', () => {
      const apiRequest = {
        name: null,
        avatarUrl: null,
      };

      const result = mapApiRequestToUser(apiRequest);

      expect(result).toEqual({
        name: null,
        avatar_url: null,
      });
    });

    it('should handle undefined values', () => {
      const apiRequest = {
        email: 'test@example.com',
        // name is undefined
      };

      const result = mapApiRequestToUser(apiRequest);

      expect(result).toEqual({
        email: 'test@example.com',
        // name should not be included
      });
      expect(result.name).toBeUndefined();
    });

    it('should handle boolean conversions', () => {
      const apiRequest = {
        isSuperAdmin: false,
        emailVerified: false,
      };

      const result = mapApiRequestToUser(apiRequest);

      expect(result).toEqual({
        issuperadmin: false,
        emailverified: false,
      });
    });

    it('should handle empty object', () => {
      const result = mapApiRequestToUser({});
      expect(result).toEqual({});
    });
  });
});
