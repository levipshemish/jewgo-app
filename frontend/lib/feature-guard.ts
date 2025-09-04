// Basic feature checks that can run in the browser

/**
 * Feature Guard - Boot-time validation of critical PostgreSQL authentication features
 * This should be called during app initialization to ensure all required features are available
 * Client-safe version that doesn't import server-only modules
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
   * Validate PostgreSQL authentication features at boot time
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
      const basicValidation = this.validatePostgresAuthConfiguration();
      if (!basicValidation) {
        console.error('🚨 CRITICAL: PostgreSQL authentication configuration validation failed');
        console.error('Application startup failure - check environment variables');
        
        // Log to Sentry if available
        this.logToSentry('PostgreSQL authentication configuration validation failed', 'error');
        
        return false;
      }

      // Client-side feature validation (limited scope)
      const clientFeatureValidation = this.validateClientFeatures();
      if (!clientFeatureValidation) {
        console.error('🚨 CRITICAL: Client-side PostgreSQL authentication feature validation failed');
        console.error('Required client features not available');
        
        // Log to Sentry if available
        this.logToSentry('Client-side PostgreSQL authentication feature validation failed', 'error');
        
        return false;
      }

      this.validated = true;
      return true;

    } catch (error) {
      console.error('🚨 CRITICAL: Feature Guard validation failed:', error);
      console.error('Application startup failure - PostgreSQL authentication may be misconfigured');
      
      // Log to Sentry if available
      this.logToSentry('Feature Guard validation failed', 'error', error);
      
      return false;
    } finally {
      this.validationPromise = null;
    }
  }

  /**
   * Validate PostgreSQL authentication configuration
   */
  private validatePostgresAuthConfiguration(): boolean {
    try {
      // Check if backend URL is configured
      const hasBackendUrl = !!process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!hasBackendUrl) {
        console.error('[FeatureGuard] Missing PostgreSQL authentication backend URL');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[FeatureGuard] PostgreSQL auth configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Client-side feature validation (limited scope)
   */
  private validateClientFeatures(): boolean {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return false;
      }

      // Basic client-side checks
      const hasBackendUrl = !!process.env.NEXT_PUBLIC_BACKEND_URL;

      if (!hasBackendUrl) {
        console.error('[FeatureGuard] Missing PostgreSQL authentication backend URL');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[FeatureGuard] Client feature validation failed:', error);
      return false;
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
   * Log to Sentry if available (client-safe)
   */
  private logToSentry(message: string, level: 'error' | 'warn' | 'info', error?: any): void {
    try {
      // Check if Sentry is available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        const Sentry = (window as any).Sentry;
        if (level === 'error') {
          Sentry.captureException(error || new Error(message));
        } else {
          Sentry.captureMessage(message, level);
        }
      }
    } catch (sentryError) {
      // Silently fail if Sentry logging fails; only log in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[FeatureGuard] Sentry logging failed:', sentryError);
      }
    }
  }
}

// Export singleton instance
export const featureGuard = FeatureGuard.getInstance();
