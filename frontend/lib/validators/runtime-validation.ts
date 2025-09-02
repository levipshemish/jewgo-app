// Runtime type validation utilities
// This provides runtime type checking for critical data flows

import { z } from 'zod';
import type { 
  AsyncResult
} from '@/lib/types/advanced-patterns';

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Base schema for common fields
 */
export const baseSchema = {
  id: z.string().min(1, 'ID is required'),
  createdAt: z.string().datetime('Invalid date format'),
  updatedAt: z.string().datetime('Invalid date format'),
};

/**
 * Email schema with validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email is too long');

/**
 * Phone number schema with validation
 */
export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .min(1, 'Phone number is required');

/**
 * URL schema with validation
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional();

// ============================================================================
// Restaurant Schemas
// ============================================================================

/**
 * Restaurant schema with comprehensive validation
 */
export const restaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100, 'Name is too long'),
  address: z.string().min(1, 'Address is required').max(200, 'Address is too long'),
  city: z.string().min(1, 'City is required').max(50, 'City name is too long'),
  state: z.string().min(1, 'State is required').max(50, 'State name is too long'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  phone_number: phoneSchema,
  website: urlSchema,
  kosher_category: z.enum(['Meat', 'Dairy', 'Pareve', 'Unknown']).refine((val) => val !== undefined, {
    message: 'Invalid kosher category'
  }),
  certifying_agency: z.string().min(1, 'Certifying agency is required'),
  listing_type: z.string().min(1, 'Listing type is required'),
  short_description: z.string().max(500, 'Description is too long').optional(),
  price_range: z.string().optional(),
  hours_of_operation: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z.enum(['open', 'closed', 'unknown']).optional(),
  ...baseSchema,
});

/**
 * Restaurant creation schema (without auto-generated fields)
 */
export const createRestaurantSchema = restaurantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Restaurant update schema (all fields optional)
 */
export const updateRestaurantSchema = createRestaurantSchema.partial();

// ============================================================================
// User Schemas
// ============================================================================

/**
 * User schema with validation
 */
export const userSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  phone: phoneSchema.optional(),
  role: z.enum(['user', 'admin', 'super_admin']).default('user'),
  isActive: z.boolean().default(true),
  ...baseSchema,
});

/**
 * User creation schema
 */
export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * User update schema
 */
export const updateUserSchema = createUserSchema.partial();

// ============================================================================
// API Response Schemas
// ============================================================================

/**
 * Generic API response schema
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  });

/**
 * Paginated API response schema
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  apiResponseSchema(z.array(dataSchema)).extend({
    pagination: z.object({
      page: z.number().min(1),
      limit: z.number().min(1),
      total: z.number().min(0),
      totalPages: z.number().min(0),
    }),
  });

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * Contact form schema
 */
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchema,
  message: z.string().min(1, 'Message is required').max(1000, 'Message is too long'),
});

/**
 * Feedback form schema
 */
export const feedbackFormSchema = z.object({
  type: z.enum(['correction', 'suggestion', 'general', 'restaurant']),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description is too long'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  restaurantId: z.number().positive().optional(),
  restaurantName: z.string().optional(),
  contactEmail: emailSchema.optional(),
});

/**
 * Search form schema
 */
export const searchFormSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Query is too long'),
  filters: z.object({
    kosherCategory: z.enum(['Meat', 'Dairy', 'Pareve', 'Unknown']).optional(),
    certifyingAgency: z.string().optional(),
    priceRange: z.string().optional(),
    openNow: z.boolean().optional(),
    radius: z.number().min(0).max(50).optional(),
  }).optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate data against a schema with proper error handling
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue: z.ZodIssue) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: { _error: 'Validation failed unexpectedly' }
    };
  }
}

/**
 * Validate API response with proper error handling
 */
export function validateApiResponse<T>(
  schema: z.ZodSchema<T>,
  response: unknown
): AsyncResult<T> {
  const result = validateData(schema, response);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      error: 'Invalid API response format',
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Validate restaurant data
 */
export function validateRestaurant(data: unknown) {
  return validateData(restaurantSchema, data);
}

/**
 * Validate user data
 */
export function validateUser(data: unknown) {
  return validateData(userSchema, data);
}

/**
 * Validate contact form data
 */
export function validateContactForm(data: unknown) {
  return validateData(contactFormSchema, data);
}

/**
 * Validate feedback form data
 */
export function validateFeedbackForm(data: unknown) {
  return validateData(feedbackFormSchema, data);
}

/**
 * Validate search form data
 */
export function validateSearchForm(data: unknown) {
  return validateData(searchFormSchema, data);
}

// ============================================================================
// Type-Safe API Client
// ============================================================================

/**
 * Type-safe API client with runtime validation
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(
    endpoint: string,
    schema: z.ZodSchema<T>
  ): Promise<AsyncResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
          code: data.code || 'HTTP_ERROR'
        };
      }

      return validateApiResponse(schema, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR'
      };
    }
  }

  async post<T, U>(
    endpoint: string,
    body: T,
    responseSchema: z.ZodSchema<U>,
    bodySchema?: z.ZodSchema<T>
  ): Promise<AsyncResult<U>> {
    try {
      // Validate request body if schema provided
      if (bodySchema) {
        const bodyValidation = validateData(bodySchema, body);
        if (!bodyValidation.success) {
          return {
            success: false,
            error: 'Invalid request data',
            code: 'VALIDATION_ERROR'
          };
        }
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
          code: data.code || 'HTTP_ERROR'
        };
      }

      return validateApiResponse(responseSchema, data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR'
      };
    }
  }
}

// ============================================================================
// Export Schemas and Types
// ============================================================================

export type Restaurant = z.infer<typeof restaurantSchema>;
export type CreateRestaurant = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurant = z.infer<typeof updateRestaurantSchema>;

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type ContactForm = z.infer<typeof contactFormSchema>;
export type FeedbackForm = z.infer<typeof feedbackFormSchema>;
export type SearchForm = z.infer<typeof searchFormSchema>;
