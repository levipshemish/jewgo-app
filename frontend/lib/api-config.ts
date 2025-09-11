/**
 * API Configuration for different environments
 * Handles backend URL configuration for development and production
 */

/**
 * Get the API base URL based on environment
 */
export function getApiBaseUrl(): string {
  // Always prioritize NEXT_PUBLIC_BACKEND_URL if it's set
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // In production, use the environment variable or default Render URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.jewgo.app';
  }
  
  // In development, use local backend if available, otherwise fall back to production
  return process.env.BACKEND_URL || 'https://api.jewgo.app';
}

/**
 * Centralized backend URL utility to eliminate duplication across API routes
 * This replaces the pattern: getBackendUrl()
 */
export function getBackendUrl(): string {
  // Always prioritize NEXT_PUBLIC_BACKEND_URL if it's set
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  return process.env.BACKEND_URL || 'https://api.jewgo.app';
}

export function getBackendUrlForClient(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
}

/**
 * Centralized frontend URL utility
 */
export const getFrontendUrl = (): string => {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  FRONTEND_URL: getFrontendUrl(),
  TIMEOUT: 10000, // 10 seconds
}

// API endpoints (backend-proxied)
export const API_ENDPOINTS = {
  // Authentication
  REGISTER: '/api/auth/register',
  VERIFY_EMAIL: '/api/auth/verify-email',
  RESET_PASSWORD: '/api/auth/reset-password',
  RESET_PASSWORD_CONFIRM: '/api/auth/reset-password/confirm',
  
  // Legacy Backend API endpoints (these will be proxied to Render backend)
  RESTAURANTS: '/api/restaurants',
  RESTAURANT_DETAILS: (id: string) => `/api/restaurants/${id}`,
  REVIEWS: '/api/reviews',
  STATISTICS: '/api/statistics',
  
  // V5 API endpoints (unified endpoints)
  V5_ENTITIES: '/v5/entities',
  V5_ENTITY_DETAILS: (id: string) => `/v5/entities/${id}`,
  V5_SEARCH: '/v5/search',
  V5_ADMIN_USERS: '/v5/admin/users',
  V5_ADMIN_ENTITIES: (entityType: string) => `/v5/admin/entities/${entityType}`,
  V5_ADMIN_ANALYTICS: '/v5/admin/analytics',
  V5_MONITORING_HEALTH: '/v5/monitoring/health',
  V5_MONITORING_METRICS: '/v5/monitoring/metrics',
}

// Helper function to make API calls
export const apiCall = async (
  endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: controller.signal,
  }
  
  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function for frontend API calls (same domain)
export const frontendApiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${API_CONFIG.FRONTEND_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }
  
  return fetch(url, { ...defaultOptions, ...options })
}

// Note: Admin routes are implemented within the Next.js app under `/api/admin/*`.
// Use `fetch('/api/admin/...')` or `frontendApiCall('/api/admin/...')` for admin functionality.
// We intentionally do not list admin endpoints in API_ENDPOINTS to avoid confusion with
// backend-proxied endpoints configured via BASE_URL.

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production'
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isTest = process.env.NODE_ENV === 'test'
