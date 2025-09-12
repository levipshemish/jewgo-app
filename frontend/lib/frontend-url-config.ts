/**
 * Frontend URL Configuration and Consolidation
 * ===========================================
 * 
 * This module consolidates all frontend URL patterns to eliminate duplication
 * and provide consistent URL handling across the application.
 */

/**
 * Get the current frontend app URL based on environment
 */
export const getFrontendAppUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://jewgo.app';
  }
  
  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }
  
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
};

export function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default to production API
    return process.env.NEXT_PUBLIC_BACKEND_URL || '';
  }
  
  // Client-side: use environment variable or default to production API
  return process.env.NEXT_PUBLIC_BACKEND_URL || '';
}

export function getBackendUrlForServer(): string {
  // Server-side only: use environment variable or default to production API
  return process.env.BACKEND_URL || '';
}

/**
 * Get alternative backend URL for specific services
 */
export const getAlternativeBackendUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return getBackendUrl();
  }
  
  return process.env.BACKEND_URL || '';
};

/**
 * Environment-aware frontend URL configuration
 */
export const FRONTEND_URL_CONFIG = {
  // Production URLs
  PRODUCTION: {
    APP: getFrontendAppUrl(),
    API: getBackendUrl(),
    CLOUDINARY: 'https://api.cloudinary.com',
  },
  
  // Development URLs
  DEVELOPMENT: {
    APP: getFrontendAppUrl(),
    API: getBackendUrl(),
    BACKEND_ALT: getAlternativeBackendUrl(),
    BACKEND_ALT2: getAlternativeBackendUrl(),
  },
  
  // Test URLs
  TEST: {
    APP: getFrontendAppUrl(),
    API: getBackendUrl(),
  }
};

/**
 * Get Cloudinary configuration URL
 */
export const getCloudinaryUrl = (): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable is required');
  }
  
  return `${FRONTEND_URL_CONFIG.PRODUCTION.CLOUDINARY}/v1_1/${cloudName}/image/upload`;
};

/**
 * Build a complete frontend URL for a given path
 */
export const buildFrontendUrl = (path: string): string => {
  const baseUrl = getFrontendAppUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Build a complete backend URL for a given path
 */
export const buildBackendUrl = (path: string): string => {
  const baseUrl = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Build a complete alternative backend URL for a given path
 */
export const buildAlternativeBackendUrl = (path: string): string => {
  const baseUrl = getAlternativeBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Check if the current environment is production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if the current environment is development
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if the current environment is test
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  if (isProduction()) {
    return FRONTEND_URL_CONFIG.PRODUCTION;
  }
  
  if (isTest()) {
    return FRONTEND_URL_CONFIG.TEST;
  }
  
  return FRONTEND_URL_CONFIG.DEVELOPMENT;
};

/**
 * Legacy compatibility functions
 * These maintain backward compatibility while encouraging use of new utilities
 */
export const getFrontendUrl = getFrontendAppUrl;
export const getApiBaseUrl = getBackendUrl;
