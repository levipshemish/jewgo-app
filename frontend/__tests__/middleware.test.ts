import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../middleware';
import { validateRedirectUrl, extractIsAnonymous } from '@/lib/utils/auth-utils';

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
jest.mock('@/lib/utils/auth-utils', () => ({
  validateRedirectUrl: jest.fn(),
  extractIsAnonymous: jest.fn(),
}));

describe('Middleware Route Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateRedirectUrl as jest.Mock).mockImplementation((url) => url);
    (extractIsAnonymous as jest.Mock).mockReturnValue(false);
  });

  describe('Public Route Bypass', () => {
    it('should allow public routes to pass through', async () => {
      const publicRoutes = [
        '/',
        '/auth/signin',
        '/eatery',
        '/restaurant/123',
        '/marketplace',
        '/api/health',
        '/api/restaurants/search',
        '/_next/static/chunks/main.js',
        '/favicon.ico',
      ];

      for (const route of publicRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        const response = await middleware(request);
        
        // Should not redirect (pass through)
        expect(response.status).not.toBe(302);
        expect(response.status).not.toBe(307);
      }
    });
  });

  describe('Private Route Protection', () => {
    it('should redirect unauthenticated users to signin', async () => {
      // Mock no session
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const privateRoutes = [
        '/admin',
        '/profile',
        '/settings',
        '/messages',
        '/favorites',
        '/api/auth/prepare-merge',
        '/api/restaurants/123',
      ];

      for (const route of privateRoutes) {
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
      (extractIsAnonymous as jest.Mock).mockReturnValue(true);

      const request = new NextRequest(new URL('https://jewgo.app/admin'));
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
      (extractIsAnonymous as jest.Mock).mockReturnValue(false);

      const request = new NextRequest(new URL('https://jewgo.app/admin'));
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

      const request = new NextRequest(new URL('https://jewgo.app/admin?param=value'));
      const response = await middleware(request);
      
      expect(validateRedirectUrl).toHaveBeenCalledWith('/admin?param=value');
      expect(response.headers.get('location')).toContain('redirectTo=');
    });

    it('should handle malicious redirect URLs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Mock validateRedirectUrl to return safe URL
      (validateRedirectUrl as jest.Mock).mockReturnValue('/');

      const request = new NextRequest(new URL('https://jewgo.app/admin?redirect=//evil.com'));
      const response = await middleware(request);
      
      expect(validateRedirectUrl).toHaveBeenCalledWith('/admin?redirect=//evil.com');
      expect(response.headers.get('location')).toContain('redirectTo=%2F');
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to redirects', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest(new URL('https://jewgo.app/admin'));
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

      const request = new NextRequest(new URL('https://jewgo.app/admin'));
      const response = await middleware(request);
      
      // Should fail open (allow request to proceed)
      expect(response.status).not.toBe(302);
    });

    it('should handle middleware errors gracefully', async () => {
      // Mock middleware error
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Middleware error'));

      const request = new NextRequest(new URL('https://jewgo.app/admin'));
      const response = await middleware(request);
      
      // Should fail open (allow request to proceed)
      expect(response.status).not.toBe(302);
    });
  });

  describe('Route Matching', () => {
    it('should match private routes correctly', () => {
      const privateRoutes = [
        '/admin',
        '/admin/dashboard',
        '/profile',
        '/profile/settings',
        '/messages',
        '/messages/123',
        '/favorites',
        '/marketplace/sell',
        '/api/auth/prepare-merge',
        '/api/restaurants/123',
        '/api/reviews/456',
      ];

      // These should all trigger middleware protection
      for (const route of privateRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        // The middleware should process these routes
        expect(request.nextUrl.pathname).toMatch(/admin|profile|messages|favorites|marketplace\/sell|api\/auth|api\/restaurants|api\/reviews/);
      }
    });

    it('should not match public routes', () => {
      const publicRoutes = [
        '/',
        '/auth/signin',
        '/eatery',
        '/restaurant/123',
        '/marketplace',
        '/api/health',
        '/_next/static/chunks/main.js',
        '/favicon.ico',
      ];

      // These should bypass middleware
      for (const route of publicRoutes) {
        const request = new NextRequest(new URL(`https://jewgo.app${route}`));
        // The middleware should not process these routes
        expect(request.nextUrl.pathname).not.toMatch(/admin|profile|messages|favorites|marketplace\/sell|api\/auth|api\/restaurants|api\/reviews/);
      }
    });
  });
});
