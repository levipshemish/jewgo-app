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

export async function setSecureCookie(
  name: string,
  value: string,
  options: Partial<CookieOptions> = {}
): Promise<void> {
  const cookieStore = await cookies();
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

export async function getCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function deleteCookie(name: string, options: Partial<CookieOptions> = {}): Promise<void> {
  const cookieStore = await cookies();
  const finalOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  
  cookieStore.set(name, '', {
    ...finalOptions,
    maxAge: 0,
  });
}

export async function setAuthCookie(name: string, value: string): Promise<void> {
  await setSecureCookie(name, value, AUTH_COOKIE_OPTIONS);
}

export async function setCSRFCookie(name: string, value: string): Promise<void> {
  await setSecureCookie(name, value, CSRF_COOKIE_OPTIONS);
}

// Session rotation utilities
export async function rotateSession(): Promise<void> {
  // In a real implementation, this would invalidate the current session
  // and create a new one. For now, we'll just set a new session ID.
  const sessionId = crypto.randomUUID();
  await setAuthCookie('session_id', sessionId);
}

export async function invalidateSession(): Promise<void> {
  await deleteCookie('session_id', AUTH_COOKIE_OPTIONS);
  await deleteCookie('access_token', AUTH_COOKIE_OPTIONS);
  await deleteCookie('refresh_token', AUTH_COOKIE_OPTIONS);
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
