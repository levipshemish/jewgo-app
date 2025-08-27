import { generateSignedCSRFToken, validateSignedCSRFToken } from '@/lib/admin/csrf';

describe('CSRF Token', () => {
  const testUserId = 'test-user-123';

  describe('generateSignedCSRFToken', () => {
    it('should generate a valid token', () => {
      const token = generateSignedCSRFToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateSignedCSRFToken('user1');
      const token2 = generateSignedCSRFToken('user2');
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for the same user at different times', () => {
      const token1 = generateSignedCSRFToken(testUserId);
      // Small delay to ensure different timestamp
      const token2 = generateSignedCSRFToken(testUserId);
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateSignedCSRFToken', () => {
    it('should validate a correctly generated token', () => {
      const token = generateSignedCSRFToken(testUserId);
      const isValid = validateSignedCSRFToken(token, testUserId);
      expect(isValid).toBe(true);
    });

    it('should reject token for wrong user', () => {
      const token = generateSignedCSRFToken(testUserId);
      const isValid = validateSignedCSRFToken(token, 'different-user');
      expect(isValid).toBe(false);
    });

    it('should reject invalid tokens', () => {
      const isValid = validateSignedCSRFToken('invalid-token', testUserId);
      expect(isValid).toBe(false);
    });

    it('should reject empty tokens', () => {
      const isValid = validateSignedCSRFToken('', testUserId);
      expect(isValid).toBe(false);
    });

    it('should reject null/undefined tokens', () => {
      expect(validateSignedCSRFToken(null as any, testUserId)).toBe(false);
      expect(validateSignedCSRFToken(undefined as any, testUserId)).toBe(false);
    });
  });

  describe('Token lifecycle', () => {
    it('should maintain consistency between generation and validation', () => {
      const userId = 'test-user-456';
      const token = generateSignedCSRFToken(userId);
      
      // Should be valid immediately
      expect(validateSignedCSRFToken(token, userId)).toBe(true);
      
      // Should be valid for the same user
      expect(validateSignedCSRFToken(token, userId)).toBe(true);
      
      // Should not be valid for different user
      expect(validateSignedCSRFToken(token, 'other-user')).toBe(false);
    });
  });
});
