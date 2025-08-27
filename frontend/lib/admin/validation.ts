import { z } from 'zod';

// Centralized field length limits to avoid drift with DB schema
export const FIELD_LIMITS = {
  restaurant: {
    kosher_category: 20, // prisma: @db.VarChar(20)
    certifying_agency: 100, // prisma: @db.VarChar(100)
    price_range: 20, // prisma: @db.VarChar(20)
  },
} as const;

const asDate = z.preprocess((v) => {
  if (v == null || v instanceof Date) {return v;}
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}, z.date());

// Base validation schemas for common fields
export const baseSchemas = {
  id: z.union([z.string(), z.number()]).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().optional(),
};

// Restaurant validation schemas
export const restaurantCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  state: z.string().min(1, 'State is required').max(50, 'State too long'),
  zip_code: z.string().min(1, 'Zip code is required').max(20, 'Zip code too long'),
  website: z.string().url().optional().or(z.literal('')),
  price_range: z.string().max(FIELD_LIMITS.restaurant.price_range).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  is_cholov_yisroel: z.boolean().optional(),
  is_pas_yisroel: z.boolean().optional(),
  is_bishul_yisroel: z.boolean().optional(),
  short_description: z.string().max(1000).optional(),
  google_listing_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['pending_approval', 'approved', 'rejected', 'active', 'inactive']).optional(),
  description: z.string().max(5000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().int().min(0).optional(),
  google_rating: z.number().min(0).max(5).optional(),
  google_review_count: z.number().int().min(0).optional(),
  google_reviews: z.string().optional(),
  certifying_agency: z.string().min(1, 'Certifying agency is required').max(FIELD_LIMITS.restaurant.certifying_agency),
  timezone: z.string().max(100).optional(),
  phone_number: z.string().min(1, 'Phone number is required').max(50),
  listing_type: z.string().min(1, 'Listing type is required').max(100),
  hours_of_operation: z.string().max(1000).optional(),
  specials: z.string().max(1000).optional(),
  hours_json: z.string().optional(),
  hours_last_updated: asDate.optional(),
  kosher_category: z.string().min(1, 'Kosher category is required').max(FIELD_LIMITS.restaurant.kosher_category),
  cholov_stam: z.boolean().optional(),
  user_email: z.string().email().optional().or(z.literal('')),
  current_time_local: asDate.optional(),
  hours_parsed: z.boolean().optional(),
});

export const restaurantUpdateSchema = restaurantCreateSchema.extend({
  id: z.number(),
});

// Legacy schema for backward compatibility
export const restaurantSchema = restaurantCreateSchema;

// Review validation schemas
export const reviewCreateSchema = z.object({
  restaurant_id: z.number().int().positive('Restaurant ID must be positive'),
  user_id: z.string().min(1, 'User ID is required').max(50),
  user_name: z.string().min(1, 'User name is required').max(255),
  user_email: z.string().email().optional().or(z.literal('')),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().max(255).optional(),
  content: z.string().min(1, 'Review content is required').max(5000, 'Review content too long'),
  images: z.string().optional(), // JSON array of image URLs
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']).default('pending'),
  moderator_notes: z.string().max(1000).optional(),
  verified_purchase: z.boolean().default(false),
  helpful_count: z.number().int().min(0).default(0),
  report_count: z.number().int().min(0).default(0),
});

export const reviewUpdateSchema = reviewCreateSchema.extend({
  id: z.string().min(1, 'Review ID is required').max(50),
});

// Legacy schema for backward compatibility
export const reviewSchema = reviewCreateSchema;

// Review flag validation schema
export const reviewFlagSchema = z.object({
  id: z.string().min(1, 'Flag ID is required').max(50),
  review_id: z.string().min(1, 'Review ID is required').max(50),
  reason: z.string().min(1, 'Reason is required').max(50),
  description: z.string().max(1000).optional(),
  reported_by: z.string().min(1, 'Reporter ID is required').max(50),
  status: z.enum(['pending', 'resolved', 'dismissed']).default('pending'),
  resolved_by: z.string().max(50).optional(),
  resolution_notes: z.string().max(1000).optional(),
});

