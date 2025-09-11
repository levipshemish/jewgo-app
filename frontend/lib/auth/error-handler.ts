/**
 * Comprehensive error handling for authentication operations.
 * 
 * This module provides standardized error handling, user-friendly error messages,
 * and proper error logging for authentication operations.
 */

import { appLogger } from '@/lib/utils/logger';

// Error codes for different types of authentication failures
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_NOT_VERIFIED: 'account_not_verified',
  PASSWORD_TOO_WEAK: 'password_too_weak',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  INVALID_EMAIL_FORMAT: 'invalid_email_format',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CSRF_VALIDATION_FAILED: 'csrf_validation_failed',
  RECAPTCHA_VALIDATION_FAILED: 'recaptcha_validation_failed',
  SESSION_EXPIRED: 'session_expired',
  INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
  ACCOUNT_SUSPENDED: 'account_suspended',
  TWO_FACTOR_REQUIRED: 'two_factor_required',
  TWO_FACTOR_INVALID: 'two_factor_invalid',
  PASSWORD_RESET_EXPIRED: 'password_reset_expired',
  PASSWORD_RESET_INVALID: 'password_reset_invalid',
  EMAIL_VERIFICATION_EXPIRED: 'email_verification_expired',
  EMAIL_VERIFICATION_INVALID: 'email_verification_invalid',
  OAUTH_PROVIDER_ERROR: 'oauth_provider_error',
  OAUTH_ACCOUNT_LINKED: 'oauth_account_linked',
  OAUTH_ACCOUNT_NOT_FOUND: 'oauth_account_not_found',
  GUEST_UPGRADE_FAILED: 'guest_upgrade_failed',
  NETWORK_ERROR: 'network_error',
  INTERNAL_ERROR: 'internal_error',
} as const;

