/**
 * V5 API Configuration
 * 
 * This configuration file defines the new v5 API endpoints that consolidate
 * all entity types (restaurants, synagogues, mikvah, stores) into unified endpoints.
 */

import { getApiBaseUrl } from '../api-config';

// V5 API Base URL - always use production API URL
export const V5_API_BASE_URL = getApiBaseUrl(); // Always use production API

// V5 API Endpoints
export const V5_API_ENDPOINTS = {
  // Entity-specific API endpoints
  ENTITIES: (entityType: string) => `/api/v5/${entityType}`,
  ENTITY_DETAILS: (entityType: string, id: string) => `/api/v5/${entityType}/${id}`,
  ENTITY_SEARCH: '/api/v5/search',
  
  // Unified Search API - cross-entity search
  SEARCH: '/api/v5/search',
  // Backend route is '/api/v5/search/suggest'
  SEARCH_SUGGESTIONS: '/api/v5/search/suggest',
  
  // Admin API - consolidated admin endpoints
  ADMIN_USERS: '/api/v5/admin/users',
  ADMIN_USER_DETAILS: (id: string) => `/api/v5/admin/users/${id}`,
  ADMIN_ENTITIES: (entityType: string) => `/api/v5/admin/entities/${entityType}`,
  ADMIN_ENTITY_DETAILS: (entityType: string, id: string) => `/api/v5/admin/entities/${entityType}/${id}`,
  ADMIN_ANALYTICS: '/api/v5/admin/analytics',
  ADMIN_SYSTEM: '/api/v5/admin/system',
  
  // Monitoring API - health and metrics
  HEALTH: '/api/v5/monitoring/health',
  METRICS: '/api/v5/monitoring/metrics',
  SYSTEM_STATUS: '/api/v5/monitoring/system-status',
  
} as const;

// Entity Types for V5 API
export const V5_ENTITY_TYPES = {
  RESTAURANTS: 'restaurants',
  SYNAGOGUES: 'synagogues', 
  // Backend uses pluralized path: /api/v5/mikvahs
  MIKVAH: 'mikvahs',
  STORES: 'stores',
} as const;

export type V5EntityType = typeof V5_ENTITY_TYPES[keyof typeof V5_ENTITY_TYPES];

// V5 API Request/Response Types
export interface V5ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  next_cursor?: string | null;
  prev_cursor?: string | null;
  total_count?: number | null;
  filterOptions?: {
    agencies: string[];
    kosherCategories: string[];
    listingTypes: string[];
    priceRanges: string[];
    cities: string[];
    states: string[];
  } | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export interface V5SearchParams {
  query?: string;
  entityType?: V5EntityType | V5EntityType[];
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface V5EntityParams {
  entityType?: V5EntityType;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: string;
  includeFilterOptions?: boolean;
  order?: 'asc' | 'desc';
  cursor?: string;
}

// V5 API Client Configuration
export const V5_API_CONFIG = {
  BASE_URL: V5_API_BASE_URL,
  TIMEOUT: 15000, // 15 seconds
  RETRY_ATTEMPTS: 2, // Reduce retries to avoid rate limiting
  RETRY_DELAY: 2000, // 2 seconds - longer delay between retries
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes - longer cache to reduce API calls
} as const;

// Helper function to build V5 API URLs
export function buildV5ApiUrl(endpoint: string, params?: Record<string, any>): string {
  const url = `${V5_API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }
  
  return url;
}

// Migration mapping from old endpoints to new v5 endpoints
export const V5_MIGRATION_MAP = {
  // Old restaurant endpoints -> V5 entity endpoints
  '/api/restaurants': V5_API_ENDPOINTS.ENTITIES,
  '/api/restaurants/unified': V5_API_ENDPOINTS.ENTITIES,
  '/api/restaurants/search': V5_API_ENDPOINTS.ENTITY_SEARCH,
  
  // Old synagogue endpoints -> V5 entity endpoints
  '/api/synagogues': V5_API_ENDPOINTS.ENTITIES,
  '/api/synagogues/unified': V5_API_ENDPOINTS.ENTITIES,
  '/api/synagogues/search': V5_API_ENDPOINTS.ENTITY_SEARCH,
  
  // Old mikvah endpoints -> V5 entity endpoints
  '/api/mikvah': V5_API_ENDPOINTS.ENTITIES,
  '/api/mikvah/search': V5_API_ENDPOINTS.ENTITY_SEARCH,
  
  // Old store endpoints -> V5 entity endpoints
  '/api/stores': V5_API_ENDPOINTS.ENTITIES,
  '/api/stores/search': V5_API_ENDPOINTS.ENTITY_SEARCH,
  
  // Old search endpoints -> V5 search endpoints
  '/api/search': V5_API_ENDPOINTS.SEARCH,
  '/api/search/suggestions': V5_API_ENDPOINTS.SEARCH_SUGGESTIONS,
  
  // Old admin endpoints -> V5 admin endpoints
  '/api/admin/users': V5_API_ENDPOINTS.ADMIN_USERS,
  '/api/admin/restaurants': V5_API_ENDPOINTS.ADMIN_ENTITIES('restaurants'),
  '/api/admin/synagogues': V5_API_ENDPOINTS.ADMIN_ENTITIES('synagogues'),
  // Admin endpoints should also use pluralized entity key
  '/api/admin/mikvah': V5_API_ENDPOINTS.ADMIN_ENTITIES('mikvahs'),
  '/api/admin/stores': V5_API_ENDPOINTS.ADMIN_ENTITIES('stores'),
  '/api/admin/analytics': V5_API_ENDPOINTS.ADMIN_ANALYTICS,
  '/api/admin/system': V5_API_ENDPOINTS.ADMIN_SYSTEM,
  
  // Old monitoring endpoints -> V5 monitoring endpoints
  '/api/health': V5_API_ENDPOINTS.HEALTH,
  '/api/metrics': V5_API_ENDPOINTS.METRICS,
  '/api/status': V5_API_ENDPOINTS.SYSTEM_STATUS,
} as const;

// Feature flag for V5 API migration
export const V5_API_ENABLED = process.env.NEXT_PUBLIC_V5_API_ENABLED === 'true' || 
                              process.env.NODE_ENV === 'production';

// Helper function to get the appropriate endpoint (v5 or legacy)
export function getApiEndpoint(legacyEndpoint: string, entityType?: string): string {
  if (V5_API_ENABLED && V5_MIGRATION_MAP[legacyEndpoint as keyof typeof V5_MIGRATION_MAP]) {
    const endpoint = V5_MIGRATION_MAP[legacyEndpoint as keyof typeof V5_MIGRATION_MAP];
    
    // If the endpoint is a function (like ENTITIES), call it with entityType
    if (typeof endpoint === 'function' && entityType) {
      return endpoint(entityType);
    }
    
    // If it's a string, return it directly
    if (typeof endpoint === 'string') {
      return endpoint;
    }
  }
  return legacyEndpoint;
}
