/**
 * Server initialization module
 * Handles boot-time validation and setup for server-side functionality
 */

import { featureGuard } from './feature-guard';
import { validateEnvironment } from './config/environment';

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
    // Validate environment configuration
    validateEnvironment();

    // Initialize feature guard
    const featuresValid = await featureGuard.validateFeatures();
    if (!featuresValid) {
      console.error('❌ Feature guard initialization failed');
      return false;
    }

    // For client-side, we'll assume anonymous auth is supported
    // since we can't validate server-only features here
    anonymousAuthSupported = true;
    featureValidationCache = true;

    initialized = true;
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
