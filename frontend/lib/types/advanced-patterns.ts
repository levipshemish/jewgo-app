// Advanced TypeScript patterns for better type safety
// This provides sophisticated type patterns to replace complex 'as any' usage

// ============================================================================
// Discriminated Unions for State Management
// ============================================================================

/**
 * Loading state discriminated union
 * Provides type-safe state management for async operations
 */
export type LoadingState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; code?: string };

/**
 * Async result discriminated union
 * Provides type-safe results for async operations
 */
export type AsyncResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * API response discriminated union
 * Provides type-safe API response handling
 */
export type ApiResponse<T> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string; details?: Record<string, unknown> };

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Branded types for domain-specific strings
 * Prevents accidental mixing of different string types
 */
export type Email = string & { readonly __brand: 'Email' };
export type PhoneNumber = string & { readonly __brand: 'PhoneNumber' };
export type UserId = string & { readonly __brand: 'UserId' };
export type RestaurantId = number & { readonly __brand: 'RestaurantId' };
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

/**
 * Create branded email type
 */
export function createEmail(email: string): Email | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? (email as Email) : null;
}

/**
 * Create branded phone number type
 */
export function createPhoneNumber(phone: string): PhoneNumber | null {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned) ? (cleaned as PhoneNumber) : null;
}

/**
 * Create branded user ID type
 */
export function createUserId(id: string): UserId | null {
  return id && id.trim().length > 0 ? (id.trim() as UserId) : null;
}

/**
 * Create branded restaurant ID type
 */
export function createRestaurantId(id: number): RestaurantId | null {
  return id > 0 ? (id as RestaurantId) : null;
}

/**
 * Create branded correlation ID type
 */
export function createCorrelationId(id: string): CorrelationId | null {
  return id && id.trim().length > 0 ? (id.trim() as CorrelationId) : null;
}

// ============================================================================
// Template Literal Types
// ============================================================================

/**
 * Event categories for analytics
 */
export type EventCategory = 'user' | 'system' | 'error' | 'performance' | 'business';

/**
 * Event actions for analytics
 */
export type EventAction = 'click' | 'submit' | 'load' | 'error' | 'view' | 'search' | 'filter';

/**
 * Event names using template literal types
 */
export type EventName = `${EventCategory}_${EventAction}`;

/**
 * Analytics event with proper typing
 */
export interface AnalyticsEvent {
  name: EventName;
  timestamp: string;
  properties?: Record<string, string | number | boolean>;
  userId?: UserId;
  sessionId?: string;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error types using template literal types
 */
export type ErrorType = `${ErrorSeverity}_${string}`;

// ============================================================================
// Conditional Types
// ============================================================================

/**
 * Extract the data type from a loading state
 */
export type ExtractData<T> = T extends LoadingState<infer U> ? U : never;

/**
 * Extract the data type from an async result
 */
export type ExtractAsyncData<T> = T extends AsyncResult<infer U> ? U : never;

/**
 * Extract the data type from an API response
 */
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Make all properties optional except specified ones
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties required except specified ones
 */
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep required type - makes all nested properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Deep readonly type - makes all nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extract keys that have a specific value type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Extract properties that have a specific value type
 */
export type PropertiesOfType<T, U> = Pick<T, KeysOfType<T, U>>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for loading state
 */
export function isLoadingState<T>(value: unknown): value is LoadingState<T> {
  return typeof value === 'object' && 
         value !== null && 
         'status' in value && 
         typeof (value as any).status === 'string';
}

/**
 * Type guard for async result
 */
export function isAsyncResult<T>(value: unknown): value is AsyncResult<T> {
  return typeof value === 'object' && 
         value !== null && 
         'success' in value && 
         typeof (value as any).success === 'boolean';
}

/**
 * Type guard for API response
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return typeof value === 'object' && 
         value !== null && 
         'success' in value && 
         typeof (value as any).success === 'boolean';
}

/**
 * Type guard for branded email
 */
export function isEmail(value: unknown): value is Email {
  return typeof value === 'string' && createEmail(value) !== null;
}

/**
 * Type guard for branded phone number
 */
export function isPhoneNumber(value: unknown): value is PhoneNumber {
  return typeof value === 'string' && createPhoneNumber(value) !== null;
}

// ============================================================================
// Type-Safe Event Handling
// ============================================================================

/**
 * Event handler with proper typing
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Event emitter with type safety
 */
export interface TypedEventEmitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  emit<K extends keyof Events>(event: K, data: Events[K]): void;
}

/**
 * Event map for analytics
 */
export interface AnalyticsEventMap {
  user_click: { element: string; text?: string; href?: string };
  user_submit: { form: string; fields: string[] };
  user_search: { query: string; results: number };
  user_filter: { filterType: string; filterValue: string };
  system_load: { component: string; duration: number };
  error_javascript: { message: string; stack?: string; filename?: string };
  performance_navigation: { metric: string; value: number };
  business_restaurant_view: { restaurantId: RestaurantId; restaurantName: string };
}

// ============================================================================
// Type-Safe Configuration
// ============================================================================

/**
 * Environment configuration with proper typing
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  GOOGLE_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

/**
 * Feature flags with proper typing
 */
export interface FeatureFlags {
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableAdvancedSearch: boolean;
  enableUserReviews: boolean;
}

/**
 * Type-safe configuration access
 */
export function getConfig<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as EnvironmentConfig[K];
}

/**
 * Type-safe feature flag access
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
  // In a real implementation, this would check against a feature flag service
  const flags: FeatureFlags = {
    enableAnalytics: true,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    enableAdvancedSearch: true,
    enableUserReviews: false,
  };
  return flags[flag];
}
