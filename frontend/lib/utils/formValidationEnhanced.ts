/**
 * Enhanced Form Validation with Type Safety
 * =========================================
 * 
 * Improved form validation utilities with comprehensive type safety
 * and better error handling for React forms.
 * 
 * Author: JewGo Development Team
 * Version: 2.0
 */

import { z } from 'zod';
import type {
  ValidationError,
  ValidationResult,
  FieldValidationResult,
  FormValidationState,
  ValidationSchema,
  FieldSchema,
  FormSchema,
  BaseFormData,
  ContactFormData,
  FeedbackFormData,
  RestaurantFormData,
  UserProfileFormData,
  LoginFormData,
  RegistrationFormData,
  Validator,
  FieldValidator,
  AsyncValidator,
  AsyncFieldValidator,
  ValidationFunctions,
  FormState,
  FormActions,
  UseFormReturn,
  ValidationSchemas,
  ValidationErrorHandler,
  ErrorDisplayConfig,
  AsyncValidationConfig,
  AsyncValidationResult,
  AsyncValidatorConfig,
  FormSubmissionConfig,
  SubmitFormFunction,
  FormSubmissionResult,
  FormDataKey,
  FormDataValue,
  ValidationUtils
} from '../types/form-validation';

// ============================================================================
// Enhanced Validation Functions
// ============================================================================

/**
 * Enhanced form validation with better error handling
 */
export function validateFormEnhanced<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        path: err.path.map(p => typeof p === 'string' || typeof p === 'number' ? p : String(p)),
      }));
      return {
        success: false,
        errors,
      };
    }
    
    return {
      success: false,
      errors: [
        {
          field: 'general',
          message: 'An unexpected validation error occurred',
          code: 'UNKNOWN_ERROR',
        },
      ],
    };
  }
}

/**
 * Enhanced field validation with detailed error information
 */
export function validateFieldEnhanced<T>(
  schema: z.ZodSchema<T>, 
  value: unknown, 
  fieldName: string
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(value);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((err) => ({
        field: fieldName,
        message: err.message,
        code: err.code,
        path: err.path.map(p => typeof p === 'string' || typeof p === 'number' ? p : String(p)),
      }));
      return {
        success: false,
        errors,
      };
    }
    
    return {
      success: false,
      errors: [
        {
          field: fieldName,
          message: 'An unexpected validation error occurred',
          code: 'UNKNOWN_ERROR',
        },
      ],
    };
  }
}

/**
 * Enhanced field validation result with more detailed information
 */
export function validateFieldResult<T>(
  schema: z.ZodSchema<T>, 
  value: unknown, 
  fieldName: string
): FieldValidationResult {
  const result = validateFieldEnhanced(schema, value, fieldName);
  
  if (result.success) {
    return {
      isValid: true,
      field: fieldName,
    };
  } else {
    return {
      isValid: false,
      error: result.errors[0]?.message || 'Validation failed',
      field: fieldName,
    };
  }
}

// ============================================================================
// Enhanced Validation Schemas
// ============================================================================

/**
 * Enhanced email validation with better error messages
 */
export const emailSchemaEnhanced = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long')
  .transform((val) => val.toLowerCase().trim());

/**
 * Enhanced password validation with security requirements
 */
export const passwordSchemaEnhanced = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
  .regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character');

/**
 * Enhanced phone validation with international support
 */
export const phoneSchemaEnhanced = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .max(20, 'Phone number is too long')
  .transform((val) => val.replace(/\s+/g, ''));

/**
 * Enhanced URL validation with protocol checking
 */
export const urlSchemaEnhanced = z
  .string()
  .url('Please enter a valid URL')
  .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

/**
 * Enhanced restaurant name validation
 */
