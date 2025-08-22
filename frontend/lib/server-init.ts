/**
 * Server initialization module
 * Handles boot-time validation and setup for server-side functionality
 */

import { initializeFeatureGuard } from './feature-guard';
import { validateEnvironment } from './config/environment';
import { validateSupabaseFeaturesWithLogging } from './utils/auth-utils.server';

let initialized = false;
let initializationPromise: Promise<boolean> | null = null;
let anonymousAuthSupported = false;
let featureValidationCache: boolean | null = null;

/**
 * Initialize server-side functionality
 * This should be called early in the application lifecycle
 */
export async function initializeServer(): Promise<boolean> {
  if (initialized) {
    return true;
  }

  // Prevent multiple simultaneous initializations
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = performInitialization();
  return initializationPromise;
}

async function performInitialization(): Promise<boolean> {
  try {
    console.log('🚀 Starting server initialization...');

    // Validate environment configuration
    validateEnvironment();
    console.log('✅ Environment validation completed');

    // Initialize feature guard
    const featuresValid = await initializeFeatureGuard();
    if (!featuresValid) {
      console.error('❌ Feature guard initialization failed');
      return false;
    }
    console.log('✅ Feature guard initialization completed');

    // Validate anonymous auth features once at boot with loud logging and caching
    console.log('🚨 [Server Init] Starting critical anonymous auth feature validation...');
    const anonymousFeaturesValid = await validateSupabaseFeaturesWithLogging();
    featureValidationCache = anonymousFeaturesValid;
    
    if (!anonymousFeaturesValid) {
      console.error('🚨 CRITICAL: Anonymous auth features not supported at boot time');
      console.error('🚨 ANONYMOUS AUTH WILL FAIL - Application startup failure');
      anonymousAuthSupported = false;
      
      // Fail fast in non-dev environments
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: Anonymous auth features not supported - application startup failure');
      }
    } else {
      console.log('✅ Anonymous auth features validated successfully at boot time');
      anonymousAuthSupported = true;
    }

    initialized = true;
    console.log('✅ Server initialization completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    return false;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Check if server has been initialized
 */
export function isServerInitialized(): boolean {
  return initialized;
}

/**
 * Check if anonymous auth is supported
 */
export function isAnonymousAuthSupported(): boolean {
  return anonymousAuthSupported;
}

/**
 * Get cached feature validation result
 */
export function getFeatureValidationCache(): boolean | null {
  return featureValidationCache;
}

/**
 * Force re-initialization (useful for testing)
 */
export async function reinitializeServer(): Promise<boolean> {
  initialized = false;
  initializationPromise = null;
  return initializeServer();
}
