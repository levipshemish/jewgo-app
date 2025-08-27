import { describe, it, expect } from '@jest/globals';
import { validationUtils } from '@/lib/admin/validation';

describe('Admin Validation Utils', () => {
  describe('validateRestaurant', () => {
    it('should validate a valid restaurant create data', () => {
      const validData = {
        name: 'Test Restaurant',
        address: '123 Test St',
        city: 'Test City',
        state: 'FL',
        zip_code: '12345',
        phone_number: '555-1234',
        certifying_agency: 'Test Agency',
        kosher_category: 'dairy',
        listing_type: 'restaurant',
      };

      const result = validationUtils.validateRestaurant(validData, false);
      expect(result).toEqual(validData);
    });

    it('should validate a valid restaurant update data', () => {
      const validData = {
        id: 1,
        name: 'Updated Restaurant',
        city: 'Updated City',
      };

      const result = validationUtils.validateRestaurant(validData, true);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Updated Restaurant');
      expect(result.city).toBe('Updated City');
    });

    it('should reject invalid restaurant data', () => {
      const invalidData = {
        name: '', // Empty name should fail
        address: '123 Test St',
        city: 'Test City',
        state: 'FL',
      };

      expect(() => {
        validationUtils.validateRestaurant(invalidData, false);
      }).toThrow();
    });
  });

  describe('validateReview', () => {
    it('should validate a valid review create data', () => {
      const validData = {
        restaurant_id: 1,
        user_id: 'user123',
        user_name: 'Test User',
        rating: 5,
        title: 'Great Restaurant',
        content: 'Excellent food and service',
        status: 'active',
        verified_purchase: true,
      };

      const result = validationUtils.validateReview(validData, false);
      expect(result).toEqual(validData);
    });

    it('should validate a valid review update data', () => {
      const validData = {
        id: 'review123',
        rating: 4,
        title: 'Updated Review',
      };

      const result = validationUtils.validateReview(validData, true);
      expect(result.id).toBe('review123');
      expect(result.rating).toBe(4);
      expect(result.title).toBe('Updated Review');
    });

    it('should reject invalid review data', () => {
      const invalidData = {
        restaurant_id: 1,
        user_id: 'user123',
        rating: 6, // Invalid rating (should be 1-5)
        content: 'Test review',
      };

      expect(() => {
        validationUtils.validateReview(invalidData, false);
      }).toThrow();
    });
  });

  describe('validateUser', () => {
    it('should validate a valid user create data', () => {
      const validData = {
        email: 'test@example.com',
        name: 'Test User',
        issuperadmin: false,
      };

      const result = validationUtils.validateUser(validData, false);
      expect(result).toEqual(validData);
    });

    it('should validate a valid user update data', () => {
      const validData = {
        id: 'user123',
        name: 'Updated User',
        issuperadmin: true,
      };

      const result = validationUtils.validateUser(validData, true);
      expect(result.id).toBe('user123');
      expect(result.name).toBe('Updated User');
      expect(result.issuperadmin).toBe(true);
    });

    it('should reject invalid user data', () => {
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        name: 'Test User',
      };

      expect(() => {
        validationUtils.validateUser(invalidData, false);
      }).toThrow();
    });
  });

  describe('validatePagination', () => {
    it('should validate valid pagination parameters', () => {
      const validData = {
        page: 1,
        pageSize: 20,
      };

      const result = validationUtils.validatePagination(validData);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should clamp page to minimum value', () => {
      const data = {
        page: 0,
        pageSize: 20,
      };

      const result = validationUtils.validatePagination(data);
      expect(result.page).toBe(1);
    });

    it('should clamp pageSize to maximum value', () => {
      const data = {
        page: 1,
        pageSize: 1000,
      };

      const result = validationUtils.validatePagination(data);
      expect(result.pageSize).toBe(100);
    });
  });

  describe('sanitizeData', () => {
    it('should remove sensitive fields from data', () => {
      const data = {
        id: 1,
        name: 'Test Restaurant',
        email: 'test@example.com',
        password: 'secret123',
        api_key: 'key123',
        token: 'token123',
      };

      const result = validationUtils.sanitizeData(data);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Restaurant');
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
      expect(result.api_key).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should handle nested objects', () => {
      const data = {
        id: 1,
        user: {
          email: 'test@example.com',
          password: 'secret123',
        },
        config: {
          api_key: 'key123',
          public_setting: 'value',
        },
      };

      const result = validationUtils.sanitizeData(data);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBeUndefined();
      expect(result.config.api_key).toBeUndefined();
      expect(result.config.public_setting).toBe('value');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format Zod validation errors', () => {
      const mockZodError = {
        name: 'ZodError',
        errors: [
          { path: ['name'], message: 'Name is required' },
          { path: ['email'], message: 'Invalid email format' },
        ],
      };

      const result = validationUtils.formatValidationErrors(mockZodError as any);
      expect(result).toContain('Name is required');
      expect(result).toContain('Invalid email format');
    });
  });
});
