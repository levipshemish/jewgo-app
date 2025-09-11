/**
 * V5 API Utilities
 * 
 * Common utility functions for the v5 API client.
 */

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build query string from parameters
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString: string): Record<string, string | string[]> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string | string[]> = {};
  
  params.forEach((value, key) => {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        (result[key] as string[]).push(value);
      } else {
        result[key] = [result[key] as string, value];
      }
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;
  
  Object.keys(source).forEach(key => {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        (result as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (result as any)[key] = sourceValue;
      }
    } else {
      (result as any)[key] = sourceValue;
    }
  });
  
  return result;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Format error message
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Sanitize string for logging
 */
export function sanitizeForLogging(value: any): any {
  if (typeof value === 'string') {
    // Remove sensitive patterns
    return value
      .replace(/password["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'password="***"')
      .replace(/token["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'token="***"')
      .replace(/key["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'key="***"');
  }
  
  if (typeof value === 'object' && value !== null) {
    const sanitized: any = Array.isArray(value) ? [] : {};
    
    Object.keys(value).forEach(key => {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('key')) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitizeForLogging(value[key]);
      }
    });
    
    return sanitized;
  }
  
  return value;
}

/**
 * Create URL with base URL
 */
export function createUrl(baseUrl: string, path: string, params?: Record<string, any>): string {
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Parse response headers
 */
export function parseResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  
  headers.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Check if response is successful
 */
export function isSuccessfulResponse(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if response is client error
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if response is server error
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Get error type from status code
 */
export function getErrorType(status: number): string {
  if (status >= 400 && status < 500) {
    return 'client_error';
  } else if (status >= 500 && status < 600) {
    return 'server_error';
  } else {
    return 'unknown_error';
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format duration to human readable string
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Validate authentication token
 */
export function validateAuth(token: string): boolean {
  if (!token) return false;
  
  try {
    // Basic JWT validation (check structure)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiry
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return payload.exp > now;
  } catch {
    return false;
  }
}

/**
 * Validate authentication from request
 */
export async function validateAuthFromRequest(request: Request, _options?: { requireAdmin?: boolean }): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  token?: string;
  user?: any;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
        status: 401
      };
    }
    
    if (!validateAuth(token)) {
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      };
    }
    
    // TODO: Add admin role checking if requireAdmin is true
    // For now, just return success
    return {
      success: true,
      token,
      user: { id: 'user_id', roles: ['user'] }
    };
  } catch (_error) {
    return {
      success: false,
      error: 'Authentication validation failed',
      status: 500
    };
  }
}

/**
 * Validate entity type
 */
export function isValidEntityType(entityType: string): boolean {
  const validTypes = ['restaurants', 'synagogues', 'mikvahs', 'stores'];
  return validTypes.includes(entityType);
}

/**
 * Parse search parameters from request
 */
export function parseSearchParams(request: Request): Record<string, any> {
  const url = new URL(request.url);
  const params: Record<string, any> = {};
  
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Parse location from parameters
 */
export function parseLocationFromParams(params: Record<string, any>): { latitude: number; longitude: number; radius?: number } | undefined {
  const lat = params.latitude || params.lat;
  const lng = params.longitude || params.lng;
  const radius = params.radius;
  
  if (!lat || !lng) return undefined;
  
  try {
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius: radius ? parseFloat(radius) : undefined
    };
  } catch {
    return undefined;
  }
}