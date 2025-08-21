import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../middleware';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
  },
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

// Mock auth utilities
const mockValidateRedirectUrl = jest.fn();
const mockExtractIsAnonymous = jest.fn();

jest.mock('@/lib/utils/auth-utils', () => ({
  validateRedirectUrl: mockValidateRedirectUrl,
  extractIsAnonymous: mockExtractIsAnonymous,
}));

describe('Middleware Route Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateRedirectUrl.mockImplementation((url) => url);
    mockExtractIsAnonymous.mockReturnValue(false);
  });

  describe('Public Route Bypass', () => {
    it('should allow root path (/) to pass through', async () => {
      const request = new NextRequest(new URL('https://jewgo.app/'));
      const response = await middleware(request);
      
      // Should not redirect (pass through)
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(307);
    });

    it('should allow auth routes to pass through', async () => {
      const authRoutes = [
        '/auth/signin',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/callback',
        '/api/auth/anonymous',
      ];

      for (const route of authRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        const response = await middleware(request);
        
        // Should not redirect (pass through)
        expect(response.status).not.toBe(302);
        expect(response.status).not.toBe(307);
      }
    });

    it('should allow static assets to pass through', async () => {
      const staticRoutes = [
        '/_next/static/chunks/main.js',
        '/favicon.ico',
        '/icon.webp',
        '/manifest.json',
        '/robots.txt',
        '/sitemap.xml',
      ];

      for (const route of staticRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        const response = await middleware(request);
        
        // Should not redirect (pass through)
        expect(response.status).not.toBe(302);
        expect(response.status).not.toBe(307);
      }
    });

    it('should allow health and test routes to pass through', async () => {
      const healthRoutes = [
        '/healthz',
        '/api/health',
        '/test-auth',
        '/test-distance-sorting',
        '/test-infinite-scroll',
        '/test-profile',
        '/test-redirect',
        '/test-unified-card',
      ];

      for (const route of healthRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        const response = await middleware(request);
        
        // Should not redirect (pass through)
        expect(response.status).not.toBe(302);
        expect(response.status).not.toBe(307);
      }
    });
  });

  describe('Protected Route Protection', () => {
    it('should redirect unauthenticated users to signin for protected routes', async () => {
      // Mock no session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const protectedRoutes = [
        '/eatery',
        '/restaurant/123',
        '/marketplace',
        '/admin',
        '/profile',
        '/settings',
        '/messages',
        '/favorites',
        '/live-map',
        '/location-access',
        '/notifications',
        '/add-eatery',
        '/mikva',
        '/shuls',
        '/stores',
        '/api/restaurants',
        '/api/reviews',
        '/api/feedback',
      ];

      for (const route of protectedRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        const response = await middleware(request);
        
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toContain('/auth/signin');
        expect(response.headers.get('location')).toContain('redirectTo=');
      }
    });

    it('should redirect anonymous users to signin', async () => {
      // Mock anonymous user session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { 
          session: { 
            user: { 
              id: 'anon-user',
              user_metadata: { is_anonymous: true }
            } 
          } 
        },
        error: null,
      });
      mockExtractIsAnonymous.mockReturnValue(true);

      const request = new NextRequest(new URL('https://jewgo.app/eatery'));
      const response = await middleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should allow authenticated non-anonymous users', async () => {
      // Mock authenticated user session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { 
          session: { 
            user: { 
              id: 'auth-user',
              user_metadata: { is_anonymous: false }
            } 
          } 
        },
        error: null,
      });
      mockExtractIsAnonymous.mockReturnValue(false);

      const request = new NextRequest(new URL('https://jewgo.app/eatery'));
      const response = await middleware(request);
      
      // Should pass through (not redirect)
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(307);
    });
  });

  describe('Redirect URL Sanitization', () => {
    it('should sanitize redirect URLs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest(new URL('https://jewgo.app/eatery?param=value'));
      const response = await middleware(request);
      
      expect(mockValidateRedirectUrl).toHaveBeenCalledWith('/eatery?param=value');
      expect(response.headers.get('location')).toContain('redirectTo=');
    });

    it('should handle malicious redirect URLs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Mock validateRedirectUrl to return safe URL
      mockValidateRedirectUrl.mockReturnValue('/');

      const request = new NextRequest(new URL('https://jewgo.app/eatery?redirect=//evil.com'));
      const response = await middleware(request);
      
      expect(mockValidateRedirectUrl).toHaveBeenCalledWith('/eatery?redirect=//evil.com');
      expect(response.headers.get('location')).toContain('redirectTo=%2F');
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to redirects', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest(new URL('https://jewgo.app/eatery'));
      const response = await middleware(request);
      
      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Supabase error'),
      });

      const request = new NextRequest(new URL('https://jewgo.app/eatery'));
      const response = await middleware(request);
      
      // Should fail open (allow request to proceed)
      expect(response.status).not.toBe(302);
    });

    it('should handle middleware errors gracefully', async () => {
      // Mock middleware error
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Middleware error'));

      const request = new NextRequest(new URL('https://jewgo.app/eatery'));
      const response = await middleware(request);
      
      // Should fail open (allow request to proceed)
      expect(response.status).not.toBe(302);
    });
  });

  describe('Route Matching', () => {
    it('should match protected routes correctly', () => {
      const protectedRoutes = [
        '/eatery',
        '/restaurant/123',
        '/marketplace',
        '/admin',
        '/admin/dashboard',
        '/profile',
        '/profile/settings',
        '/messages',
        '/messages/123',
        '/favorites',
        '/live-map',
        '/location-access',
        '/notifications',
        '/add-eatery',
        '/mikva',
        '/shuls',
        '/stores',
        '/api/restaurants',
        '/api/reviews',
        '/api/feedback',
      ];

      // These should all trigger middleware protection
      for (const route of protectedRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        // The middleware should process these routes
        expect(request.nextUrl.pathname).not.toMatch(/^\/$|^\/auth\/|^\/_next\/|^\/favicon|^\/icon|^\/manifest|^\/robots|^\/sitemap|^\/healthz|^\/test-/);
      }
    });

    it('should not match public routes', () => {
      const publicRoutes = [
        '/',
        '/auth/signin',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/callback',
        '/api/auth/anonymous',
        '/_next/static/chunks/main.js',
        '/favicon.ico',
        '/icon.webp',
        '/manifest.json',
        '/robots.txt',
        '/sitemap.xml',
        '/healthz',
        '/test-auth',
        '/test-distance-sorting',
      ];

      // These should bypass middleware
      for (const route of publicRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        // The middleware should not process these routes
        expect(request.nextUrl.pathname).toMatch(/^\/$|^\/auth\/|^\/_next\/|^\/favicon|^\/icon|^\/manifest|^\/robots|^\/sitemap|^\/healthz|^\/test-/);
      }
    });
  });
});
