/**
 * Runtime validation schemas for v5 API using Zod.
 * 
 * Provides comprehensive runtime type validation for all API requests
 * and responses to ensure type safety at runtime.
 */

import { z } from 'zod';

// ============================================================================
// Core API Validation Schemas
// ============================================================================

export const ApiResponseSchema = z.object({
  data: z.unknown(),
  success: z.boolean(),
  status: z.number().min(100).max(599),
  headers: z.record(z.string(), z.string()).optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    cursor: z.string().optional(),
    next_cursor: z.string().optional(),
    has_more: z.boolean(),
    total_count: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
  }),
  metadata: z.object({
    total_count: z.number().optional(),
    filters_applied: z.record(z.string(), z.unknown()).optional(),
    sort_key: z.string().optional(),
    entity_type: z.string().optional(),
  }).optional(),
});

export const RequestOptionsSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  cache: z.boolean().optional(),
  cacheTtl: z.number().positive().optional(),
  retry: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  idempotencyKey: z.string().optional(),
  abortSignal: z.instanceof(AbortSignal).optional(),
});

// ============================================================================
// Entity Validation Schemas
// ============================================================================

export const EntityTypeSchema = z.enum(['restaurants', 'synagogues', 'mikvahs', 'stores']);

export const PaginationOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  sort: z.string().optional(),
});

export const LocationFilterSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().optional(),
});

export const EntityFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  location: LocationFilterSchema.optional(),
  createdAfter: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  // Entity-specific filters
  cuisine_type: z.string().optional(),
  price_range: z.number().min(1).max(4).optional(),
  kosher_certification: z.string().optional(),
  denomination: z.string().optional(),
  services: z.string().optional(),
  store_type: z.string().optional(),
  specialties: z.string().optional(),
  appointment_required: z.boolean().optional(),
  // Custom filters
  customFilters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

// ============================================================================
// Base Entity Schema
// ============================================================================

export const BaseEntitySchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'deleted']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  entity_type: EntityTypeSchema.optional(),
  api_version: z.string().optional(),
  distance_km: z.number().positive().optional(),
});

// ============================================================================
// Restaurant Validation Schemas
// ============================================================================

export const DayHoursSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  closed: z.boolean().optional(),
});

export const OperatingHoursSchema = z.object({
  monday: DayHoursSchema.optional(),
  tuesday: DayHoursSchema.optional(),
  wednesday: DayHoursSchema.optional(),
  thursday: DayHoursSchema.optional(),
  friday: DayHoursSchema.optional(),
  saturday: DayHoursSchema.optional(),
  sunday: DayHoursSchema.optional(),
});

export const DeliveryOptionSchema = z.object({
  provider: z.string(),
  available: z.boolean(),
  estimated_time: z.string().optional(),
  minimum_order: z.number().positive().optional(),
  delivery_fee: z.number().nonnegative().optional(),
});

export const RestaurantPhotoSchema = z.object({
  id: z.number().positive(),
  url: z.string().url(),
  caption: z.string().optional(),
  is_primary: z.boolean().optional(),
  uploaded_at: z.string().datetime(),
});

export const ReviewSummarySchema = z.object({
  average_rating: z.number().min(1).max(5),
  total_reviews: z.number().nonnegative(),
  rating_distribution: z.record(z.string(), z.number().nonnegative()).optional(),
});

export const RestaurantSchema = BaseEntitySchema.extend({
  description: z.string().max(2000).optional(),
  cuisine_type: z.string().max(100).optional(),
  price_range: z.number().min(1).max(4).optional(),
  kosher_certification: z.string().max(100).optional(),
  operating_hours: OperatingHoursSchema.optional(),
  features: z.array(z.string()).optional(),
  menu_url: z.string().url().optional(),
  reservation_url: z.string().url().optional(),
  delivery_options: z.array(DeliveryOptionSchema).optional(),
  average_rating: z.number().min(1).max(5).optional(),
  total_reviews: z.number().nonnegative().optional(),
  is_currently_open: z.boolean().optional(),
  next_opening: z.string().datetime().optional(),
  google_places_id: z.string().optional(),
  photos: z.array(RestaurantPhotoSchema).optional(),
  review_summary: ReviewSummarySchema.optional(),
});

// ============================================================================
// Synagogue Validation Schemas
// ============================================================================

