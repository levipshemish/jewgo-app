/**
 * Form Validation Types
 * =====================
 * 
 * Comprehensive type definitions for form validation utilities
 * Provides proper typing for validation schemas, error handling, and form data
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

import { z } from 'zod';

// ============================================================================
// Core Validation Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  path?: (string | number)[];
}

export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: ValidationError[];
};

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  field: string;
}

export interface FormValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
}

// ============================================================================
// Validation Schema Types
// ============================================================================

export interface ValidationSchema<T = any> {
  validate: (data: T) => ValidationResult<T>;
  validateField: (field: string, value: any) => FieldValidationResult;
  getSchema: () => z.ZodSchema<T>;
}

export interface FieldSchema {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  transform?: (value: any) => any;
}

export interface FormSchema {
  [field: string]: FieldSchema;
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface BaseFormData {
  [key: string]: string | number | boolean | File | File[] | null | undefined;
}

export interface ContactFormData extends BaseFormData {
  name: string;
  email: string;
  message: string;
}

export interface FeedbackFormData extends BaseFormData {
  type: 'correction' | 'suggestion' | 'general';
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  restaurantId?: number;
  restaurantName?: string;
  contactEmail?: string;
}

export interface RestaurantFormData extends BaseFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone_number: string;
  website?: string;
  kosher_category: 'Meat' | 'Dairy' | 'Pareve' | 'Unknown';
  certifying_agency: string;
  listing_type: string;
  short_description?: string;
  price_range?: string;
  hours_of_operation?: string;
}

export interface UserProfileFormData extends BaseFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferences?: Record<string, any>;
}

export interface LoginFormData extends BaseFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationFormData extends BaseFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

// ============================================================================
// Validation Function Types
// ============================================================================

export type Validator<T = any> = (data: T) => ValidationResult<T>;
export type FieldValidator = (value: any, field: string) => FieldValidationResult;
export type AsyncValidator<T = any> = (data: T) => Promise<ValidationResult<T>>;
export type AsyncFieldValidator = (value: any, field: string) => Promise<FieldValidationResult>;

export interface ValidationFunctions {
  validateForm: <T>(schema: z.ZodSchema<T>, data: unknown) => ValidationResult<T>;
  validateField: <T>(schema: z.ZodSchema<T>, value: unknown, fieldName: string) => ValidationResult<T>;
  validatePhone: (phone: string) => string | null;
  validateEmail: (email: string) => string | null;
  validateUrl: (url: string) => string | null;
  validateRequired: (value: any, fieldName: string) => string | null;
  validateLength: (value: string, min: number, max: number, fieldName: string) => string | null;
  validatePattern: (value: string, pattern: RegExp, fieldName: string, message?: string) => string | null;
}

// ============================================================================
// Form State Management Types
// ============================================================================

export interface FormState<T = BaseFormData> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

export interface FormActions<T = BaseFormData> {
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  setFieldDirty: (field: keyof T, dirty: boolean) => void;
  validateField: (field: keyof T) => void;
  validateForm: () => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;
}

export interface UseFormReturn<T = BaseFormData> {
  state: FormState<T>;
  actions: FormActions<T>;
  handlers: {
    handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleBlur: (field: keyof T) => () => void;
    handleSubmit: (event: React.FormEvent) => void;
  };
}

// ============================================================================
// Validation Schema Definitions
// ============================================================================

export interface ValidationSchemas {
  email: z.ZodString;
  password: z.ZodString;
  phone: z.ZodString;
  url: z.ZodString;
  restaurantName: z.ZodString;
  address: z.ZodString;
  city: z.ZodString;
  state: z.ZodString;
  zipCode: z.ZodString;
  contactForm: z.ZodObject<any>;
  feedbackForm: z.ZodObject<any>;
  restaurantForm: z.ZodObject<any>;
  userProfileForm: z.ZodObject<any>;
  loginForm: z.ZodObject<any>;
  registrationForm: z.ZodObject<any>;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface ValidationErrorHandler {
  handleValidationError: (error: ValidationError) => void;
  handleFieldError: (field: string, error: string) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
}

export interface ErrorDisplayConfig {
  showFieldErrors?: boolean;
  showFormErrors?: boolean;
  errorClassName?: string;
  errorContainerClassName?: string;
}

// ============================================================================
// Async Validation Types
// ============================================================================

export interface AsyncValidationConfig {
  debounceMs?: number;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validateOnSubmit?: boolean;
}

export interface AsyncValidationResult {
  isValid: boolean;
  error?: string;
  isPending: boolean;
}

export interface AsyncValidatorConfig {
  validator: AsyncFieldValidator;
  config: AsyncValidationConfig;
}

// ============================================================================
// Form Submission Types
// ============================================================================

export interface FormSubmissionConfig {
  validateOnSubmit?: boolean;
  showErrorsOnSubmit?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (errors: ValidationError[]) => void;
}

export interface SubmitFormFunction<T = any> {
  (data: T): Promise<void>;
}

export interface FormSubmissionResult {
  success: boolean;
  errors?: ValidationError[];
  data?: any;
}

// ============================================================================
// Utility Types
// ============================================================================

export type FormDataKey<T> = keyof T;
export type FormDataValue<T> = T[keyof T];

export interface ValidationUtils {
  formatValidationErrors: (errors: ValidationError[]) => Record<string, string>;
  hasValidationErrors: (result: ValidationResult<unknown>) => result is { success: false; errors: ValidationError[] };
  getValidationErrors: (result: ValidationResult<unknown>) => ValidationError[];
  isFieldValid: (field: string, errors: ValidationError[]) => boolean;
  getFieldError: (field: string, errors: ValidationError[]) => string | undefined;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValidationSuccess<T>(result: ValidationResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

export function isValidationFailure<T>(result: ValidationResult<T>): result is { success: false; errors: ValidationError[] } {
  return result.success === false;
}

export function isFormData(obj: any): obj is BaseFormData {
  return typeof obj === 'object' && obj !== null;
}

export function isValidationError(obj: any): obj is ValidationError {
  return typeof obj === 'object' && 
         obj !== null && 
         typeof obj.field === 'string' && 
         typeof obj.message === 'string';
}
