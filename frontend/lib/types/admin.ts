import { Restaurant } from './restaurant';

// Base filter interface for pagination and search
export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Restaurant-specific filters
export interface RestaurantFilters extends BaseFilters {
  status?: string;
  kosher_category?: string;
  certifying_agency?: string;
  city?: string;
  state?: string;
}

// User-specific filters
export interface UserFilters extends BaseFilters {
  email_verified?: boolean;
  is_super_admin?: boolean;
  provider?: string;
}

// Review-specific filters (already defined, but importing for consistency)
export interface ReviewFilters extends BaseFilters {
  status?: string;
  restaurant_id?: number;
}

// Admin API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminRestaurantResponse extends PaginatedResponse<Restaurant> {}

export interface AdminUserResponse extends PaginatedResponse<AdminUser> {}

// Admin User type (extending the existing user types)
export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  emailVerified?: boolean;
  avatarUrl?: string;
  provider?: string;
  token?: string; // Optional token for admin operations
}

// Update request types
export interface RestaurantUpdateRequest {
  restaurantId: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  website?: string;
  kosher_category?: string;
  certifying_agency?: string;
  status?: string;
  notes?: string;
}

export interface UserUpdateRequest {
  userId: string;
  email?: string;
  name?: string;
  isSuperAdmin?: boolean;
  emailVerified?: boolean;
  avatarUrl?: string;
  provider?: string;
}

// Cache management types
export interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
  lastCleared?: Date;
}

// Google Reviews types
export interface GoogleReviewsFetchRequest {
  restaurant_id?: number;
  batch_size?: number;
}

export interface GoogleReviewsStatus {
  isRunning: boolean;
  lastRun?: Date;
  totalProcessed: number;
  totalErrors: number;
  currentBatch?: number;
  estimatedCompletion?: Date;
}

// Success response wrapper
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

// Error response wrapper
export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

// Union types for API responses
export type AdminApiResponse<T> = SuccessResponse & { data?: T };
export type AdminApiError = ErrorResponse;
