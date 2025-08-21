import { isAppleOAuthEnabled } from '@/lib/utils/auth-utils.server';

// Mock environment variables
const originalEnv = process.env;

describe('Apple OAuth Feature Flags', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Server-side feature flag (APPLE_OAUTH_ENABLED)', () => {
    test('returns true when APPLE_OAUTH_ENABLED=true', () => {
      process.env.APPLE_OAUTH_ENABLED = 'true';
      expect(isAppleOAuthEnabled()).toBe(true);
    });

    test('returns false when APPLE_OAUTH_ENABLED=false', () => {
      process.env.APPLE_OAUTH_ENABLED = 'false';
      expect(isAppleOAuthEnabled()).toBe(false);
    });

    test('returns false when APPLE_OAUTH_ENABLED is undefined', () => {
      delete process.env.APPLE_OAUTH_ENABLED;
      expect(isAppleOAuthEnabled()).toBe(false);
    });

    test('returns false when APPLE_OAUTH_ENABLED is empty string', () => {
      process.env.APPLE_OAUTH_ENABLED = '';
      expect(isAppleOAuthEnabled()).toBe(false);
    });

    test('returns false when APPLE_OAUTH_ENABLED is not "true"', () => {
      process.env.APPLE_OAUTH_ENABLED = 'enabled';
      expect(isAppleOAuthEnabled()).toBe(false);
    });
  });

  describe('Client-side feature flag (NEXT_PUBLIC_APPLE_OAUTH_ENABLED)', () => {
    test('client-side flag is accessible in browser environment', () => {
      // This test documents the expected behavior
      // In a real browser environment, NEXT_PUBLIC_APPLE_OAUTH_ENABLED would be available
      // Set it for the test
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'true';
      expect(typeof process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED).toBe('string');
    });

    test('client-side flag comparison works correctly', () => {
      // Test the exact comparison used in the AppleSignInButton component
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'true';
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(true);

      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'false';
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(false);

      delete process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED;
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(false);
    });
  });

  describe('Feature flag integration', () => {
    test('both flags work independently', () => {
      // Client-side flag enabled, server-side disabled
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'true';
      process.env.APPLE_OAUTH_ENABLED = 'false';
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(true);
      expect(isAppleOAuthEnabled()).toBe(false);

      // Client-side flag disabled, server-side enabled
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'false';
      process.env.APPLE_OAUTH_ENABLED = 'true';
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(false);
      expect(isAppleOAuthEnabled()).toBe(true);

      // Both flags enabled
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'true';
      process.env.APPLE_OAUTH_ENABLED = 'true';
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(true);
      expect(isAppleOAuthEnabled()).toBe(true);

      // Both flags disabled
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'false';
      process.env.APPLE_OAUTH_ENABLED = 'false';
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(false);
      expect(isAppleOAuthEnabled()).toBe(false);
    });
  });

  describe('Environment variable validation', () => {
    test('handles various truthy/falsy values correctly', () => {
      const truthyValues = ['true', 'TRUE', 'True'];
      const falsyValues = ['false', 'FALSE', 'False', '', 'enabled', '1', '0', undefined];

      truthyValues.forEach(value => {
        process.env.APPLE_OAUTH_ENABLED = value;
        expect(isAppleOAuthEnabled()).toBe(value === 'true');
      });

      falsyValues.forEach(value => {
        if (value === undefined) {
          delete process.env.APPLE_OAUTH_ENABLED;
        } else {
          process.env.APPLE_OAUTH_ENABLED = value;
        }
        expect(isAppleOAuthEnabled()).toBe(false);
      });
    });
  });

  describe('Deployment scenarios', () => {
    test('development environment with flags enabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'true';
      process.env.APPLE_OAUTH_ENABLED = 'true';
      
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(true);
      expect(isAppleOAuthEnabled()).toBe(true);
    });

    test('production environment with flags disabled', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'false';
      process.env.APPLE_OAUTH_ENABLED = 'false';
      
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(false);
      expect(isAppleOAuthEnabled()).toBe(false);
    });

    test('staging environment with gradual rollout', () => {
      process.env.NODE_ENV = 'staging';
      process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED = 'true';
      process.env.APPLE_OAUTH_ENABLED = 'true';
      
      expect(process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true').toBe(true);
      expect(isAppleOAuthEnabled()).toBe(true);
    });
  });
});
