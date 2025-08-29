/**
 * Unified Authentication Module
 * Consolidates all authentication utilities and types
 */

// Re-export auth utilities
export * from '../utils/auth-utils';
export * from './session';
export * from './validation';

// Re-export Supabase clients
export { createServerSupabaseClient } from '../supabase/server';
export { supabaseClient } from '../supabase/client-secure';

// Re-export auth types
export type { TransformedUser } from '../utils/auth-utils';

// Centralized auth configuration
export const AUTH_CONFIG = {
  // Rate limiting configuration
  rateLimits: {
    emailAuth: { maxRequests: 10, window: 300 }, // 10 attempts per 5 minutes
    anonymousAuth: { maxRequests: 5, window: 300 }, // 5 attempts per 5 minutes
    passwordReset: { maxRequests: 3, window: 300 }, // 3 attempts per 5 minutes
  },
  
  // Session configuration
  session: {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  // Security configuration
  security: {
    requireCaptcha: true,
    requireRateLimit: true,
    requireReplayProtection: true,
  }
} as const;