// Restaurant image validation schema
export const restaurantImageSchema = z.object({
  restaurant_id: z.number().int().positive('Restaurant ID must be positive').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  image_order: z.number().int().min(0).optional(),
  cloudinary_public_id: z.string().max(255).optional(),
});

// Restaurant owner validation schema
export const restaurantOwnerSchema = z.object({
  restaurant_id: z.number().int().positive('Restaurant ID must be positive'),
  owner_name: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  role: z.string().max(100).optional(),
  verified: z.boolean().default(false),
});

// Kosher place validation schema
export const kosherPlaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(500),
  detail_url: z.string().url().optional().or(z.literal('')),
  category: z.string().max(500).optional(),
  photo: z.string().url().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  phone: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  kosher_cert_link: z.string().url().optional().or(z.literal('')),
  kosher_type: z.string().max(500).optional(),
  extra_kosher_info: z.string().max(1000).optional(),
  short_description: z.string().max(1000).optional(),
  email: z.string().email().optional().or(z.literal('')),
  google_listing_url: z.string().url().optional().or(z.literal('')),
  status: z.string().max(500).optional(),
  is_cholov_yisroel: z.boolean().optional(),
  is_pas_yisroel: z.boolean().optional(),
  hours_open: z.string().max(500).optional(),
  price_range: z.string().max(500).optional(),
});

// Florida synagogue validation schema
export const floridaSynagogueSchema = z.object({
  name: z.string().max(255).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(255).optional(),
  zip_code: z.string().max(255).optional(),
  rabbi: z.string().max(255).optional(),
  affiliation: z.string().max(255).optional(),
  phone: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  social_media: z.string().max(1000).optional(),
  shacharit: z.string().max(1000).optional(),
  mincha: z.string().max(1000).optional(),
  maariv: z.string().max(1000).optional(),
  shabbat: z.string().max(1000).optional(),
  sunday: z.string().max(1000).optional(),
  weekday: z.string().max(1000).optional(),
  kosher_info: z.string().max(1000).optional(),
  parking: z.string().max(1000).optional(),
  accessibility: z.string().max(1000).optional(),
  additional_info: z.string().max(1000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  data_quality_score: z.number().int().min(0).max(100).optional(),
  is_chabad: z.boolean().optional(),
  is_young_israel: z.boolean().optional(),
  is_sephardic: z.boolean().optional(),
  has_address: z.boolean().optional(),
  has_zip: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// User validation schema (privacy-aware) - API format
export const userSchema = z.object({
  id: z.string().min(1, 'User ID is required').optional(),
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  provider: z.enum(['apple', 'google', 'unknown']).optional(),
  isSuperAdmin: z.boolean().optional(),
  adminRole: z.enum(['moderator', 'data_admin', 'system_admin', 'super_admin']).optional(),
});

// User update schema allows partial updates (all fields optional)
export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().max(255).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  isSuperAdmin: z.boolean().optional(),
  adminRole: z.enum(['moderator', 'data_admin', 'system_admin', 'super_admin']).optional(),
});

// User validation schema for database operations - matches Prisma schema
export const userDbSchema = z.object({
  id: z.string().min(1, 'User ID is required').optional(),
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  image: z.string().url().optional().or(z.literal('')),
  issuperadmin: z.boolean().optional(),
  createdat: asDate.optional(),
  updatedat: asDate.optional(),
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.number().int().min(1, 'Page size must be at least 1').max(100, 'Page size too large').default(20),
  cursor: z.string().optional(),
});

// Search and filter validation schema
export const searchFilterSchema = z.object({
  search: z.string().max(255).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Bulk operation validation schema
export const bulkOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  entityType: z.string().min(1, 'Entity type is required'),
  data: z.array(z.record(z.string(), z.any())).min(1, 'At least one item required').max(1000, 'Too many items'),
  batchSize: z.number().int().min(1).max(100).default(100),
});

// Export validation schema
export const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  search: z.string().max(255).optional(),
});

