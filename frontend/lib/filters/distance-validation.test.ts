import { 
  validateDistanceFields, 
  getCanonicalDistanceMi, 
  normalizeDistanceFields, 
  toApiFormat, 
  MultipleDistanceFieldsError,
  validateFilterDistanceFields,
  assembleSafeFilters
} from './distance-validation';

// Test data
const testFilters = {
  distanceMi: 10,
  maxDistanceMi: 15,
  maxDistance: 16093, // 10 miles in meters
  radius: 8047, // 5 miles in meters
  otherField: 'test'
};

describe('Distance Validation Utilities', () => {
  describe('validateDistanceFields', () => {
    it('should throw error when multiple distance fields are set', () => {
      expect(() => validateDistanceFields(testFilters)).toThrow(MultipleDistanceFieldsError);
    });

    it('should not throw when only one distance field is set', () => {
      const singleFieldFilters = { distanceMi: 10, otherField: 'test' };
      expect(() => validateDistanceFields(singleFieldFilters)).not.toThrow();
    });

    it('should not throw when no distance fields are set', () => {
      const noDistanceFilters = { otherField: 'test' };
      expect(() => validateDistanceFields(noDistanceFilters)).not.toThrow();
    });
  });

  describe('getCanonicalDistanceMi', () => {
    it('should return distanceMi when set', () => {
      const filters = { distanceMi: 10 };
      expect(getCanonicalDistanceMi(filters)).toBe(10);
    });

    it('should return maxDistanceMi when distanceMi is not set', () => {
      const filters = { maxDistanceMi: 15 };
      expect(getCanonicalDistanceMi(filters)).toBe(15);
    });

    it('should convert maxDistance from meters to miles', () => {
      const filters = { maxDistance: 16093 }; // 10 miles in meters
      expect(getCanonicalDistanceMi(filters)).toBeCloseTo(10, 1);
    });

    it('should convert radius from meters to miles', () => {
      const filters = { radius: 8047 }; // 5 miles in meters
      expect(getCanonicalDistanceMi(filters)).toBeCloseTo(5, 1);
    });

    it('should return undefined when no distance fields are set', () => {
      const filters = { otherField: 'test' };
      expect(getCanonicalDistanceMi(filters)).toBeUndefined();
    });
  });

  describe('normalizeDistanceFields', () => {
    it('should normalize to distanceMi and remove other distance fields', () => {
      const result = normalizeDistanceFields(testFilters);
      expect(result.distanceMi).toBe(10); // Should use highest precedence
      expect(result.maxDistanceMi).toBeUndefined();
      expect(result.maxDistance).toBeUndefined();
      expect(result.radius).toBeUndefined();
      expect(result.otherField).toBe('test');
    });

    it('should handle filters with no distance fields', () => {
      const filters = { otherField: 'test' };
      const result = normalizeDistanceFields(filters);
      expect(result.distanceMi).toBeUndefined();
      expect(result.otherField).toBe('test');
    });
  });

  describe('toApiFormat', () => {
    it('should convert to maxDistanceMi for API compatibility', () => {
      const result = toApiFormat(testFilters);
      expect(result.maxDistanceMi).toBe(10); // Should use highest precedence
      expect(result.distanceMi).toBeUndefined();
      expect(result.maxDistance).toBeUndefined();
      expect(result.radius).toBeUndefined();
      expect(result.otherField).toBe('test');
    });

    it('should handle filters with no distance fields', () => {
      const filters = { otherField: 'test' };
      const result = toApiFormat(filters);
      expect(result.maxDistanceMi).toBeUndefined();
      expect(result.otherField).toBe('test');
    });
  });

  describe('validateFilterDistanceFields', () => {
    it('should return success when validation passes', () => {
      const filters = { distanceMi: 10 };
      const result = validateFilterDistanceFields(filters);
      expect(result.success).toBe(true);
      expect(result.canonicalDistance).toBe(10);
      expect(result.error).toBeUndefined();
    });

    it('should return error when validation fails', () => {
      const result = validateFilterDistanceFields(testFilters);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Multiple distance fields detected');
      expect(result.canonicalDistance).toBeUndefined();
    });
  });

  describe('assembleSafeFilters', () => {
    it('should normalize filters when validation passes', () => {
      const filters = { distanceMi: 10, otherField: 'test' };
      const result = assembleSafeFilters(filters);
      expect(result.distanceMi).toBe(10);
      expect(result.otherField).toBe('test');
    });

    it('should normalize filters and log warning when validation fails', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = assembleSafeFilters(testFilters);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Distance field validation failed:',
        expect.stringContaining('Multiple distance fields detected')
      );
      expect(result.distanceMi).toBe(10); // Should normalize to highest precedence
      expect(result.otherField).toBe('test');
      
      consoleSpy.mockRestore();
    });
  });
});
