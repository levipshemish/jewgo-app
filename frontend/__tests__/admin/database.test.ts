import { AdminDatabaseService } from '@/lib/admin/database';

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    restaurant: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('AdminDatabaseService', () => {
  describe('coerceId', () => {
    it('should coerce restaurant ID to number', () => {
      const result = AdminDatabaseService.coerceId('restaurant', '123');
      expect(result).toBe(123);
    });

    it('should coerce restaurantImage ID to number', () => {
      const result = AdminDatabaseService.coerceId('restaurantImage', '456');
      expect(result).toBe(456);
    });

    it('should keep _user ID as string', () => {
      const result = AdminDatabaseService.coerceId('_user', '_user-123');
      expect(result).toBe('_user-123');
    });

    it('should keep review ID as string', () => {
      const result = AdminDatabaseService.coerceId('review', 'review-456');
      expect(result).toBe('review-456');
    });

    it('should keep marketplace ID as string', () => {
      const result = AdminDatabaseService.coerceId('marketplace', 'marketplace-789');
      expect(result).toBe('marketplace-789');
    });

    it('should handle numeric input for numeric models', () => {
      const result = AdminDatabaseService.coerceId('restaurant', 123);
      expect(result).toBe(123);
    });

    it('should handle string input for string models', () => {
      const result = AdminDatabaseService.coerceId('_user', '_user-123');
      expect(result).toBe('_user-123');
    });
  });

  describe('getSearchFields', () => {
    it('should return search fields for restaurant', () => {
      const result = AdminDatabaseService.getSearchFields('restaurant');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return search fields for _user', () => {
      const result = AdminDatabaseService.getSearchFields('_user');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return search fields for review', () => {
      const result = AdminDatabaseService.getSearchFields('review');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDefaultSortField', () => {
    it('should return default sort field for restaurant', () => {
      const result = AdminDatabaseService.getDefaultSortField('restaurant');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return default sort field for _user', () => {
      const result = AdminDatabaseService.getDefaultSortField('_user');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return default sort field for review', () => {
      const result = AdminDatabaseService.getDefaultSortField('review');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getValidSortFields', () => {
    it('should return valid sort fields for restaurant', () => {
      const result = AdminDatabaseService.getValidSortFields('restaurant');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return valid sort fields for _user', () => {
      const result = AdminDatabaseService.getValidSortFields('_user');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return valid sort fields for review', () => {
      const result = AdminDatabaseService.getValidSortFields('review');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('validateSortField', () => {
    it('should validate valid sort field', () => {
      const result = AdminDatabaseService.validateSortField('restaurant', 'name');
      expect(result).toBe(true);
    });

    it('should reject invalid sort field', () => {
      const result = AdminDatabaseService.validateSortField('restaurant', 'invalid_field');
      expect(result).toBe(false);
    });
  });

  describe('supportsSoftDelete', () => {
    it('should return true for restaurant', () => {
      const result = AdminDatabaseService.supportsSoftDelete('restaurant');
      expect(result).toBe(true);
    });

    it('should return true for _user', () => {
      const result = AdminDatabaseService.supportsSoftDelete('_user');
      expect(result).toBe(true);
    });

    it('should return false for review', () => {
      const result = AdminDatabaseService.supportsSoftDelete('review');
      expect(result).toBe(false);
    });

    it('should return false for restaurantImage', () => {
      const result = AdminDatabaseService.supportsSoftDelete('restaurantImage');
      expect(result).toBe(false);
    });
  });

  describe('getSoftDeleteField', () => {
    it('should return soft delete field for restaurant', () => {
      const result = AdminDatabaseService.getSoftDeleteField('restaurant');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return soft delete field for _user', () => {
      const result = AdminDatabaseService.getSoftDeleteField('_user');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return null for review', () => {
      const result = AdminDatabaseService.getSoftDeleteField('review');
      expect(result).toBeNull();
    });
  });
});
