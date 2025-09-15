/**
 * Tests for enhanced authentication middleware
 * Covers performance optimization, returnTo preservation, and step-up auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../../middleware';

// Mock NextResponse.redirect
const mockRedirect = jest.fn();
NextResponse.redirect = mockRedirect;

// Mock the auth utilities
jest.mock('@/lib/utils/auth-utils', () => ({
  validateRedirectUrl: jest.fn((url) => url || '/'),
}));

// Mock the security middleware
jest.mock('@/lib/middleware/security', () => ({
  corsHeaders: jest.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  })),
  buildSecurityHeaders: jest.fn(() => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Enhanced Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default environment variables
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.jewgo.app';
    
    // Mock NextResponse.redirect to return a proper response
    mockRedirect.mockImplementation((url, status) => {
      const response = new NextResponse(null, { status });
      response.headers.set('location', url.toString());
      return response;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Performance Optimization', () => {
    it('should use HEAD method for token verification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      await middleware(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.jewgo.app/api/v5/auth/verify-token',
        expect.objectContaining({
          method: 'HEAD',
          credentials: 'include',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should include timeout for performance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      await middleware(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });
  });

  describe('Route Matching', () => {
    it('should apply middleware only to protected routes', async () => {
      const publicPaths = [
        '/auth/signin',
        '/_next/static/chunk.js',
        '/static/image.png',
        '/api/auth/login',
        '/favicon.ico',
        '/',
        '/about',
      ];

      for (const path of publicPaths) {
        mockFetch.mockClear();
        const request = new NextRequest(`https://jewgo.app${path}`);
        const response = await middleware(request);

        // Should not call backend for public paths
        expect(mockFetch).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
      }
    });

    it('should protect admin routes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(mockFetch).toHaveBeenCalled();
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should protect other sensitive routes', async () => {
      const protectedPaths = [
        '/dashboard/overview',
        '/profile/edit',
        '/settings/account',
        '/favorites/restaurants',
        '/account/billing',
      ];

      for (const path of protectedPaths) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const request = new NextRequest(`https://jewgo.app${path}`);
        const response = await middleware(request);

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toContain('/auth/signin');
        mockFetch.mockClear();
      }
    });
  });

  describe('ReturnTo Parameter Preservation', () => {
    it('should preserve returnTo parameter in redirect URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard?tab=users&filter=active');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      expect(location).toContain('/auth/signin');
      expect(location).toContain('returnTo=');
      expect(decodeURIComponent(location!)).toContain('/admin/dashboard?tab=users&filter=active');
    });

    it('should handle complex query parameters in returnTo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const complexPath = '/admin/users?search=john%20doe&role=admin&page=2';
      const request = new NextRequest(`https://jewgo.app${complexPath}`);
      const response = await middleware(request);

      const location = response.headers.get('location');
      expect(location).toContain('returnTo=');
      expect(decodeURIComponent(location!)).toContain(complexPath);
    });

    it('should sanitize returnTo parameter', async () => {
      const { validateRedirectUrl } = require('@/lib/utils/auth-utils');
      validateRedirectUrl.mockReturnValue('/admin/safe-path');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = new NextRequest('https://jewgo.app/admin/../../malicious');
      await middleware(request);

      expect(validateRedirectUrl).toHaveBeenCalledWith('/admin/../../malicious');
    });
  });

  describe('Step-up Authentication', () => {
    it('should require step-up auth for sensitive admin operations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/users/roles');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/step-up');
      expect(response.headers.get('location')).toContain('returnTo=');
    });

    it('should require step-up auth for API key management', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/api-keys');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/step-up');
    });

    it('should require step-up auth for billing settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/settings/billing');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/step-up');
    });

    it('should return 403 with step-up hint for API routes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/api/admin/users/roles');
      const response = await middleware(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Step-up authentication required');
      expect(body.code).toBe('STEP_UP_REQUIRED');
      expect(body.hint).toBe('fresh_session_required');
    });

    it('should not require step-up auth for regular admin pages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should handle 401 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should handle 403 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/auth/signin');
    });

    it('should return proper error response for API routes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = new NextRequest('https://jewgo.app/api/admin/users');
      const response = await middleware(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS requests for API routes', async () => {
      const request = new NextRequest('https://jewgo.app/api/admin/users', {
        method: 'OPTIONS',
      });
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not handle OPTIONS for non-API routes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard', {
        method: 'OPTIONS',
      });
      await middleware(request);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Security Headers', () => {
    it('should apply security headers to all responses', async () => {
      const { buildSecurityHeaders } = require('@/lib/middleware/security');
      buildSecurityHeaders.mockReturnValue({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(buildSecurityHeaders).toHaveBeenCalledWith(request);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should add cache control headers to redirects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const request = new NextRequest('https://jewgo.app/admin/dashboard');
      const response = await middleware(request);

      expect(response.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });
  });
});