export const restaurantNameSchemaEnhanced = z
  .string()
  .min(1, 'Restaurant name is required')
  .max(100, 'Restaurant name is too long')
  .regex(/^[a-zA-Z0-9\s\-'&.]+$/, 'Restaurant name contains invalid characters')
  .transform((val) => val.trim());

/**
 * Enhanced address validation
 */
export const addressSchemaEnhanced = z
  .string()
  .min(1, 'Address is required')
  .max(200, 'Address is too long')
  .transform((val) => val.trim());

/**
 * Enhanced city validation
 */
export const citySchemaEnhanced = z
  .string()
  .min(1, 'City is required')
  .max(50, 'City name is too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'City name contains invalid characters')
  .transform((val) => val.trim());

/**
 * Enhanced state validation
 */
export const stateSchemaEnhanced = z
  .string()
  .min(1, 'State is required')
  .max(50, 'State name is too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'State name contains invalid characters')
  .transform((val) => val.trim());

/**
 * Enhanced ZIP code validation
 */
export const zipCodeSchemaEnhanced = z
  .string()
  .min(1, 'ZIP code is required')
  .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code format (e.g., 12345 or 12345-6789)')
  .transform((val) => val.trim());

// ============================================================================
// Enhanced Form Schemas
// ============================================================================

/**
 * Enhanced contact form schema
 */
export const contactFormSchemaEnhanced = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchemaEnhanced,
  message: z.string().min(1, 'Message is required').max(1000, 'Message is too long'),
});

/**
 * Enhanced feedback form schema
 */
export const feedbackFormSchemaEnhanced = z.object({
  type: z.enum(['correction', 'suggestion', 'general']),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description is too long'),
  priority: z.enum(['low', 'medium', 'high']),
  restaurantId: z.number().optional(),
  restaurantName: z.string().optional(),
  contactEmail: emailSchemaEnhanced.optional(),
});

/**
 * Enhanced restaurant form schema
 */
export const restaurantFormSchemaEnhanced = z.object({
  name: restaurantNameSchemaEnhanced,
  address: addressSchemaEnhanced,
  city: citySchemaEnhanced,
  state: stateSchemaEnhanced,
  zip_code: zipCodeSchemaEnhanced,
  phone_number: phoneSchemaEnhanced,
  website: urlSchemaEnhanced.optional(),
  kosher_category: z.enum(['Meat', 'Dairy', 'Pareve', 'Unknown']),
  certifying_agency: z.string().min(1, 'Certifying agency is required'),
  listing_type: z.string().min(1, 'Listing type is required'),
  short_description: z.string().max(500, 'Description is too long').optional(),
  price_range: z.string().optional(),
  hours_of_operation: z.string().optional(),
});

/**
 * Enhanced user profile form schema
 */
export const userProfileFormSchemaEnhanced = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: emailSchemaEnhanced,
  phone: phoneSchemaEnhanced.optional(),
  preferences: z.record(z.any(), z.any()).optional(),
});

/**
 * Enhanced login form schema
 */
export const loginFormSchemaEnhanced = z.object({
  email: emailSchemaEnhanced,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * Enhanced registration form schema
 */
export const registrationFormSchemaEnhanced = z.object({
  email: emailSchemaEnhanced,
  password: passwordSchemaEnhanced,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// Enhanced Validation Utilities
// ============================================================================

/**
 * Enhanced validation utilities with better error handling
 */
export const validationUtilsEnhanced: ValidationUtils = {
  formatValidationErrors: (errors: ValidationError[]): Record<string, string> => {
    const formatted: Record<string, string> = {};
    errors.forEach((error) => {
      formatted[error.field] = error.message;
    });
    return formatted;
  },

  hasValidationErrors: (result: ValidationResult<unknown>): result is { success: false; errors: ValidationError[] } => {
    return !result.success;
  },

  getValidationErrors: (result: ValidationResult<unknown>): ValidationError[] => {
    return result.success ? [] : result.errors;
  },

  isFieldValid: (field: string, errors: ValidationError[]): boolean => {
    return !errors.some(error => error.field === field);
  },

  getFieldError: (field: string, errors: ValidationError[]): string | undefined => {
    const fieldError = errors.find(error => error.field === field);
    return fieldError?.message;
  },
};

/**
 * Enhanced async validation with timeout and retry logic
 */
export async function validateAsyncEnhanced<T>(
  validator: AsyncValidator<T>,
  data: T,
  timeout: number = 5000,
  retries: number = 2
): Promise<ValidationResult<T>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), timeout);
      });

      const result = await Promise.race([validator(data), timeoutPromise]);
      return result;
    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          errors: [
            {
              field: 'general',
              message: error instanceof Error ? error.message : 'Async validation failed',
              code: 'ASYNC_VALIDATION_ERROR',
            },
          ],
        };
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return {
    success: false,
    errors: [
      {
        field: 'general',
        message: 'Async validation failed after retries',
        code: 'ASYNC_VALIDATION_ERROR',
      },
    ],
  };
}

