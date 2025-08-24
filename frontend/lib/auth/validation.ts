/**
 * Authentication Validation Module
 * Centralized validation functions for auth operations
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
export const EmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Password validation schema
 */
export const PasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

/**
 * Sign-in validation schema
 */
export const SignInSchema = EmailSchema.merge(PasswordSchema);

/**
 * Turnstile token validation
 */
export const TurnstileSchema = z.object({
  token: z.string().min(10, 'Invalid security token'),
});

/**
 * Rate limit validation
 */
export const RateLimitSchema = z.object({
  key: z.string(),
  bucket: z.enum(['email_auth', 'anonymous_auth', 'password_reset']),
  ip: z.string(),
});

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}

/**
 * Validate redirect URL for security
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      'jewgo.app',
      'www.jewgo.app',
      'jewgo.com',
      'www.jewgo.com',
    ];
    
    return allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Sanitize user input for security
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}
