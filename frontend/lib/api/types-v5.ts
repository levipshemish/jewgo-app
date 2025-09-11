/**
 * Type definitions for v5 API client.
 */

export type EntityType = 'restaurants' | 'synagogues' | 'mikvahs' | 'stores';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  status?: number;  // Add status property for HTTP status codes
  headers?: Record<string, string>;  // Add headers property
}

export interface PaginatedResponse<T = any> {
  success?: boolean;  // Add success property for consistency
  error?: string;     // Add error property for error cases
  data: T[];
  pagination: {
    cursor?: string;
    next_cursor?: string;
    prev_cursor?: string;
    limit: number;
    has_more: boolean;
    total_count?: number;
  };
  metadata?: {
    filters_applied?: Record<string, any>;
    entity_type?: string;
    sort_key?: string;
    timestamp?: string;
  };
  headers?: Record<string, string>;  // Add headers property
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  correlation_id?: string;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  etag?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;  // Add idempotency key support
}

export interface EntityFilters {
  search?: string;
  status?: string;
  category?: string;
  kosher_cert?: string;
  rating_min?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  [key: string]: any;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
  sort?: string;
}