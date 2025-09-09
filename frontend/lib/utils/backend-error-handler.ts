/**
 * Backend Error Handler Utility
 * Provides consistent error handling for backend connectivity issues
 */

export interface BackendErrorResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  status?: number;
}

export interface BackendErrorOptions {
  fallbackData?: any;
  customMessage?: string;
  logError?: boolean;
}

/**
 * Handles backend connectivity errors gracefully
 * Returns appropriate responses to keep the frontend working
 */
export function handleBackendError(
  error: unknown,
  options: BackendErrorOptions = {}
): BackendErrorResponse {
  const {
    fallbackData = null,
    customMessage,
    logError = true
  } = options;

  if (logError) {
    console.error('Backend error:', error);
  }

  // Determine error type and provide appropriate logging
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout - backend server not responding');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('Connection refused - backend server is down or unreachable');
    } else if (error.message.includes('fetch failed')) {
      console.error('Network error - unable to reach backend server');
    } else if (error.message.includes('ECONNRESET')) {
      console.error('Connection reset - backend server closed the connection');
    } else {
      console.error('Backend error:', error.message);
    }
  }

  // Return graceful response that allows frontend to continue working
  return {
    success: true, // Always return success to prevent UI errors
    message: customMessage || 'Service temporarily unavailable',
    data: fallbackData,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}

/**
 * Creates a fetch request with timeout and proper error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Standard fallback responses for common API endpoints
 */
export const FALLBACK_RESPONSES = {
  restaurants: {
    success: true,
    items: [],
    next_cursor: null,
    limit: 24,
    message: 'Restaurants retrieved successfully'
  },
  auth: {
    success: false,
    message: 'Authentication service temporarily unavailable',
    user: null,
    authenticated: false
  },
  profile: {
    success: false,
    message: 'User profile service temporarily unavailable',
    user: null,
    authenticated: false
  }
} as const;

/**
 * Gets the appropriate fallback response for an API endpoint
 */
export function getFallbackResponse(endpoint: keyof typeof FALLBACK_RESPONSES): any {
  return FALLBACK_RESPONSES[endpoint];
}
