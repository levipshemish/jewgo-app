import { z } from 'zod';

// Common validation schemas
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits');

export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

export const requiredStringSchema = z
  .string()
  .min(1, 'This field is required');

export const optionalStringSchema = z
  .string()
  .optional()
  .or(z.literal(''));

// Restaurant-specific schemas
export const restaurantSchema = z.object({
  name: requiredStringSchema,
  address: requiredStringSchema,
  city: requiredStringSchema,
  state: requiredStringSchema,
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  phoneNumber: phoneSchema,
  website: urlSchema,
  kosherCategory: z.enum(['meat', 'dairy', 'pareve']).refine((val) => val, {
    message: 'Please select a valid kosher category'
  }),
  certifyingAgency: requiredStringSchema,
  listingType: requiredStringSchema,
  shortDescription: optionalStringSchema,
  priceRange: optionalStringSchema,
});

export const restaurantSpecialSchema = z.object({
  title: requiredStringSchema,
  description: optionalStringSchema,
  discountPercent: z
    .number()
    .min(0, 'Discount must be at least 0%')
    .max(100, 'Discount cannot exceed 100%')
    .optional(),
  discountAmount: z
    .number()
    .min(0, 'Discount amount must be positive')
    .optional(),
  startDate: z
    .string()
    .datetime('Please enter a valid start date')
    .optional(),
  endDate: z
    .string()
    .datetime('Please enter a valid end date')
    .optional(),
  specialType: z.enum(['discount', 'promotion', 'event']).refine((val) => val, {
    message: 'Please select a valid special type'
  }),
});

// Form validation types
export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: ValidationError[];
};

// Validation utility functions
export function validateForm<T>(
  schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
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
        },
      ],
    };
  }
}

export function validateField<T>(
  schema: z.ZodSchema<T>, value: unknown, fieldName: string): ValidationResult<T> {
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
        },
      ],
    };
  }
}

// Real-time validation helpers
export function validateEmail(_email: string): string | null {
  // const result = validateField(emailSchema, email, 'email');
  // if (!result.success) {
  //   return (result as any).errors[0]?.message || null;
  // }
  return null;
}

export function validatePassword(_password: string): string | null {
  // const result = validateField(passwordSchema, password, 'password');
  // if (!result.success) {
  //   return (result as any).errors[0]?.message || null;
  // }
  return null;
}

export function validatePhone(_phone: string): string | null {
  // const result = validateField(phoneSchema, phone, 'phone');
  // if (!result.success) {
  //   return (result as any).errors[0]?.message || null;
  // }
  return null;
}

export function validateUrl(_url: string): string | null {
  if (!_url) {return null;} // Allow empty URLs
  // const result = validateField(urlSchema, url, 'url');
  // if (!result.success) {
  //   return (result as any).errors[0]?.message || null;
  // }
  return null;
}

export function validateRequired(_value: string, _fieldName: string): string | null {
  // const result = validateField(requiredStringSchema, value, fieldName);
  // if (!result.success) {
  //   return (result as any).errors[0]?.message || null;
  // }
  return null;
}

// Form state management
export interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

export function createFormState<T extends Record<string, unknown>>(
  initialValues: T): FormState<T> {
  return {
    values: initialValues,
    errors: {},
    touched: {},
    isValid: false,
    isSubmitting: false,
  };
}

export function updateFormField<T extends Record<string, unknown>>(
  state: FormState<T>, field: keyof T, value: T[keyof T]): FormState<T> {
  return {
    ...state,
    values: {
      ...state.values,
      [field]: value,
    },
    touched: {
      ...state.touched,
      [field]: true,
    },
  };
}

export function setFormErrors<T extends Record<string, unknown>>(
  state: FormState<T>, _errors: ValidationError[]): FormState<T> {
  const errorMap: Record<string, string> = {};
  _errors.forEach((error) => {
    errorMap[error.field] = error.message;
  });

  return {
    ...state,
    errors: errorMap,
    isValid: _errors.length === 0,
  };
}

export function clearFormErrors<T extends Record<string, unknown>>(
  state: FormState<T>): FormState<T> {
  return {
    ...state,
    errors: {},
    isValid: true,
  };
}

export function setSubmitting<T extends Record<string, unknown>>(
  state: FormState<T>, isSubmitting: boolean): FormState<T> {
  return {
    ...state,
    isSubmitting,
  };
}

// Custom validation functions
export function validateZipCode(zipCode: string): string | null {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zipCode)) {
    return 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
  }
  return null;
}

export function validatePriceRange(priceRange: string): string | null {
  if (!priceRange) {return null;}
  
  const priceRegex = /^\$\d+(\s*-\s*\$\d+)?$/;
  if (!priceRegex.test(priceRange)) {
    return 'Please enter a valid price range (e.g., $10 or $10-$25)';
  }
  
  const prices = priceRange.match(/\d+/g);
  if (prices && prices.length === 2 && prices[0] && prices[1]) {
    const min = parseInt(prices[0]);
    const max = parseInt(prices[1]);
    if (min >= max) {
      return 'Minimum price must be less than maximum price';
    }
  }
  
  return null;
}

export function validateHours(hours: string): string | null {
  if (!hours) {return null;}
  
  // Basic hours validation - can be enhanced based on specific requirements
  
  const parts = hours.split(/\s*-\s*/);
  if (parts.length !== 2) {
    return 'Please enter hours in format: Day HH:MM AM/PM - Day HH:MM AM/PM';
  }
  
  return null;
}

// Async validation helpers
export async function validateUniqueEmail(_email: string): Promise<string | null> {
  try {
    // const response = await fetch('/api/validate-email', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ email }),
    // });
    
    // const result = await response.json();
    // if (!result.available) {
    //   return 'This email address is already registered';
    // }
    
    return null;
  } catch {
    // // console.error('Email validation error:', error);
    return 'Unable to validate email address';
  }
}

export async function validateRestaurantName(_name: string): Promise<string | null> {
  try {
    // const response = await fetch('/api/validate-restaurant-name', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ name }),
    // });
    
    // const result = await response.json();
    // if (!result.available) {
    //   return 'A restaurant with this name already exists';
    // }
    
    return null;
  } catch {
    // // console.error('Restaurant name validation error:', error);
    return 'Unable to validate restaurant name';
  }
}

// Form submission helpers
export async function submitForm<T>(
  schema: z.ZodSchema<T>, data: unknown, submitFunction: (data: T) => Promise<void>
): Promise<{ success: boolean; errors?: ValidationError[] }> {
  const validation = validateForm(schema, data);
  
  if (!validation.success) {
    return {
      success: false,
      errors: (validation as any).errors,
    };
  }
  
  try {
    await submitFunction(validation.data);
    return { success: true };
  } catch (error) {
    // // console.error('Form submission error:', error);
    return {
      success: false,
      errors: [
        {
          field: 'general',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      ],
    };
  }
}

// Export types for use in components
export type RestaurantFormData = z.infer<typeof restaurantSchema>;
export type RestaurantSpecialFormData = z.infer<typeof restaurantSpecialSchema>; 