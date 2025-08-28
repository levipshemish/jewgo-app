// External libraries type definitions and utility functions
// This provides proper typing and safe access to external libraries

// Define the types locally since they're not exported from global
interface ReCaptchaAPI {
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  ready: (callback: () => void) => void;
}

interface AnalyticsAPI {
  track: (event: string, properties?: any) => void;
  trackEvent: (event: string, properties?: any) => void;
  trackError: (error: any, properties?: any) => void;
  trackPerformance: (metric: string, value: number, properties?: any) => void;
}

interface GTagAPI {
  (command: string, targetId: string, config?: any): void;
}

interface GoogleMapsAPI {
  maps: {
    Map: any;
    Marker: any;
    DirectionsService: any;
    DirectionsRenderer: any;
    Geocoder: any;
    places: any;
  };
}

// ============================================================================
// ReCAPTCHA Utilities
// ============================================================================

/**
 * Check if reCAPTCHA is available in the current environment
 */
export function isReCaptchaAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'grecaptcha' in window && 
         typeof (window as any).grecaptcha === 'object';
}

/**
 * Safely get reCAPTCHA instance with proper typing
 */
export function safeGetReCaptcha(): ReCaptchaAPI | null {
  if (!isReCaptchaAvailable()) {
    return null;
  }
  return (window as any).grecaptcha || null;
}

/**
 * Execute reCAPTCHA with proper error handling
 */
export async function executeReCaptcha(siteKey: string, action: string): Promise<string | null> {
  try {
    const recaptcha = safeGetReCaptcha();
    if (!recaptcha) {
      console.warn('ReCAPTCHA not available');
      return null;
    }

    return await recaptcha.execute(siteKey, { action });
  } catch (error) {
    console.error('ReCAPTCHA execution failed:', error);
    return null;
  }
}

// ============================================================================
// Analytics Utilities
// ============================================================================

/**
 * Check if analytics is available in the current environment
 */
export function isAnalyticsAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'analytics' in window && 
         typeof (window as any).analytics === 'object';
}

/**
 * Safely get analytics instance with proper typing
 */
export function safeGetAnalytics(): AnalyticsAPI | null {
  if (!isAnalyticsAvailable()) {
    return null;
  }
  return (window as any).analytics || null;
}

/**
 * Check if Google Analytics (gtag) is available
 */
export function isGtagAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'gtag' in window && 
         typeof (window as any).gtag === 'function';
}

/**
 * Safely get gtag function with proper typing
 */
export function safeGetGtag(): GTagAPI | null {
  if (!isGtagAvailable()) {
    return null;
  }
  return (window as any).gtag || null;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Check if an error is a Zod validation error
 */
export function isZodError(error: unknown): error is { name: 'ZodError'; issues: Array<{ message: string; path: string[] }> } {
  return typeof error === 'object' && 
         error !== null && 
         'name' in error && 
         (error as any).name === 'ZodError' &&
         'issues' in error &&
         Array.isArray((error as any).issues);
}

/**
 * Format Zod validation errors into a user-friendly format
 */
export function formatZodErrors(error: unknown): Record<string, string> {
  if (!isZodError(error)) {
    return {};
  }

  const formatted: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const field = issue.path.join('.');
    formatted[field] = issue.message;
  });
  return formatted;
}

// ============================================================================
// Google Maps Types
// ============================================================================

export interface GoogleMapsWindow extends Window {
  google: any;
  gtag?: (...args: unknown[]) => void;
  grecaptcha?: {
    ready: (callback: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  };
  MarkerClusterer?: any;
  SuperClusterAlgorithm?: any;
}

// Modern Google Maps Places API types
export interface ModernGooglePlacesAPI {
  importLibrary: (library: string) => Promise<any>;
  places: {
    AutocompleteSuggestion: {
      new (): any;
      fetchAutocompleteSuggestions: (request: AutocompleteSuggestionRequest) => Promise<AutocompleteSuggestionResponse>;
    };
    AutocompleteSessionToken: {
      new (): any;
    };
    Place: {
      new (options: { id: string }): any;
    };
  };
}

// Type for accessing places property
export type ModernGooglePlacesAPIPlaces = ModernGooglePlacesAPI['places'];

export interface AutocompleteSuggestionRequest {
  input: string;
  includedRegionCodes?: string[];
  sessionToken: any;
  locationBias?: {
    center: { lat: number; lng: number };
    radius: number;
  };
}

export interface AutocompleteSuggestionResponse {
  suggestions: Array<{
    placePrediction?: {
      placeId: string;
      text?: string;
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
  }>;
}

// Google Maps Place instance types
export interface GooglePlaceInstance {
  displayName?: { text: string };
  formattedAddress?: string;
  formattedPhoneNumber?: string;
  regularOpeningHours?: any;
  priceLevel?: number;
  userRatingCount?: number;
  location?: { lat: number; lng: number };
  addressComponents?: Array<{
    long_name?: string;
    longText?: string;
    name?: string;
    short_name?: string;
    shortText?: string;
    abbreviation?: string;
    types?: string[];
  }>;
  fetchFields: (options: { fields: string[] }) => Promise<void>;
}

// ============================================================================
// Google Maps Utilities
// ============================================================================

/**
 * Check if Google Maps is available
 */
export function isGoogleMapsAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'google' in window && 
         (window as any).google &&
         'maps' in (window as any).google;
}

/**
 * Safely get Google Maps instance
 */
export function safeGetGoogleMaps(): GoogleMapsAPI['maps'] | null {
  if (!isGoogleMapsAvailable()) {
    return null;
  }
  return (window as any).google?.maps || null;
}

/**
 * Check if Google Maps Places API is available
 */
export function isGoogleMapsPlacesAvailable(): boolean {
  const maps = safeGetGoogleMaps();
  return !!maps && 'places' in maps;
}

// ============================================================================
// Type Guards for Runtime Safety
// ============================================================================

/**
 * Type guard for checking if a value is a valid function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard for checking if a value is a valid object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a valid string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a valid number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if a value is a valid boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// ============================================================================
// Safe Property Access Utilities
// ============================================================================

/**
 * Safely access nested object properties
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let result: unknown = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined || typeof result !== 'object') {
        return defaultValue;
      }
      result = (result as Record<string, unknown>)[key];
    }
    
    return result !== undefined ? result as T : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely call a function with proper error handling
 */
export function safeCall<T>(fn: unknown, ...args: unknown[]): T | null {
  try {
    if (typeof fn === 'function') {
      return fn(...args) as T;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && 
         typeof process.versions !== 'undefined' && 
         typeof process.versions.node !== 'undefined';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  ReCaptchaAPI,
  AnalyticsAPI,
  GTagAPI,
  GoogleMapsAPI,
};


