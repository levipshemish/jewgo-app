import { z } from 'zod';

// Base validation schemas
const emailSchema = z.string().email('Please enter a valid email address').optional().or(z.literal(''));
const phoneSchema = z.string().min(1, 'Phone number is required').regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number');
const urlSchema = z.string().url('Please enter a valid URL').optional().or(z.literal(''));

// Enhanced restaurant form schema with conditional validation
export const restaurantFormSchema = z.object({
  // Step 1: Business Ownership & Basic Info
  is_owner_submission: z.boolean(),
  name: z.string().min(1, 'Business name is required').max(255, 'Business name must be 255 characters or less'),
  address: z.string().min(1, 'Address is required').max(500, 'Address must be 500 characters or less'),
  city: z.string().min(1, 'City is required').max(100, 'City must be 100 characters or less'),
  state: z.string().min(1, 'State is required').max(50, 'State must be 50 characters or less'),
  zip_code: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code must be 20 characters or less'),
  phone: phoneSchema,
  business_email: emailSchema,
  website: urlSchema,
  listing_type: z.string().min(1, 'Listing type is required').max(100, 'Listing type must be 100 characters or less'),
  
  // Step 2: Kosher Certification
  kosher_category: z.enum(['meat', 'dairy', 'pareve']).refine((val) => val !== undefined, {
    message: 'Please select a kosher category'
  }),
  certifying_agency: z.string().min(1, 'Certifying agency is required').max(100, 'Certifying agency must be 100 characters or less'),
  is_cholov_yisroel: z.boolean().optional().default(false),
  is_pas_yisroel: z.boolean().optional().default(false),
  
  // Step 3: Business Details
  short_description: z.string().min(1, 'Short description is required').max(80, 'Short description must be 80 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().or(z.literal('')),
  google_listing_url: urlSchema,
  instagram_link: urlSchema,
  facebook_link: urlSchema,
  tiktok_link: urlSchema,
  
  // Step 4: Images
  business_images: z.array(z.string().url('Please enter a valid image URL')).min(2, 'At least 2 images are required').max(5, 'Maximum 5 images allowed'),
  
  // Owner information (conditional)
  owner_name: z.string().max(255, 'Owner name must be 255 characters or less').optional().or(z.literal('')),
  owner_email: emailSchema,
  owner_phone: z.string().max(50, 'Owner phone must be 50 characters or less').optional().or(z.literal('')),
  
  // Additional business details (optional)
  business_license: z.string().max(100, 'Business license must be 100 characters or less').optional().or(z.literal('')),
  tax_id: z.string().max(100, 'Tax ID must be 100 characters or less').optional().or(z.literal('')),
  years_in_business: z.number().int().min(0, 'Years in business must be 0 or greater').max(100, 'Years in business must be 100 or less').optional(),
  seating_capacity: z.number().int().min(1, 'Seating capacity must be 1 or greater').max(10000, 'Seating capacity must be 10000 or less').optional(),
  delivery_available: z.boolean().default(false),
  takeout_available: z.boolean().default(false),
  catering_available: z.boolean().default(false),
  
  // Contact preferences
  preferred_contact_method: z.enum(['email', 'phone', 'text', 'any']).optional().default('any'),
  preferred_contact_time: z.enum(['morning', 'afternoon', 'evening']).optional().default('afternoon'),
  contact_notes: z.string().max(1000, 'Contact notes must be 1000 characters or less').optional().or(z.literal('')),
}).refine((data) => {
  // Conditional validation for kosher categories
  if (data.kosher_category === 'dairy' && data.is_cholov_yisroel === undefined) {
    return false;
  }
  if (['meat', 'pareve'].includes(data.kosher_category) && data.is_pas_yisroel === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Please specify kosher certification details',
  path: ['kosher_category']
}).refine((data) => {
  // Conditional validation for owner submissions
  if (data.is_owner_submission) {
    if (!data.owner_name || !data.owner_email || !data.owner_phone) {
      return false;
    }
  }
  return true;
}, {
  message: 'Owner submissions require owner contact information',
  path: ['is_owner_submission']
});

// Step-specific validation schemas
export const step1Schema = z.object({
  is_owner_submission: z.boolean(),
  name: z.string().min(1, 'Business name is required').max(255, 'Business name must be 255 characters or less'),
  address: z.string().min(1, 'Address is required').max(500, 'Address must be 500 characters or less'),
  city: z.string().min(1, 'City is required').max(100, 'City must be 100 characters or less'),
  state: z.string().min(1, 'State is required').max(50, 'State must be 50 characters or less'),
  zip_code: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code must be 20 characters or less'),
  phone: phoneSchema,
  business_email: emailSchema,
  website: urlSchema,
  listing_type: z.string().min(1, 'Listing type is required').max(100, 'Listing type must be 100 characters or less'),
  owner_name: z.string().max(255, 'Owner name must be 255 characters or less').optional().or(z.literal('')),
  owner_email: emailSchema,
  owner_phone: z.string().max(50, 'Owner phone must be 50 characters or less').optional().or(z.literal('')),
});

export const step2Schema = z.object({
  kosher_category: z.enum(['meat', 'dairy', 'pareve']).refine((val) => val !== undefined, {
    message: 'Please select a kosher category'
  }),
  certifying_agency: z.string().min(1, 'Certifying agency is required').max(100, 'Certifying agency must be 100 characters or less'),
  is_cholov_yisroel: z.boolean().optional(),
  is_pas_yisroel: z.boolean().optional(),
}).refine((data) => {
  // Conditional validation for kosher categories
  if (data.kosher_category === 'dairy' && data.is_cholov_yisroel === undefined) {
    return false;
  }
  if (['meat', 'pareve'].includes(data.kosher_category) && data.is_pas_yisroel === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Please specify kosher certification details',
  path: ['kosher_category']
});

export const step3Schema = z.object({
  short_description: z.string().min(1, 'Short description is required').max(80, 'Short description must be 80 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().or(z.literal('')),
  google_listing_url: urlSchema,
  instagram_link: urlSchema,
  facebook_link: urlSchema,
  tiktok_link: urlSchema,
});

export const step4Schema = z.object({
  business_images: z.array(z.string().url('Please enter a valid image URL')).min(2, 'At least 2 images are required').max(5, 'Maximum 5 images allowed'),
});

// Type definitions
export type RestaurantFormData = z.infer<typeof restaurantFormSchema>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;

// Validation helper functions
export const validateStep = (step: number, data: Partial<RestaurantFormData>): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  try {
    switch (step) {
      case 1:
        step1Schema.parse(data);
        break;
      case 2:
        step2Schema.parse(data);
        break;
      case 3:
        step3Schema.parse(data);
        break;
      case 4:
        step4Schema.parse(data);
        break;
      case 5:
        // Step 5 is preview, no validation needed
        break;
      default:
        throw new Error(`Invalid step: ${step}`);
    }
    return { isValid: true, errors };
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
    }
    return { isValid: false, errors };
  }
};

export const validateField = (field: string, value: any, step: number, formData: Partial<RestaurantFormData>): string | null => {
  try {
    const testData = { ...formData, [field]: value };
    validateStep(step, testData);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = error.issues.find(err => err.path.join('.') === field);
      return fieldError ? fieldError.message : null;
    }
    return null;
  }
};

// Helper functions for conditional validation
export const isDairyCategory = (category: string): boolean => category === 'dairy';
export const isMeatOrPareveCategory = (category: string): boolean => ['meat', 'pareve'].includes(category);
export const isOwnerSubmission = (isOwner: boolean): boolean => isOwner;

// Default form data
export const defaultFormData: RestaurantFormData = {
  // Step 1
  is_owner_submission: false,
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  business_email: '',
  website: '',
  listing_type: '',
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  
  // Step 2
  kosher_category: 'dairy',
  certifying_agency: '',
  is_cholov_yisroel: false,
  is_pas_yisroel: false,
  
  // Step 3
  short_description: '',
  description: '',
  google_listing_url: '',
  instagram_link: '',
  facebook_link: '',
  tiktok_link: '',
  
  // Step 4
  business_images: [],
  
  // Additional fields
  business_license: '',
  tax_id: '',
  years_in_business: 0,
  seating_capacity: 0,
  delivery_available: false,
  takeout_available: false,
  catering_available: false,
  preferred_contact_method: 'any',
  preferred_contact_time: 'afternoon',
  contact_notes: '',
};
