import 'server-only';

// Legacy admin utilities for server-side use only
// This file provides admin-related utilities that can only be used on the server
// Moved from lib/utils/admin.ts to resolve import restrictions

export * from '@/lib/admin/types';
export * from '@/lib/admin/constants-client';
export { 
  restaurantCreateSchema,
  restaurantUpdateSchema,
  reviewCreateSchema,
  reviewUpdateSchema,
  userSchema,
  userUpdateSchema,
  paginationSchema,
  searchFilterSchema,
  bulkOperationSchema,
  exportSchema,
  validationUtils,
  type RestaurantInput,
  type ReviewInput,
  type UserInput,
  type PaginationInput,
  type SearchFilterInput,
  type BulkOperationInput,
  type ExportInput
} from '@/lib/admin/validation';
