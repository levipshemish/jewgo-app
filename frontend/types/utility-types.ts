/**
 * Utility Types for JewGo Application
 * ===================================
 * 
 * Comprehensive type definitions for utility functions, API routes,
 * analytics, and mobile optimization to eliminate `any` usage.
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// API Route Types
// ============================================================================

/**
 * Validation result for API request bodies
 */
export interface ApiValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Generic validation result for any data
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

/**
 * Body validator function type
 */
export type BodyValidator<T = unknown> = (body: T) => ValidationResult<T>;

/**
 * API route handler response types
 */
export interface ApiRouteResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

/**
 * Standard API response factory types
 */
export interface ApiResponseFactory {
  success: <T>(data: T, status?: number) => NextResponse;
  created: <T>(data: T) => NextResponse;
  error: (message: string, status?: number, error?: string) => NextResponse;
  validationError: (errors: string[]) => NextResponse;
  serviceUnavailable: (serviceName: string) => NextResponse;
}

/**
 * Request context for API routes
 */
export interface RequestContext {
  userId?: string;
  userRole?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
}

/**
 * Backend service configuration
 */
export interface BackendServiceConfig {
  url: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Base analytics event structure
 */
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, string | number | boolean | null>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  pageUrl?: string;
  userAgent?: string;
}

/**
 * Registration-specific analytics events
 */
export interface RegistrationAnalyticsEvent extends AnalyticsEvent {
  event: 'registration_attempt' | 'registration_success' | 'registration_failure';
  properties: {
    email?: string;
    source?: string;
    reason?: string;
    details?: Record<string, unknown>;
    userId?: string;
  } & Record<string, string | number | boolean | null>;
}

/**
 * Login-specific analytics events
 */
export interface LoginAnalyticsEvent extends AnalyticsEvent {
  event: 'login_attempt' | 'login_success' | 'login_failure';
  properties: {
    email?: string;
    method: string;
    reason?: string;
    userId?: string;
  };
}

/**
 * User interaction analytics events
 */
export interface UserInteractionEvent extends AnalyticsEvent {
  event: 'page_view' | 'button_click' | 'form_submit' | 'search_query';
  properties: {
    pageName?: string;
    elementId?: string;
    query?: string;
    filters?: Record<string, unknown>;
  } & Record<string, string | number | boolean | null>;
}

/**
 * Performance analytics events
 */
export interface PerformanceEvent extends Omit<AnalyticsEvent, 'timestamp'> {
  event: 'performance_metric';
  timestamp: number;
  properties: {
    metric: string;
    value: number;
    unit?: string;
    pageUrl?: string;
  } & Record<string, string | number | boolean | null>;
}

/**
 * Analytics metrics tracking
 */
export interface AnalyticsMetrics {
  totalAttempts: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  validationErrors: number;
  rateLimitHits: number;
  loginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
}

/**
 * Analytics service configuration
 */
export interface AnalyticsServiceConfig {
  enabled: boolean;
  serviceName: 'google_analytics' | 'mixpanel' | 'custom';
  measurementId?: string;
  apiKey?: string;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
}

// ============================================================================
// Mobile Optimization Types
// ============================================================================

/**
 * Touch event types
 */
export interface TouchEventData {
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';
  target: EventTarget;
  touches: TouchList;
  changedTouches: TouchList;
  timeStamp: number;
}

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  maxTouchPoints: number;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
}

/**
 * Touch target configuration
 */
export interface TouchTargetConfig {
  minSize: number;
  padding: number;
  margin: number;
  borderRadius: number;
  transitionDuration: number;
}

/**
 * Mobile optimization settings
 */
export interface MobileOptimizationSettings {
  touchTargetSize: number;
  debounceDelay: number;
  throttleDelay: number;
  scrollThreshold: number;
  gestureThreshold: number;
  enableHapticFeedback: boolean;
  enableSmoothScrolling: boolean;
}

/**
 * Browser API types for mobile optimization
 */
export interface BrowserAPIs {
  // Touch APIs
  TouchEvent?: typeof TouchEvent;
  TouchList?: typeof TouchList;
  
  // Device APIs
  navigator: {
    maxTouchPoints: number;
    userAgent: string;
    platform: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: {
      effectiveType: string;
      downlink: number;
      rtt: number;
    };
  };
  
  // Performance APIs
  PerformanceObserver?: typeof PerformanceObserver;
  PerformanceEntry?: typeof PerformanceEntry;
  
  // Intersection Observer
  IntersectionObserver?: typeof IntersectionObserver;
  
  // Resize Observer
  ResizeObserver?: typeof ResizeObserver;
  
  // Web Vitals
  webVitals?: {
    onCLS: (callback: (metric: any) => void) => void;
    onFID: (callback: (metric: any) => void) => void;
    onFCP: (callback: (metric: any) => void) => void;
    onLCP: (callback: (metric: any) => void) => void;
    onTTFB: (callback: (metric: any) => void) => void;
    onINP: (callback: (metric: any) => void) => void;
  };
}

// ============================================================================
// Utility Function Types
// ============================================================================

/**
 * Generic function type for debouncing
 */
export type DebouncedFunction<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

/**
 * Generic function type for throttling
 */
export type ThrottledFunction<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

/**
 * Safe array operation result
 */
export interface SafeArrayResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}



/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  expiresAt: number;
}

/**
 * Performance monitoring event
 */
export interface PerformanceMonitoringEvent {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error context for logging
 */
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  userAgent?: string;
  timestamp: Date;
  stack?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  redactSensitive: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
}

/**
 * Authentication error types
 */
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * User session data
 */
export interface UserSession {
  id: string;
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
  isAnonymous: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Cookie configuration
 */
export interface CookieConfig {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    path?: string;
    domain?: string;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if value is a valid object
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a valid array
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if value is a valid string
 */
export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for checking if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard for checking if value is a valid boolean
 */
export function isValidBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for checking if value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// ============================================================================
// Utility Type Helpers
// ============================================================================

/**
 * Make all properties optional and nullable
 */
export type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null;
};

/**
 * Make all properties required and non-nullable
 */
export type RequiredNonNullable<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Extract the type of a function's return value
 */
export type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;

/**
 * Extract the type of a function's parameters
 */
export type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Union of all possible values in an object
 */
export type ValueOf<T> = T[keyof T];

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep required type
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : NonNullable<T[P]>;
};
