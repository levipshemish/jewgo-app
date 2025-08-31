/**
 * Unified API Route Utilities
 * ===========================
 * 
 * Centralized API route utility functions to eliminate code duplication.
 * This module consolidates common API route patterns for backend forwarding,
 * error handling, and response formatting.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Backend URL configuration
 */
export function getBackendUrl(): string {
  return process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://api.jewgo.app';
}

/**
 * Default headers for API requests
 */
const getDefaultHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
});

/**
 * Error response factory
 */
const createErrorResponse = (
  message: string,
  status: number = 500,
  error?: string
): NextResponse => {
  return NextResponse.json(
    {
      error: error || 'Internal server error',
      message,
      ...(process.env.NODE_ENV === 'development' && error && { debug: error })
    },
    { status }
  );
};

/**
 * Service unavailable response factory
 */
const createServiceUnavailableResponse = (serviceName: string): NextResponse => {
  return NextResponse.json(
    {
      error: 'Backend service unavailable',
      message: `${serviceName} service is currently unavailable`
    },
    { status: 503 }
  );
};

/**
 * Forward GET request to backend
 */
export const forwardGetRequest = async (
  endpoint: string,
  serviceName: string,
  request?: NextRequest
): Promise<NextResponse> => {
  try {
    const backendUrl = getBackendUrl();
    const url = new URL(`${backendUrl}${endpoint}`);
    
    // Add query parameters if request is provided
    if (request) {
      const searchParams = request.nextUrl.searchParams;
      searchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }

    const backendResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: getDefaultHeaders(),
    });

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return createServiceUnavailableResponse(serviceName);
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // console.error(`Error in ${serviceName} API route:`, error);
    return createErrorResponse(
      `Failed to fetch ${serviceName.toLowerCase()}`,
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Forward POST request to backend
 */
export const forwardPostRequest = async (
  endpoint: string,
  serviceName: string,
  request: NextRequest,
  validateBody?: (body: any) => { isValid: boolean; errors: string[] }
): Promise<NextResponse> => {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));

    // Validate body if validator is provided
    if (validateBody) {
      const validation = validateBody(body);
      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: 'Invalid request data',
            details: validation.errors
          },
          { status: 400 }
        );
      }
    }

    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // console.error(`Error in ${serviceName} API route:`, error);
    return createErrorResponse(
      `Failed to process ${serviceName.toLowerCase()}`,
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Forward PUT request to backend
 */
export const forwardPutRequest = async (
  endpoint: string,
  serviceName: string,
  request: NextRequest,
  validateBody?: (body: any) => { isValid: boolean; errors: string[] }
): Promise<NextResponse> => {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));

    // Validate body if validator is provided
    if (validateBody) {
      const validation = validateBody(body);
      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: 'Invalid request data',
            details: validation.errors
          },
          { status: 400 }
        );
      }
    }

    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}${endpoint}`, {
      method: 'PUT',
      headers: getDefaultHeaders(),
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // console.error(`Error in ${serviceName} API route:`, error);
    return createErrorResponse(
      `Failed to update ${serviceName.toLowerCase()}`,
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Forward DELETE request to backend
 */
export const forwardDeleteRequest = async (
  endpoint: string,
  serviceName: string,
  request?: NextRequest
): Promise<NextResponse> => {
  try {
    const backendUrl = getBackendUrl();
    const url = new URL(`${backendUrl}${endpoint}`);
    
    // Add query parameters if request is provided
    if (request) {
      const searchParams = request.nextUrl.searchParams;
      searchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    }

    const backendResponse = await fetch(url.toString(), {
      method: 'DELETE',
      headers: getDefaultHeaders(),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    // console.error(`Error in ${serviceName} API route:`, error);
    return createErrorResponse(
      `Failed to delete ${serviceName.toLowerCase()}`,
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

/**
 * Create a simple GET route handler
 */
export const createGetRoute = (
  endpoint: string,
  serviceName: string
) => {
  return async (request?: NextRequest) => {
    return forwardGetRequest(endpoint, serviceName, request);
  };
};

/**
 * Create a simple POST route handler
 */
export const createPostRoute = (
  endpoint: string,
  serviceName: string,
  validateBody?: (body: any) => { isValid: boolean; errors: string[] }
) => {
  return async (request: NextRequest) => {
    return forwardPostRequest(endpoint, serviceName, request, validateBody);
  };
};

/**
 * Create a simple PUT route handler
 */
export const createPutRoute = (
  endpoint: string,
  serviceName: string,
  validateBody?: (body: any) => { isValid: boolean; errors: string[] }
) => {
  return async (request: NextRequest) => {
    return forwardPutRequest(endpoint, serviceName, request, validateBody);
  };
};

/**
 * Create a simple DELETE route handler
 */
export const createDeleteRoute = (
  endpoint: string,
  serviceName: string
) => {
  return async (request?: NextRequest) => {
    return forwardDeleteRequest(endpoint, serviceName, request);
  };
};

/**
 * Create a complete CRUD route handler
 */
export const createCrudRoutes = (
  baseEndpoint: string,
  serviceName: string,
  validateBody?: (body: any) => { isValid: boolean; errors: string[] }
) => {
  return {
    GET: createGetRoute(baseEndpoint, serviceName),
    POST: createPostRoute(baseEndpoint, serviceName, validateBody),
    PUT: createPutRoute(baseEndpoint, serviceName, validateBody),
    DELETE: createDeleteRoute(baseEndpoint, serviceName),
  };
};

/**
 * Validate common request patterns
 */
export const validators = {
  /**
   * Validate limit parameter
   */
  validateLimit: (limit: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }
    return { isValid: errors.length === 0, errors };
  },

  /**
   * Validate required fields
   */
  validateRequiredFields: (
    body: any,
    requiredFields: string[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    }
    return { isValid: errors.length === 0, errors };
  },

  /**
   * Validate email format
   */
  validateEmail: (email: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    return { isValid: errors.length === 0, errors };
  },

  /**
   * Validate phone number format
   */
  validatePhone: (phone: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.push('Invalid phone number format');
    }
    return { isValid: errors.length === 0, errors };
  },
};

/**
 * Common response helpers
 */
export const responses = {
  /**
   * Success response
   */
  success: (data: any, status: number = 200): NextResponse => {
    return NextResponse.json(data, { status });
  },

  /**
   * Created response
   */
  created: (data: any): NextResponse => {
    return NextResponse.json(data, { status: 201 });
  },

  /**
   * No content response
   */
  noContent: (): NextResponse => {
    return new NextResponse(null, { status: 204 });
  },

  /**
   * Bad request response
   */
  badRequest: (message: string, details?: string[]): NextResponse => {
    return NextResponse.json(
      {
        error: 'Bad request',
        message,
        ...(details && { details })
      },
      { status: 400 }
    );
  },

  /**
   * Unauthorized response
   */
  unauthorized: (message: string = 'Unauthorized'): NextResponse => {
    return NextResponse.json(
      { error: 'Unauthorized', message },
      { status: 401 }
    );
  },

  /**
   * Forbidden response
   */
  forbidden: (message: string = 'Forbidden'): NextResponse => {
    return NextResponse.json(
      { error: 'Forbidden', message },
      { status: 403 }
    );
  },

  /**
   * Not found response
   */
  notFound: (message: string = 'Resource not found'): NextResponse => {
    return NextResponse.json(
      { error: 'Not found', message },
      { status: 404 }
    );
  },

  /**
   * Method not allowed response
   */
  methodNotAllowed: (allowedMethods: string[]): NextResponse => {
    return NextResponse.json(
      {
        error: 'Method not allowed',
        message: `Allowed methods: ${allowedMethods.join(', ')}`
      },
      { status: 405 }
    );
  },

  /**
   * Conflict response
   */
  conflict: (message: string): NextResponse => {
    return NextResponse.json(
      { error: 'Conflict', message },
      { status: 409 }
    );
  },

  /**
   * Too many requests response
   */
  tooManyRequests: (message: string = 'Too many requests'): NextResponse => {
    return NextResponse.json(
      { error: 'Too many requests', message },
      { status: 429 }
    );
  },

  /**
   * Internal server error response
   */
  internalError: (message: string = 'Internal server error'): NextResponse => {
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  },

  /**
   * Service unavailable response
   */
  serviceUnavailable: (serviceName: string): NextResponse => {
    return NextResponse.json(
      {
        error: 'Service unavailable',
        message: `${serviceName} service is currently unavailable`
      },
      { status: 503 }
    );
  },
};

const apiRouteUtils = {
  forwardGetRequest,
  forwardPostRequest,
  forwardPutRequest,
  forwardDeleteRequest,
  createGetRoute,
  createPostRoute,
  createPutRoute,
  createDeleteRoute,
  createCrudRoutes,
  validators,
  responses,
  getBackendUrl,
  getDefaultHeaders,
};

export default apiRouteUtils;
