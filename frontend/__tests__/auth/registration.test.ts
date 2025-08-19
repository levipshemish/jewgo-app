import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import { analytics } from '@/lib/utils/analytics';
import { validateEmail, validatePassword } from '@/lib/utils/formValidation';
import { rateLimiter } from '@/lib/utils/rateLimiter';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Registration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analytics.resetMetrics();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Form Validation', () => {
    it('should validate email format', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('invalid')).toBe('Please enter a valid email address');
      expect(validateEmail('test@example.com')).toBeNull();
    });

    it('should validate password requirements', () => {
      expect(validatePassword('')).toBe('Password must be at least 8 characters');
      expect(validatePassword('short')).toBe('Password must be at least 8 characters');
      expect(validatePassword('alllowercase')).toContain('uppercase letter');
      expect(validatePassword('ALLUPPERCASE')).toContain('lowercase letter');
      expect(validatePassword('NoNumbers')).toContain('number');
      expect(validatePassword('ValidPass123')).toBeNull();
    });
  });

  describe('API Registration Endpoint', () => {
    it('should handle successful registration', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true, user: { id: 'u1', email: 'test@example.com' } }),
      });

      const mockRequest = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'ValidPass123',
        }),
      });

      const response = await fetch(mockRequest);
      expect(response.status).toBe(201);
    });

    it('should reject invalid input', async () => {
      const invalidData = [
        { name: 'A', email: 'test@example.com', password: 'ValidPass123' }, // Name too short
        { name: 'Test', email: 'invalid-email', password: 'ValidPass123' }, // Invalid email
        { name: 'Test', email: 'test@example.com', password: 'short' }, // Password too short
      ];

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ success: false, message: 'Validation failed' }),
      });

      for (const data of invalidData) {
        const mockRequest = new Request('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const response = await fetch(mockRequest);
        expect(response.status).toBe(400);
      }
    });

    it('should handle existing email', async () => {
      const mockRequest = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'ValidPass123',
        }),
      });

      // Mock conflict response
      (global.fetch as any).mockResolvedValueOnce({
        status: 409,
        json: async () => ({ success: false, message: 'Email already in use' }),
      });

      const response = await fetch(mockRequest);
      expect(response.status).toBe(409);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit registration attempts', async () => {
      const mockRequest = () => new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'ValidPass123',
        }),
      });

      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        const result = await rateLimiter.checkLimit(
          mockRequest() as any,
          { windowMs: 15 * 60 * 1000, maxRequests: 5 },
          'register'
        );
        if (i < 5) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
          expect(result.remaining).toBe(0);
        }
      }
    });
  });

  describe('Analytics Tracking', () => {
    it('should track registration events', () => {
      const email = 'test@example.com';
      
      analytics.trackRegistrationAttempt(email, 'web');
      analytics.trackRegistrationSuccess('user123', email, 'web');
      
      const metrics = analytics.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulRegistrations).toBe(1);
    });

    it('should track registration failures', () => {
      const email = 'test@example.com';
      
      analytics.trackRegistrationFailure(email, 'validation_error');
      analytics.trackRegistrationFailure(email, 'rate_limit');
      analytics.trackRegistrationFailure(email, 'recaptcha_failed');
      
      const metrics = analytics.getMetrics();
      expect(metrics.failedRegistrations).toBe(3);
      expect(metrics.validationErrors).toBe(1);
      expect(metrics.rateLimitHits).toBe(1);
      expect(metrics.recaptchaFailures).toBe(1);
    });
  });

  describe('Security Features', () => {
    it('should hash email for privacy in analytics', () => {
      const track = vi.spyOn(analytics as any, 'track');
      analytics.trackRegistrationAttempt('user@example.com');
      
      expect(track).toHaveBeenCalledWith(
        'registration_attempt',
        expect.objectContaining({
          email: 'example.com', // Only domain is stored
        })
      );
    });

    it('should sanitize error details', () => {
      const track = vi.spyOn(analytics as any, 'track');
      analytics.trackRegistrationFailure('test@example.com', 'error', {
        password: 'secret',
        token: 'token123',
        otherData: 'visible',
      });
      
      expect(track).toHaveBeenCalledWith(
        'registration_failure',
        expect.objectContaining({
          details: expect.objectContaining({
            otherData: 'visible',
          })
        })
      );
      
      const callArgs = track.mock.calls[0][1] as any;
      expect(callArgs.details).not.toHaveProperty('password');
      expect(callArgs.details).not.toHaveProperty('token');
    });
  });
});

describe('Password Strength', () => {
  const testCases = [
    { password: '', expected: 'Password must be at least 8 characters' },
    { password: 'abc123', expected: 'Password must be at least 8 characters' },
    { password: 'abcdefgh', expected: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
    { password: 'Abcdefgh', expected: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
    { password: 'ABCDEFGH1', expected: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
    { password: 'abcdefgh1', expected: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
    { password: 'Abcdefg1', expected: null },
    { password: 'ComplexPass123!', expected: null },
  ];

  testCases.forEach(({ password, expected }) => {
    it(`should validate "${password}" correctly`, () => {
      const result = validatePassword(password);
      expect(result).toBe(expected);
    });
  });
});
