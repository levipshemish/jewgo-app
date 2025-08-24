/**
 * Uniform Authentication Error Helper
 * Prevents user enumeration by providing consistent error messages
 */

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  shouldLog: boolean;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    userMessage: 'Invalid email or password',
    shouldLog: false
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    userMessage: 'Invalid email or password', // Same as invalid credentials
    shouldLog: true
  },
  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    message: 'Account temporarily locked',
    userMessage: 'Account temporarily locked due to too many failed attempts',
    shouldLog: true
  },
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Email not verified',
    userMessage: 'Please check your email and click the verification link',
    shouldLog: false
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many attempts',
    userMessage: 'Too many attempts. Please try again later.',
    shouldLog: true
  },
  TURNSTILE_FAILED: {
    code: 'TURNSTILE_FAILED',
    message: 'Security verification failed',
    userMessage: 'Security verification failed. Please try again.',
    shouldLog: true
  },
  GENERIC_ERROR: {
    code: 'GENERIC_ERROR',
    message: 'Authentication failed',
    userMessage: 'An error occurred during authentication. Please try again.',
    shouldLog: true
  }
} as const;

export function getAuthError(errorCode: keyof typeof AUTH_ERRORS): AuthError {
  return AUTH_ERRORS[errorCode];
}

export function getGenericAuthError(): AuthError {
  return AUTH_ERRORS.GENERIC_ERROR;
}

export function logAuthError(error: AuthError, context?: Record<string, any>): void {
  if (error.shouldLog) {
    console.error(`[Auth Error] ${error.code}: ${error.message}`, context);
  }
}

export function createAuthErrorResponse(error: AuthError): { ok: false; message: string } {
  logAuthError(error);
  return {
    ok: false,
    message: error.userMessage
  };
}

// Map Supabase errors to our uniform error format
export function mapSupabaseError(supabaseError: any): AuthError {
  const message = supabaseError?.message || 'Unknown error';
  
  if (message.includes('Invalid login credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  
  if (message.includes('User not found')) {
    return AUTH_ERRORS.USER_NOT_FOUND;
  }
  
  if (message.includes('Email not confirmed')) {
    return AUTH_ERRORS.EMAIL_NOT_VERIFIED;
  }
  
  if (message.includes('Too many requests')) {
    return AUTH_ERRORS.RATE_LIMITED;
  }
  
  // Default to generic error
  return AUTH_ERRORS.GENERIC_ERROR;
}