export const PrayerTimesSchema = z.object({
  shacharit: z.string().optional(),
  mincha: z.string().optional(),
  maariv: z.string().optional(),
  shabbat_candle_lighting: z.string().optional(),
  havdalah: z.string().optional(),
});

export const SynagogueProgramSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  schedule: z.string().optional(),
  age_group: z.string().optional(),
  contact: z.string().optional(),
});

export const JewishCalendarInfoSchema = z.object({
  current_parasha: z.string().optional(),
  upcoming_holidays: z.array(z.string()).optional(),
  is_holiday: z.boolean().optional(),
  holiday_name: z.string().optional(),
});

export const SynagogueSchema = BaseEntitySchema.extend({
  denomination: z.enum(['Orthodox', 'Conservative', 'Reform', 'Reconstructionist', 'Other']).optional(),
  services: z.array(z.string()).optional(),
  prayer_times: PrayerTimesSchema.optional(),
  programs: z.array(SynagogueProgramSchema).optional(),
  capacity: z.number().positive().optional(),
  accessibility_features: z.array(z.string()).optional(),
  jewish_calendar_info: JewishCalendarInfoSchema.optional(),
  rabbi_name: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
});

// ============================================================================
// Mikvah Validation Schemas
// ============================================================================

export const TimeSlotSchema = z.object({
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  available: z.boolean(),
  price: z.number().nonnegative().optional(),
});

export const MikvahSchema = BaseEntitySchema.extend({
  appointment_required: z.boolean().optional(),
  operating_hours: OperatingHoursSchema.optional(),
  time_slots: z.array(TimeSlotSchema).optional(),
  amenities: z.array(z.string()).optional(),
  accessibility_features: z.array(z.string()).optional(),
  pricing: z.object({
    standard: z.number().nonnegative().optional(),
    student: z.number().nonnegative().optional(),
    senior: z.number().nonnegative().optional(),
  }).optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional(),
  special_instructions: z.string().max(1000).optional(),
});

// ============================================================================
// Store Validation Schemas
// ============================================================================

export const EcommerceSettingsSchema = z.object({
  online_ordering: z.boolean().optional(),
  delivery_available: z.boolean().optional(),
  pickup_available: z.boolean().optional(),
  minimum_order: z.number().nonnegative().optional(),
  delivery_radius: z.number().positive().optional(),
  delivery_fee: z.number().nonnegative().optional(),
});

export const InventorySummarySchema = z.object({
  total_products: z.number().nonnegative(),
  in_stock: z.number().nonnegative(),
  low_stock: z.number().nonnegative(),
  out_of_stock: z.number().nonnegative(),
});

export const StoreSchema = BaseEntitySchema.extend({
  store_type: z.enum(['marketplace', 'grocery', 'bakery', 'butcher', 'judaica', 'restaurant', 'other']).optional(),
  specialties: z.array(z.string()).optional(),
  kosher_certifications: z.array(z.string()).optional(),
  operating_hours: OperatingHoursSchema.optional(),
  ecommerce_settings: EcommerceSettingsSchema.optional(),
  inventory_summary: InventorySummarySchema.optional(),
  delivery_options: z.array(DeliveryOptionSchema).optional(),
  payment_methods: z.array(z.string()).optional(),
  social_media: z.record(z.string(), z.string().url()).optional(),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate API response data
 */
export function validateApiResponse<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.issues.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Validate request data
 */
export function validateRequestData<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Request validation failed: ${error.issues.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Safe validation that returns result instead of throwing
 */
export function safeValidate<T>(data: unknown, schema: z.ZodSchema<T>): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      success: false,
      errors: ['Unknown validation error']
    };
  }
}

// ============================================================================
// Entity Type Mapping
// ============================================================================

export const EntitySchemas = {
  restaurants: RestaurantSchema,
  synagogues: SynagogueSchema,
  mikvahs: MikvahSchema,
  stores: StoreSchema,
} as const;

export type EntitySchemaType = typeof EntitySchemas[keyof typeof EntitySchemas];

/**
 * Get validation schema for entity type
 */
export function getEntitySchema(entityType: string): z.ZodSchema | null {
  if (entityType in EntitySchemas) {
    return EntitySchemas[entityType as keyof typeof EntitySchemas];
  }
  return null;
}
