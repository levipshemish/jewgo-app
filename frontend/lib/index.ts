/**
 * Barrel Export for Common Utilities
 * =================================
 * 
 * This file provides centralized imports for commonly used utilities
 * to avoid path resolution issues and simplify imports.
 */

// API Configuration
export { getBackendUrl, getFrontendUrl, API_CONFIG, API_ENDPOINTS, apiCall, frontendApiCall } from './api-config';

// Frontend URL Configuration (NEW)
export {
  getFrontendAppUrl,
  getAlternativeBackendUrl,
  getCloudinaryUrl,
  buildFrontendUrl,
  buildBackendUrl,
  buildAlternativeBackendUrl,
  isProduction,
  isDevelopment,
  isTest,
  getEnvironmentConfig,
  FRONTEND_URL_CONFIG
} from './frontend-url-config';

// Error Response Utilities
export { errorResponses, createErrorResponse, createSuccessResponse } from './utils/error-responses';

// Restaurant Status Utilities (server-only)
export { handleRestaurantStatusChange, validateRestaurantPermissions } from './server/restaurant-status-utils';

// Common Types
export type { RestaurantStatusChangeParams, StatusChangeResult } from './server/restaurant-status-utils';

// PostgreSQL Authentication (NEW - Migration from Supabase)
export { postgresAuth, type AuthUser } from './auth/postgres-auth';

// Re-export other commonly used utilities as needed
export { prisma } from './db/prisma';
