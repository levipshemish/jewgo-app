/**
 * Cookie and Session Utilities
 * Enforces secure cookie settings and provides consistent session management
 */

import { cookies } from 'next/headers';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
}

export const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  ...DEFAULT_COOKIE_OPTIONS,
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export const CSRF_COOKIE_OPTIONS: CookieOptions = {
  ...DEFAULT_COOKIE_OPTIONS,
  sameSite: 'strict',
  maxAge: 60 * 60, // 1 hour
};

export function setSecureCookie(
  name: string,
  value: string,
  options: Partial<CookieOptions> = {}
): void {
  const cookieStore = cookies();
  const finalOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  
  cookieStore.set(name, value, {
    httpOnly: finalOptions.httpOnly,
    secure: finalOptions.secure,
    sameSite: finalOptions.sameSite,
    maxAge: finalOptions.maxAge,
    path: finalOptions.path,
    domain: finalOptions.domain,
  });
}

export function getCookie(name: string): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(name)?.value;
}

export function deleteCookie(name: string, options: Partial<CookieOptions> = {}): void {
  const cookieStore = cookies();
  const finalOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  
  cookieStore.set(name, '', {
    ...finalOptions,
    maxAge: 0,
  });
}

export function setAuthCookie(name: string, value: string): void {
  setSecureCookie(name, value, AUTH_COOKIE_OPTIONS);
}

export function setCSRFCookie(name: string, value: string): void {
  setSecureCookie(name, value, CSRF_COOKIE_OPTIONS);
}

// Session rotation utilities
export function rotateSession(): void {
  // In a real implementation, this would invalidate the current session
  // and create a new one. For now, we'll just set a new session ID.
  const sessionId = crypto.randomUUID();
  setAuthCookie('session_id', sessionId);
}

export function invalidateSession(): void {
  deleteCookie('session_id', AUTH_COOKIE_OPTIONS);
  deleteCookie('access_token', AUTH_COOKIE_OPTIONS);
  deleteCookie('refresh_token', AUTH_COOKIE_OPTIONS);
}

// Cookie validation
export function validateCookieName(name: string): boolean {
  // Basic validation for cookie names
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export function sanitizeCookieValue(value: string): string {
  // Basic sanitization for cookie values
  return value.replace(/[^\w\-._~%]+/g, '');
}
