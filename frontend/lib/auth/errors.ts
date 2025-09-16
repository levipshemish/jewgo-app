/**
 * Authentication Error Classes
 * ===========================
 * 
 * Centralized error handling for authentication operations.
 * These errors provide structured error information with proper error codes
 * and user-friendly messages for different authentication scenarios.
 */

export interface StepUpChallenge {
  challenge_id: string;
  required_method: 'password' | 'webauthn';
  expires_at: string;
  step_up_url: string;
}

/**
 * Custom error class for authentication errors
 * Provides structured error information with proper error codes
 */
export class AuthError extends Error {
  public code: string;
  public error: string;
  public message: string;
  public correlation_id?: string;
  public step_up_challenge?: StepUpChallenge;
  public retry_after?: number;
  public originalMessage: string;
  public status?: number;

  constructor(message: string, code: string, originalMessage?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.error = message;
    this.message = message;
    this.originalMessage = originalMessage || message;
  }
}

/**
 * Specific authentication error types for better error handling
 */
export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Authentication token has expired') {
    super(message, 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid authentication token') {
    super(message, 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}

export class RateLimitError extends AuthError {
  constructor(message: string = 'Too many requests. Please try again later.', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
    this.retry_after = retryAfter;
  }
}

export class InsufficientPermissionsError extends AuthError {
  constructor(message: string = 'Insufficient permissions to access this resource') {
    super(message, 'INSUFFICIENT_PERMISSIONS');
    this.name = 'InsufficientPermissionsError';
  }
}

export class StepUpRequiredError extends AuthError {
  constructor(message: string = 'Step-up authentication required', challenge?: StepUpChallenge) {
    super(message, 'STEP_UP_REQUIRED');
    this.name = 'StepUpRequiredError';
    this.step_up_challenge = challenge;
  }
}