// Basic feature checks that can run in the browser
import { validateSupabaseFeatureSupport } from './utils/auth-utils';
// Server-only, louder validation with logging (SSR/init paths)
import { validateSupabaseFeaturesWithLogging } from './utils/auth-utils.server';

/**
 * Feature Guard - Boot-time validation of critical Supabase features
 * This should be called during app initialization to ensure all required features are available
 */
export class FeatureGuard {
  private static instance: FeatureGuard;
  private validated = false;
  private validationPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): FeatureGuard {
    if (!FeatureGuard.instance) {
      FeatureGuard.instance = new FeatureGuard();
    }
    return FeatureGuard.instance;
  }

  /**
   * Validate Supabase features at boot time
   * This is a critical check that should be called during app initialization
   */
  async validateFeatures(): Promise<boolean> {
    if (this.validated) {
      return true;
    }

    // Prevent multiple simultaneous validations
    if (this.validationPromise) {
      return this.validationPromise;
    }

    this.validationPromise = this.performValidation();
    return this.validationPromise;
  }

  private async performValidation(): Promise<boolean> {
    try {

      // Basic configuration validation
      const basicValidation = validateSupabaseFeatureSupport();
      if (!basicValidation) {
        console.error('🚨 CRITICAL: Supabase configuration validation failed');
        console.error('Application startup failure - check environment variables');
        
        // Log to Sentry if available
        this.logToSentry('Supabase configuration validation failed', 'error');
        
        return false;
      }

      // Comprehensive feature validation
      const featureValidation = await validateSupabaseFeaturesWithLogging();
      if (!featureValidation) {
        // console.error('🚨 CRITICAL: Supabase feature validation failed');
        // console.error('Required features (signInAnonymously, linkIdentity) not available');
        // console.error('Application startup failure - check Supabase SDK version');
        
        // Log to Sentry if available
        this.logToSentry('Supabase feature validation failed', 'error');
        
        return false;
      }

      this.validated = true;

      return true;

    } catch (error) {
      // console.error('🚨 CRITICAL: Feature Guard validation failed:', error);
      // console.error('Application startup failure - Supabase SDK may be corrupted');
      
      // Log to Sentry if available
      this.logToSentry('Feature Guard validation failed', 'error', error);
      
      return false;
    } finally {
      this.validationPromise = null;
    }
  }

  /**
   * Force re-validation (useful for testing or after configuration changes)
   */
  async revalidate(): Promise<boolean> {
    this.validated = false;
    this.validationPromise = null;
    return this.validateFeatures();
  }

  /**
   * Check if features have been validated
   */
  isValidated(): boolean {
    return this.validated;
  }

  /**
   * Log to Sentry if available
   */
  private logToSentry(message: string, level: 'error' | 'warning' | 'info', error?: any): void {
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        if (error) {
          (window as any).Sentry.captureException(error, {
            tags: { component: 'feature_guard' },
            level
          });
        } else {
          (window as any).Sentry.captureMessage(message, {
            level,
            tags: { component: 'feature_guard' }
          });
        }
      }
    } catch (sentryError) {
      // console.warn('[Feature Guard] Failed to log to Sentry:', sentryError);
    }
  }
}

/**
 * Initialize Feature Guard during app startup
 * This should be called early in the application lifecycle
 */
export async function initializeFeatureGuard(): Promise<boolean> {
  const guard = FeatureGuard.getInstance();
  return guard.validateFeatures();
}

/**
 * Get Feature Guard instance
 */
export function getFeatureGuard(): FeatureGuard {
  return FeatureGuard.getInstance();
}

/**
 * Validate features synchronously (for use in components that can't be async)
 * Returns the last known validation state
 */
export function validateFeaturesSync(): boolean {
  const guard = FeatureGuard.getInstance();
  return guard.isValidated();
}
