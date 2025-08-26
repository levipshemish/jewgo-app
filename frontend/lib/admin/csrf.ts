import { createHmac, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
const CSRF_COOKIE_NAME = 'admin_csrf';
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Generate a signed CSRF token bound to user session
 */
export function generateSignedCSRFToken(userId: string): string {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString('hex');
  const data = `${userId}:${timestamp}:${nonce}`;
  
  // Create HMAC signature
  const hmac = createHmac('sha256', CSRF_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  return `${data}:${signature}`;
}

/**
 * Validate a signed CSRF token
 */
export function validateSignedCSRFToken(token: string, userId: string): boolean {
  if (!token || !userId) {
    return false;
  }

  try {
    const parts = token.split(':');
    if (parts.length !== 4) {
      return false;
    }

    const [tokenUserId, timestampStr, nonce, signature] = parts;
    
    // Verify user ID matches
    if (tokenUserId !== userId) {
      return false;
    }

    // Verify timestamp is not expired
    const timestamp = parseInt(timestampStr);
    const now = Date.now();
    if (now - timestamp > CSRF_TOKEN_EXPIRY) {
      return false;
    }

    // Verify signature
    const data = `${userId}:${timestampStr}:${nonce}`;
    const hmac = createHmac('sha256', CSRF_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('[CSRF] Token validation error:', error);
    return false;
  }
}

/**
 * Set CSRF token in httpOnly cookie
 */
export async function setCSRFCookie(userId: string): Promise<string> {
  const token = generateSignedCSRFToken(userId);
  
  // Set httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/api/admin',
  });
  
  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFRequest(token: string | null, userId: string): boolean {
  if (!token) {
    return false;
  }
  
  return validateSignedCSRFToken(token, userId);
}

/**
 * Generate CSRF token for client-side use (non-sensitive operations)
 */
export function generateClientCSRFToken(): string {
  const timestamp = Date.now();
  const nonce = randomBytes(8).toString('hex');
  return `client_${timestamp}_${nonce}`;
}

/**
 * Validate client CSRF token (basic validation for non-sensitive operations)
 */
export function validateClientCSRFToken(token: string): boolean {
  if (!token || !token.startsWith('client_')) {
    return false;
  }
  
  const parts = token.split('_');
  if (parts.length !== 3) {
    return false;
  }
  
  const timestamp = parseInt(parts[1]);
  const now = Date.now();
  
  // Client tokens expire after 30 minutes
  return (now - timestamp) < 1800000;
}
