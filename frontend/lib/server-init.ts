/**
 * Server initialization module
 * Handles boot-time validation and setup for server-side functionality
 */

import { initializeFeatureGuard } from './feature-guard';
import { validateEnvironment } from './config/environment';

let initialized = false;
let initializationPromise: Promise<boolean> | null = null;

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
 * Force re-initialization (useful for testing)
 */
export async function reinitializeServer(): Promise<boolean> {
  initialized = false;
  initializationPromise = null;
  return initializeServer();
}
