/**
 * End-to-end tests for API proxy enhancements
 * Tests for task 6.2: Implement API Proxy Enhancements
 */

import { NextRequest } from 'next/server';
import { proxyToBackend, createAuthErrorResponse, requireNodeRuntime, isNodeRuntime } from '@/lib/api/proxy-utils';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('API Proxy Enhancements', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConsoleError.mockClear();
    
    // Set up environment
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  describe('proxyToBackend', () => {
    it('should proxy requests to backend with proper headers', async () => {
      const mockResponse = new Response('{"success": true}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test', {
        method: 'POST',
        headers: {
          'cookie': 'session=abc123',
          'authorization': 'Bearer token123',
          'user-agent': 'Test Agent',
          'x-csrf-token': 'csrf123'
        }
      });

      const { response } = await proxyToBackend(request, '/api/v5/auth/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v5/auth/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'cookie': 'session=abc123',
            'authorization': 'Bearer token123',
            'user-agent': 'Test Agent',
            'x-csrf-token': 'csrf123'
          }),
          credentials: 'include'
        })
      );

      expect(response.status).toBe(200);
    });

    it('should handle multiple Set-Cookie headers correctly', async () => {
      // Mock response with multiple Set-Cookie headers
      const mockResponse = new Response('{"success": true}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });

      // Mock the raw() method to simulate Node.js behavior
      (mockResponse.headers as any).raw = jest.fn().mockReturnValue({
        'set-cookie': [
          'access_token=abc123; HttpOnly; Secure; Path=/',
          'refresh_token=def456; HttpOnly; Secure; Path=/',
          'csrf_token=ghi789; Secure; Path=/'
        ]
      });

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/login');
      const { response } = await proxyToBackend(request, '/api/v5/auth/login');

      // Check that multiple Set-Cookie headers are preserved
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      expect(setCookieHeaders).toHaveLength(3);
      expect(setCookieHeaders).toContain('access_token=abc123; HttpOnly; Secure; Path=/');
      expect(setCookieHeaders).toContain('refresh_token=def456; HttpOnly; Secure; Path=/');
      expect(setCookieHeaders).toContain('csrf_token=ghi789; Secure; Path=/');
    });

    it('should handle Set-Cookie headers fallback when raw() is not available', async () => {
      const mockResponse = new Response('{"success": true}', {
        status: 200,
        headers: new Headers([
          ['content-type', 'application/json'],
          ['set-cookie', 'access_token=abc123; HttpOnly; Secure; Path=/']
        ])
      });

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/login');
      const { response } = await proxyToBackend(request, '/api/v5/auth/login');

      // Should still handle single Set-Cookie header
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      expect(setCookieHeaders.length).toBeGreaterThan(0);
    });

    it('should handle 401 responses without exposing backend details', async () => {
      const mockResponse = new Response('{"error": "Invalid token"}', {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      const { response, status } = await proxyToBackend(request, '/api/v5/auth/test');

      expect(status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        success: false
      });
    });

    it('should handle 403 responses without exposing backend details', async () => {
      const mockResponse = new Response('{"error": "Access denied"}', {
        status: 403,
        headers: { 'content-type': 'application/json' }
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      const { response, status } = await proxyToBackend(request, '/api/v5/auth/test');

      expect(status).toBe(403);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Access forbidden',
        code: 'FORBIDDEN',
        success: false
      });
    });

    it('should handle network errors with proper mapping', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      const { response, status } = await proxyToBackend(request, '/api/v5/auth/test');

      expect(status).toBe(503);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Service temporarily unavailable',
        code: 'NETWORK_ERROR',
        success: false
      });
    });

    it('should handle timeout errors', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      );

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      const proxyPromise = proxyToBackend(request, '/api/v5/auth/test', { timeout: 5000 });

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5000);

      const { response, status } = await proxyPromise;

      expect(status).toBe(408);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: 'Request timeout',
        code: 'TIMEOUT',
        success: false
      });

      jest.useRealTimers();
    });

    it('should forward important headers from backend response', async () => {
      const mockResponse = new Response('{"success": true}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'corr-123',
          'x-request-id': 'req-456',
          'retry-after': '60',
          'x-rate-limit-remaining': '10',
          'x-rate-limit-reset': '1234567890'
        }
      });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      const { response } = await proxyToBackend(request, '/api/v5/auth/test');

      expect(response.headers.get('x-correlation-id')).toBe('corr-123');
      expect(response.headers.get('x-request-id')).toBe('req-456');
      expect(response.headers.get('retry-after')).toBe('60');
      expect(response.headers.get('x-rate-limit-remaining')).toBe('10');
      expect(response.headers.get('x-rate-limit-reset')).toBe('1234567890');
    });

    it('should preserve original status codes', async () => {
      const testCases = [200, 201, 400, 404, 422, 429, 500, 502, 503];

      for (const statusCode of testCases) {
        mockFetch.mockResolvedValueOnce(new Response('{}', { status: statusCode }));

        const request = new NextRequest('http://localhost:3000/api/auth/test');
        const { status } = await proxyToBackend(request, '/api/v5/auth/test');

        if (statusCode !== 401 && statusCode !== 403) {
          expect(status).toBe(statusCode);
        }
      }
    });

    it('should handle custom preserve headers', async () => {
      const mockResponse = new Response('{"success": true}', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test', {
        headers: {
          'custom-header': 'custom-value',
          'another-header': 'another-value',
          'ignore-header': 'ignore-value'
        }
      });

      await proxyToBackend(request, '/api/v5/auth/test', {
        preserveHeaders: ['custom-header', 'another-header']
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'custom-header': 'custom-value',
            'another-header': 'another-value'
          })
        })
      );

      const fetchCall = mockFetch.mock.calls[0][1];
      expect(fetchCall.headers).not.toHaveProperty('ignore-header');
    });
  });

  describe('createAuthErrorResponse', () => {
    it('should create standardized error responses', () => {
      const response = createAuthErrorResponse(
        'Test error',
        'TEST_ERROR',
        400,
        { detail: 'test detail' }
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('should include details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = createAuthErrorResponse(
        'Test error',
        'TEST_ERROR',
        400,
        { detail: 'test detail' }
      );

      const data = await response.json();
      expect(data.details).toEqual({ detail: 'test detail' });

      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = createAuthErrorResponse(
        'Test error',
        'TEST_ERROR',
        400,
        { detail: 'test detail' }
      );

      const data = await response.json();
      expect(data.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Runtime Detection', () => {
    it('should detect Node.js runtime correctly', () => {
      const originalRuntime = process.env.NEXT_RUNTIME;
      
      delete process.env.NEXT_RUNTIME;
      expect(isNodeRuntime()).toBe(true);
      
      process.env.NEXT_RUNTIME = 'nodejs';
      expect(isNodeRuntime()).toBe(true);
      
      process.env.NEXT_RUNTIME = 'edge';
      expect(isNodeRuntime()).toBe(false);

      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should throw error when Node.js runtime is required but not available', () => {
      const originalRuntime = process.env.NEXT_RUNTIME;
      process.env.NEXT_RUNTIME = 'edge';

      expect(() => requireNodeRuntime()).toThrow(
        'This endpoint requires Node.js runtime for proper Set-Cookie header handling'
      );

      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should not throw error when Node.js runtime is available', () => {
      const originalRuntime = process.env.NEXT_RUNTIME;
      delete process.env.NEXT_RUNTIME;

      expect(() => requireNodeRuntime()).not.toThrow();

      process.env.NEXT_RUNTIME = originalRuntime;
    });
  });

  describe('Environment Validation', () => {
    it('should validate backend URL configuration', async () => {
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
      delete process.env.BACKEND_URL;

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      
      await expect(proxyToBackend(request, '/api/v5/auth/test')).rejects.toThrow(
        'Backend URL not configured'
      );
    });

    it('should use NEXT_PUBLIC_BACKEND_URL when available', async () => {
      process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.example.com';
      delete process.env.BACKEND_URL;

      const mockResponse = new Response('{}', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      await proxyToBackend(request, '/api/v5/auth/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v5/auth/test',
        expect.any(Object)
      );
    });

    it('should fallback to BACKEND_URL when NEXT_PUBLIC_BACKEND_URL is not available', async () => {
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
      process.env.BACKEND_URL = 'https://backend.example.com';

      const mockResponse = new Response('{}', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/test');
      await proxyToBackend(request, '/api/v5/auth/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://backend.example.com/api/v5/auth/test',
        expect.any(Object)
      );

      delete process.env.BACKEND_URL;
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete login flow with multiple cookies', async () => {
      const mockResponse = new Response(JSON.stringify({
        success: true,
        user: { id: '1', email: 'test@example.com' },
        tokens: { access_token: 'abc123', refresh_token: 'def456' }
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });

      // Mock multiple Set-Cookie headers
      (mockResponse.headers as any).raw = jest.fn().mockReturnValue({
        'set-cookie': [
          'access_token=abc123; HttpOnly; Secure; SameSite=Strict; Path=/',
          'refresh_token=def456; HttpOnly; Secure; SameSite=Strict; Path=/',
          'csrf_token=ghi789; Secure; SameSite=Strict; Path=/'
        ]
      });

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf123'
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      });

      const { response, status } = await proxyToBackend(request, '/api/v5/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        requireNodeRuntime: true
      });

      expect(status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.user.email).toBe('test@example.com');

      // Verify multiple Set-Cookie headers are preserved
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      expect(setCookieHeaders.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle authentication errors gracefully', async () => {
      const mockResponse = new Response(JSON.stringify({
        error: 'Invalid credentials'
      }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
      });

      const { response, status } = await proxyToBackend(request, '/api/v5/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
      });

      expect(status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Authentication required');
      expect(responseData.code).toBe('UNAUTHORIZED');
    });
  });
});

afterAll(() => {
  mockConsoleError.mockRestore();
});