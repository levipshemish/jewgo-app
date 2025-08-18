/**
 * API Configuration for different environments
 * Handles backend URL configuration for development and production
 */

const getApiBaseUrl = (): string => {
  // In production, use the environment variable or default Render URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo-backend.onrender.com'
  }
  
  // In development, use local backend
  return 'http://localhost:5000'
}

const getFrontendUrl = (): string => {
  return process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
}

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  FRONTEND_URL: getFrontendUrl(),
  TIMEOUT: 10000, // 10 seconds
}

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  REGISTER: '/api/auth/register',
  VERIFY_EMAIL: '/api/auth/verify-email',
  RESET_PASSWORD: '/api/auth/reset-password',
  RESET_PASSWORD_CONFIRM: '/api/auth/reset-password/confirm',
  
  // Backend API endpoints (these will be proxied to Render backend)
  RESTAURANTS: '/api/restaurants',
  RESTAURANT_DETAILS: (id: string) => `/api/restaurants/${id}`,
  REVIEWS: '/api/reviews',
  STATISTICS: '/api/statistics',
  
  // Admin endpoints
  ADMIN_USERS: '/api/admin-proxy/users',
  ADMIN_RESTAURANTS: '/api/admin-proxy/restaurants',
  ADMIN_REVIEWS: '/api/admin-proxy/reviews',
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

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production'
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isTest = process.env.NODE_ENV === 'test'