/**
 * Enhanced form submission with validation and error handling
 */
export async function submitFormEnhanced<T>(
  schema: z.ZodSchema<T>, 
  data: unknown, 
  submitFunction: SubmitFormFunction<T>,
  config?: FormSubmissionConfig
): Promise<FormSubmissionResult> {
  try {
    // Validate form data
    const validation = validateFormEnhanced(schema, data);
    
    if (!validation.success) {
      return {
        success: false,
        errors: validation.errors,
      };
    }
    
    // Submit form
    await submitFunction(validation.data);
    
    return { 
      success: true,
      data: validation.data,
    };
  } catch (error) {
    console.error('Form submission error:', error);
    
    return {
      success: false,
      errors: [
        {
          field: 'general',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          code: 'SUBMISSION_ERROR',
        },
      ],
    };
  }
}

// ============================================================================
// Enhanced Field Validation Functions
// ============================================================================

/**
 * Enhanced phone validation with international format support
 */
export function validatePhoneEnhanced(phone: string): string | null {
  if (!phone) {
    return 'Phone number is required';
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return 'Phone number must have at least 10 digits';
  }
  
  if (digitsOnly.length > 15) {
    return 'Phone number is too long';
  }
  
  // Check for valid phone number patterns
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number format';
  }
  
  return null;
}

/**
 * Enhanced email validation with domain checking
 */
export function validateEmailEnhanced(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  // Check for common disposable email domains
  const disposableDomains = [
    'tempmail.org',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    return 'Please use a valid email address';
  }
  
  return null;
}

/**
 * Enhanced URL validation with protocol checking
 */
export function validateUrlEnhanced(url: string): string | null {
  if (!url) {
    return null; // URLs are optional in most cases
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return 'URL must use HTTP or HTTPS protocol';
    }
  } catch {
    return 'Please enter a valid URL';
  }
  
  return null;
}

/**
 * Enhanced required field validation
 */
export function validateRequiredEnhanced(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }
  
  return null;
}

/**
 * Enhanced length validation
 */
export function validateLengthEnhanced(
  value: string, 
  min: number, 
  max: number, 
  fieldName: string
): string | null {
  if (!value) {
    return null;
  }
  
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  
  if (value.length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  
  return null;
}

/**
 * Enhanced pattern validation
 */
export function validatePatternEnhanced(
  value: string, 
  pattern: RegExp, 
  fieldName: string, 
  message?: string
): string | null {
  if (!value) return null;
  
  if (!pattern.test(value)) {
    return message || `${fieldName} format is invalid`;
  }
  
  return null;
}

// ============================================================================
// Export Enhanced Utilities
// ============================================================================

export default {
  // Enhanced validation functions
  validateFormEnhanced,
  validateFieldEnhanced,
  validateFieldResult,
  
  // Enhanced schemas
  emailSchemaEnhanced,
  passwordSchemaEnhanced,
  phoneSchemaEnhanced,
  urlSchemaEnhanced,
  restaurantNameSchemaEnhanced,
  addressSchemaEnhanced,
  citySchemaEnhanced,
  stateSchemaEnhanced,
  zipCodeSchemaEnhanced,
  contactFormSchemaEnhanced,
  feedbackFormSchemaEnhanced,
  restaurantFormSchemaEnhanced,
  userProfileFormSchemaEnhanced,
  loginFormSchemaEnhanced,
  registrationFormSchemaEnhanced,
  
  // Enhanced utilities
  validationUtilsEnhanced,
  validateAsyncEnhanced,
  submitFormEnhanced,
  
  // Enhanced field validation
  validatePhoneEnhanced,
  validateEmailEnhanced,
  validateUrlEnhanced,
  validateRequiredEnhanced,
  validateLengthEnhanced,
  validatePatternEnhanced,
};
