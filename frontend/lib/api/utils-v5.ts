/**
 * Utility functions for v5 API client.
 */

import { NextRequest } from 'next/server';
import { EntityType } from './types-v5';

/**
 * Validate authentication from request headers
 */
export function validateAuthFromRequest(
  request: NextRequest, 
  options: { requireAdmin?: boolean } = {}
): {
  isValid: boolean;
  success?: boolean;
  error?: string;
  status?: number;
  userId?: string;
  userRoles?: string[];
  token?: string;
} {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      isValid: false, 
      success: false,
      error: 'Authentication required',
      status: 401 
    };
  }

  const token = authHeader.substring(7);
  
  // Basic token validation (in real implementation, would verify JWT)
  if (!token || token.length < 10) {
    return { 
      isValid: false,
      success: false,
      error: 'Invalid token',
      status: 401
    };
  }

  // Mock user data (in real implementation, would decode JWT)
  const userRoles = ['user', 'admin']; // Mock admin role for testing
  
  // Check admin requirement
  if (options.requireAdmin && !userRoles.includes('admin')) {
    return {
      isValid: false,
      success: false,
      error: 'Admin permissions required',
      status: 403
    };
  }

  return {
    isValid: true,
    success: true,
    userId: 'user-123',
    userRoles,
    token
  };
}

/**
 * Validate entity type
 */
export function isValidEntityType(entityType: string): entityType is EntityType {
  const validTypes: EntityType[] = ['restaurants', 'synagogues', 'mikvahs', 'stores'];
  return validTypes.includes(entityType as EntityType);
}

/**
 * Parse location parameters from request
 */
export function parseLocationFromParams(requestOrParams: NextRequest | URLSearchParams): {
  latitude?: number;
  longitude?: number;
  radius?: number;
  isValid: boolean;
} {
  const searchParams = requestOrParams instanceof URLSearchParams 
    ? requestOrParams 
    : new URL(requestOrParams.url).searchParams;
  
  const lat = searchParams.get('latitude');
  const lng = searchParams.get('longitude');
  const radius = searchParams.get('radius');

  if (!lat || !lng) {
    return { isValid: false };
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusValue = radius ? parseFloat(radius) : 10;

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusValue)) {
    return { isValid: false };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { isValid: false };
  }

  return {
    latitude,
    longitude,
    radius: radiusValue,
    isValid: true
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: any
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(request: NextRequest): {
  cursor?: string;
  limit: number;
  sort?: string;
} {
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const sort = url.searchParams.get('sort') || undefined;

  return {
    cursor,
    limit,
    sort
  };
}

/**
 * Parse entity filters from request
 */
export function parseEntityFilters(request: NextRequest): Record<string, any> {
  const url = new URL(request.url);
  const filters: Record<string, any> = {};

  // Common filter parameters
  const filterParams = [
    'search', 'status', 'category', 'kosher_cert', 'rating_min',
    'price_min', 'price_max', 'denomination'
  ];

  for (const param of filterParams) {
    const value = url.searchParams.get(param);
    if (value) {
      if (param.includes('min') || param.includes('max') || param === 'rating_min') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          filters[param] = numValue;
        }
      } else {
        filters[param] = value;
      }
    }
  }

  return filters;
}

/**
 * Validate request body
 */
export function validateRequestBody(body: any, requiredFields: string[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { isValid: false, errors };
  }

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === undefined || body[field] === null) {
      errors.push(`Required field '${field}' is missing`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract correlation ID from request
 */
export function getCorrelationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') || generateCorrelationId();
}

/**
 * Validate request body from NextRequest
 */
export async function validateRequestBodyFromRequest(request: NextRequest): Promise<{
  isValid: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return {
        isValid: false,
        error: 'Request body must be a valid JSON object'
      };
    }
    
    return {
      isValid: true,
      data: body
    };
  } catch (_error) {
    return {
      isValid: false,
      error: 'Invalid JSON in request body'
    };
  }
}