// User-friendly error messages
export const AUTH_ERROR_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password. Please check your credentials and try again.',
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.',
  [AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED]: 'Please verify your email address before signing in. Check your inbox for a verification link.',
  [AUTH_ERROR_CODES.PASSWORD_TOO_WEAK]: 'Password does not meet security requirements. Please choose a stronger password.',
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email address already exists. Please sign in or use a different email.',
  [AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT]: 'Please enter a valid email address.',
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AUTH_ERROR_CODES.TOKEN_INVALID]: 'Invalid or corrupted authentication token. Please sign in again.',
  [AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many attempts. Please wait a moment before trying again.',
  [AUTH_ERROR_CODES.CSRF_VALIDATION_FAILED]: 'Security validation failed. Please refresh the page and try again.',
  [AUTH_ERROR_CODES.RECAPTCHA_VALIDATION_FAILED]: 'Security verification failed. Please try again.',
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [AUTH_ERROR_CODES.ACCOUNT_SUSPENDED]: 'Your account has been suspended. Please contact support for assistance.',
  [AUTH_ERROR_CODES.TWO_FACTOR_REQUIRED]: 'Two-factor authentication is required. Please enter your verification code.',
  [AUTH_ERROR_CODES.TWO_FACTOR_INVALID]: 'Invalid verification code. Please try again.',
  [AUTH_ERROR_CODES.PASSWORD_RESET_EXPIRED]: 'Password reset link has expired. Please request a new one.',
  [AUTH_ERROR_CODES.PASSWORD_RESET_INVALID]: 'Invalid password reset link. Please request a new one.',
  [AUTH_ERROR_CODES.EMAIL_VERIFICATION_EXPIRED]: 'Email verification link has expired. Please request a new one.',
  [AUTH_ERROR_CODES.EMAIL_VERIFICATION_INVALID]: 'Invalid email verification link. Please request a new one.',
  [AUTH_ERROR_CODES.OAUTH_PROVIDER_ERROR]: 'Authentication with external provider failed. Please try again.',
  [AUTH_ERROR_CODES.OAUTH_ACCOUNT_LINKED]: 'This account is already linked to another user.',
  [AUTH_ERROR_CODES.OAUTH_ACCOUNT_NOT_FOUND]: 'No account found with this provider. Please sign up first.',
  [AUTH_ERROR_CODES.GUEST_UPGRADE_FAILED]: 'Failed to upgrade guest account. Please try again or contact support.',
  [AUTH_ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
} as const;

export interface AuthError {
  code: string;
  message: string;
  details?: any;
  retryAfter?: number;
  unlockTime?: string;
}

export class AuthErrorHandler {
  /**
   * Handle authentication errors with proper logging and user-friendly responses.
   */
  static handleError(
    error: any,
    operation: string = 'authentication',
    context?: Record<string, any>
  ): AuthError {
    // Log the error
    appLogger.error(`Authentication error in ${operation}`, {
      error: error?.message || String(error),
      stack: error?.stack,
      operation,
      context,
    });

    // Classify the error
    const errorCode = this.classifyError(error);
    const message = AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_MESSAGES] || AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INTERNAL_ERROR];

    return {
      code: errorCode,
      message,
      details: this.extractErrorDetails(error),
      retryAfter: this.getRetryAfter(error),
      unlockTime: this.getUnlockTime(error),
    };
  }

  /**
   * Classify error type based on error message, status code, or other properties.
   */
  private static classifyError(error: any): string {
    if (!error) return AUTH_ERROR_CODES.INTERNAL_ERROR;

    const errorMessage = (error?.message || String(error)).toLowerCase();
    const status = error?.status || error?.statusCode;

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return AUTH_ERROR_CODES.NETWORK_ERROR;
    }

    // Rate limiting
    if (status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED;
    }

    // Authentication errors
    if (status === 401) {
      if (errorMessage.includes('invalid') || errorMessage.includes('incorrect')) {
        return AUTH_ERROR_CODES.INVALID_CREDENTIALS;
      } else if (errorMessage.includes('expired')) {
        return AUTH_ERROR_CODES.TOKEN_EXPIRED;
      } else if (errorMessage.includes('token')) {
        return AUTH_ERROR_CODES.TOKEN_INVALID;
      } else {
        return AUTH_ERROR_CODES.INVALID_CREDENTIALS;
      }
    }

    // Forbidden errors
    if (status === 403) {
      if (errorMessage.includes('csrf')) {
        return AUTH_ERROR_CODES.CSRF_VALIDATION_FAILED;
      } else if (errorMessage.includes('permission')) {
        return AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      } else {
        return AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      }
    }

    // Account locked
    if (status === 423 || errorMessage.includes('locked') || errorMessage.includes('blocked')) {
      return AUTH_ERROR_CODES.ACCOUNT_LOCKED;
    }

    // Validation errors
    if (status === 400) {
      if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('requirements'))) {
        return AUTH_ERROR_CODES.PASSWORD_TOO_WEAK;
      } else if (errorMessage.includes('email') && errorMessage.includes('format')) {
        return AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT;
      } else if (errorMessage.includes('recaptcha')) {
        return AUTH_ERROR_CODES.RECAPTCHA_VALIDATION_FAILED;
      } else {
        return AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT;
      }
    }

    // Conflict errors
    if (status === 409 || errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      return AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS;
    }

    // OAuth errors
    if (errorMessage.includes('oauth') || errorMessage.includes('provider')) {
      return AUTH_ERROR_CODES.OAUTH_PROVIDER_ERROR;
    }

    // Default to internal error
    return AUTH_ERROR_CODES.INTERNAL_ERROR;
  }

  /**
   * Extract additional error details from the error object.
   */
  private static extractErrorDetails(error: any): any {
    if (error?.details) return error.details;
    if (error?.response?.data?.details) return error.response.data.details;
    return undefined;
  }

  /**
   * Get retry-after time for rate limiting.
   */
  private static getRetryAfter(error: any): number | undefined {
    if (error?.retryAfter) return error.retryAfter;
    if (error?.response?.data?.retry_after) return error.response.data.retry_after;
    return undefined;
  }

  /**
   * Get account unlock time.
   */
  private static getUnlockTime(error: any): string | undefined {
    if (error?.unlockTime) return error.unlockTime;
    if (error?.response?.data?.unlock_time) return error.response.data.unlock_time;
    return undefined;
  }

  /**
   * Create a user-friendly error message from an error code.
   */
  static getErrorMessage(errorCode: string): string {
    return AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_MESSAGES] || AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INTERNAL_ERROR];
  }

  /**
   * Check if an error is retryable.
   */
  static isRetryable(error: any): boolean {
    const errorCode = this.classifyError(error);
    return [
      AUTH_ERROR_CODES.NETWORK_ERROR,
      AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      AUTH_ERROR_CODES.INTERNAL_ERROR,
    ].includes(errorCode as any);
  }

  /**
   * Get retry delay for retryable errors.
   */
  static getRetryDelay(error: any): number {
    const retryAfter = this.getRetryAfter(error);
    if (retryAfter) return retryAfter * 1000; // Convert to milliseconds

    const errorCode = this.classifyError(error);
    switch (errorCode) {
      case AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return 60000; // 1 minute
      case AUTH_ERROR_CODES.NETWORK_ERROR:
        return 5000; // 5 seconds
      default:
        return 1000; // 1 second
    }
  }
}

/**
 * Convenience function for handling authentication errors.
 */
export function handleAuthError(
  error: any,
  operation: string = 'authentication',
  context?: Record<string, any>
): AuthError {
  return AuthErrorHandler.handleError(error, operation, context);
}

/**
 * Convenience function for getting user-friendly error messages.
 */
export function getAuthErrorMessage(errorCode: string): string {
  return AuthErrorHandler.getErrorMessage(errorCode);
}
