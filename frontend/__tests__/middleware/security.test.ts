import { NextRequest } from 'next/server';
import { buildSecurityHeaders, corsHeaders, securityMiddleware } from '@/lib/middleware/security';

// Mock NextRequest
const createMockRequest = (url: string, origin?: string): NextRequest => {
  const headers = new Headers();
  if (origin) {
    headers.set('origin', origin);
  }
  
  return {
    nextUrl: { origin: 'https://example.com' },
    headers,
  } as NextRequest;
};

describe('Security Middleware', () => {
  describe('buildSecurityHeaders', () => {
    it('should return security headers for same-origin request', () => {
      const request = createMockRequest('https://example.com/admin');
      const headers = buildSecurityHeaders(request);
      
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty('Vary', 'Origin');
    });

    it('should include CORS headers for allowed origin', () => {
      const request = createMockRequest('https://example.com/admin', 'https://example.com');
      const headers = buildSecurityHeaders(request);
      
      expect(headers).toHaveProperty('Access-Control-Allow-Origin', 'https://example.com');
      expect(headers).toHaveProperty('Access-Control-Allow-Credentials', 'true');
    });

    it('should not include CORS headers for disallowed origin', () => {
      const request = createMockRequest('https://example.com/admin', 'https://malicious.com');
      const headers = buildSecurityHeaders(request);
      
      expect(headers).not.toHaveProperty('Access-Control-Allow-Origin');
      expect(headers).not.toHaveProperty('Access-Control-Allow-Credentials');
    });
  });

  describe('corsHeaders', () => {
    it('should include CORS methods and headers', () => {
      const request = createMockRequest('https://example.com/admin');
      const headers = corsHeaders(request);
      
      expect(headers).toHaveProperty('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      expect(headers).toHaveProperty('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token, Authorization');
      expect(headers).toHaveProperty('Access-Control-Max-Age', '600');
    });

    it('should include base security headers', () => {
      const request = createMockRequest('https://example.com/admin');
      const headers = corsHeaders(request);
      
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
    });
  });

  describe('securityMiddleware', () => {
    it('should return 200 response', async () => {
      const request = createMockRequest('https://example.com/admin');
      const response = await securityMiddleware(request);
      
      expect(response.status).toBe(200);
    });
  });
});