// Validation functions
export const validationUtils = {
  /**
   * Validate restaurant data
   */
  validateRestaurant: (data: any, isUpdate: boolean = false) => {
    const schema = isUpdate ? restaurantUpdateSchema : restaurantCreateSchema;
    return schema.parse(data);
  },

  /**
   * Validate review data
   */
  validateReview: (data: any, isUpdate: boolean = false) => {
    const schema = isUpdate ? reviewUpdateSchema : reviewCreateSchema;
    return schema.parse(data);
  },

  /**
   * Validate review flag data
   */
  validateReviewFlag: (data: any) => {
    return reviewFlagSchema.parse(data);
  },

  /**
   * Validate restaurant image data
   */
  validateRestaurantImage: (data: any) => {
    return restaurantImageSchema.parse(data);
  },

  /**
   * Validate restaurant owner data
   */
  validateRestaurantOwner: (data: any) => {
    return restaurantOwnerSchema.parse(data);
  },

  /**
   * Validate kosher place data
   */
  validateKosherPlace: (data: any) => {
    return kosherPlaceSchema.parse(data);
  },

  /**
   * Validate Florida synagogue data
   */
  validateFloridaSynagogue: (data: any) => {
    return floridaSynagogueSchema.parse(data);
  },

  /**
   * Validate user data
   */
  validateUser: (data: any) => {
    return userSchema.parse(data);
  },

  /**
   * Validate user update data (partial)
   */
  validateUserUpdate: (data: any) => {
    return userUpdateSchema.parse(data);
  },

  /**
   * Validate pagination parameters
   */
  validatePagination: (data: any) => {
    return paginationSchema.parse(data);
  },

  /**
   * Validate search and filter parameters
   */
  validateSearchFilter: (data: any) => {
    return searchFilterSchema.parse(data);
  },

  /**
   * Validate bulk operation parameters
   */
  validateBulkOperation: (data: any) => {
    return bulkOperationSchema.parse(data);
  },

  /**
   * Validate export parameters
   */
  validateExport: (data: any) => {
    return exportSchema.parse(data);
  },

  /**
   * Sanitize and normalize data
   */
  sanitizeData: (data: any): any => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remove undefined values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    // Normalize string fields
    const stringFields = ['name', 'address', 'city', 'state', 'description', 'content'];
    stringFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = sanitized[field].trim();
      }
    });

    // Normalize email fields
    const emailFields = ['email', 'user_email'];
    emailFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = sanitized[field].toLowerCase().trim();
      }
    });

    // Normalize phone fields
    const phoneFields = ['phone', 'phone_number'];
    phoneFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        // Remove non-numeric characters except +, -, (, ), and space
        sanitized[field] = sanitized[field].replace(/[^\d\s\+\-\(\)]/g, '');
      }
    });

    return sanitized;
  },

  /**
   * Validate coordinates
   */
  validateCoordinates: (latitude?: number, longitude?: number): boolean => {
    if (latitude === undefined || longitude === undefined) {
      return true; // Optional fields
    }

    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  },

  /**
   * Validate business hours JSON
   */
  validateBusinessHours: (hours: any): boolean => {
    if (!hours || typeof hours !== 'object') {
      return false;
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of validDays) {
      if (hours[day]) {
        const dayHours = hours[day];
        if (typeof dayHours !== 'object' || !dayHours.open || !dayHours.close) {
          return false;
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(dayHours.open) || !timeRegex.test(dayHours.close)) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Format validation errors for user display
   */
  formatValidationErrors: (errors: z.ZodError<any>): string[] => {
    return errors.issues.map(error => {
      const field = error.path.join('.');
      return `${field}: ${error.message}`;
    });
  },
};

// Type exports for use in components
export type RestaurantInput = z.infer<typeof restaurantSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewFlagInput = z.infer<typeof reviewFlagSchema>;
export type RestaurantImageInput = z.infer<typeof restaurantImageSchema>;
export type RestaurantOwnerInput = z.infer<typeof restaurantOwnerSchema>;
export type KosherPlaceInput = z.infer<typeof kosherPlaceSchema>;
export type FloridaSynagogueInput = z.infer<typeof floridaSynagogueSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchFilterInput = z.infer<typeof searchFilterSchema>;
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
