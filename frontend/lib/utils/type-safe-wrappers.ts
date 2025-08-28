// Type-safe wrapper utilities for external libraries
// This provides safe, typed access to external APIs and libraries

import { 
  isAnalyticsAvailable, 
  safeGetAnalytics, 
  isGtagAvailable, 
  safeGetGtag,
  isReCaptchaAvailable,
  safeGetReCaptcha,
  isGoogleMapsAvailable,
  safeGetGoogleMaps,
  type AnalyticsAPI,
  type GTagAPI,
  type ReCaptchaAPI
} from '@/lib/types/external-libraries';

// ============================================================================
// Analytics Wrapper
// ============================================================================

export class AnalyticsWrapper {
  private static instance: AnalyticsWrapper;
  private analytics: AnalyticsAPI | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AnalyticsWrapper {
    if (!AnalyticsWrapper.instance) {
      AnalyticsWrapper.instance = new AnalyticsWrapper();
    }
    return AnalyticsWrapper.instance;
  }

  private initialize(): void {
    if (isAnalyticsAvailable()) {
      this.analytics = safeGetAnalytics();
    }
  }

  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (this.analytics?.trackEvent) {
      this.analytics.trackEvent(eventName, properties);
    }
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    if (this.analytics?.trackError) {
      this.analytics.trackError(error, context);
    }
  }

  trackPerformance(metric: string, value: number): void {
    if (this.analytics?.trackPerformance) {
      this.analytics.trackPerformance(metric, value);
    }
  }

  isAvailable(): boolean {
    return this.analytics !== null;
  }
}

// ============================================================================
// Google Analytics Wrapper
// ============================================================================

export class GoogleAnalyticsWrapper {
  private static instance: GoogleAnalyticsWrapper;
  private gtag: GTagAPI | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): GoogleAnalyticsWrapper {
    if (!GoogleAnalyticsWrapper.instance) {
      GoogleAnalyticsWrapper.instance = new GoogleAnalyticsWrapper();
    }
    return GoogleAnalyticsWrapper.instance;
  }

  private initialize(): void {
    if (isGtagAvailable()) {
      this.gtag = safeGetGtag();
    }
  }

  config(measurementId: string, config: Record<string, unknown>): void {
    if (this.gtag) {
      this.gtag('config', measurementId, config);
    }
  }

  event(eventName: string, parameters: Record<string, unknown>): void {
    if (this.gtag) {
      this.gtag('event', eventName, parameters);
    }
  }

  isAvailable(): boolean {
    return this.gtag !== null;
  }
}

// ============================================================================
// ReCAPTCHA Wrapper
// ============================================================================

export class ReCaptchaWrapper {
  private static instance: ReCaptchaWrapper;
  private recaptcha: ReCaptchaAPI | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): ReCaptchaWrapper {
    if (!ReCaptchaWrapper.instance) {
      ReCaptchaWrapper.instance = new ReCaptchaWrapper();
    }
    return ReCaptchaWrapper.instance;
  }

  private initialize(): void {
    if (isReCaptchaAvailable()) {
      this.recaptcha = safeGetReCaptcha();
    }
  }

  async execute(siteKey: string, action: string): Promise<string | null> {
    try {
      if (!this.recaptcha) {
        // console.warn('ReCAPTCHA not available');
        return null;
      }

      return await this.recaptcha.execute(siteKey, { action });
    } catch (error) {
      console.error('ReCAPTCHA execution failed:', error);
      return null;
    }
  }

  ready(callback: () => void): void {
    if (this.recaptcha?.ready) {
      this.recaptcha.ready(callback);
    } else {
      // Fallback: execute callback immediately if ReCAPTCHA not available
      callback();
    }
  }

  isAvailable(): boolean {
    return this.recaptcha !== null;
  }
}

// ============================================================================
// Google Maps Wrapper
// ============================================================================

export class GoogleMapsWrapper {
  private static instance: GoogleMapsWrapper;
  private maps: unknown = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): GoogleMapsWrapper {
    if (!GoogleMapsWrapper.instance) {
      GoogleMapsWrapper.instance = new GoogleMapsWrapper();
    }
    return GoogleMapsWrapper.instance;
  }

  private initialize(): void {
    if (isGoogleMapsAvailable()) {
      this.maps = safeGetGoogleMaps();
    }
  }

  getMaps(): unknown {
    return this.maps;
  }

  isAvailable(): boolean {
    return this.maps !== null;
  }

  isPlacesAvailable(): boolean {
    return this.maps !== null && typeof this.maps === 'object' && this.maps !== null && 'places' in this.maps;
  }

  async importLibrary(library: string): Promise<unknown | null> {
    try {
      if (this.maps && typeof this.maps === 'object' && this.maps !== null && 'importLibrary' in this.maps) {
        const importLibraryFn = (this.maps as { importLibrary: (lib: string) => Promise<unknown> }).importLibrary;
        return await importLibraryFn(library);
      }
      return null;
    } catch (error) {
      console.error(`Failed to import Google Maps library: ${library}`, error);
      return null;
    }
  }
}

// ============================================================================
// Unified API Wrapper
// ============================================================================

export class ExternalAPIsWrapper {
  private static instance: ExternalAPIsWrapper;
  public analytics: AnalyticsWrapper;
  public gtag: GoogleAnalyticsWrapper;
  public recaptcha: ReCaptchaWrapper;
  public maps: GoogleMapsWrapper;

  private constructor() {
    this.analytics = AnalyticsWrapper.getInstance();
    this.gtag = GoogleAnalyticsWrapper.getInstance();
    this.recaptcha = ReCaptchaWrapper.getInstance();
    this.maps = GoogleMapsWrapper.getInstance();
  }

  static getInstance(): ExternalAPIsWrapper {
    if (!ExternalAPIsWrapper.instance) {
      ExternalAPIsWrapper.instance = new ExternalAPIsWrapper();
    }
    return ExternalAPIsWrapper.instance;
  }

  // Convenience methods for common operations
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    this.analytics.trackEvent(eventName, properties);
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    this.analytics.trackError(error, context);
  }

  async executeReCaptcha(siteKey: string, action: string): Promise<string | null> {
    return this.recaptcha.execute(siteKey, action);
  }

  gtagEvent(eventName: string, parameters: Record<string, unknown>): void {
    this.gtag.event(eventName, parameters);
  }

  // Status check methods
  getStatus(): {
    analytics: boolean;
    gtag: boolean;
    recaptcha: boolean;
    maps: boolean;
  } {
    return {
      analytics: this.analytics.isAvailable(),
      gtag: this.gtag.isAvailable(),
      recaptcha: this.recaptcha.isAvailable(),
      maps: this.maps.isAvailable(),
    };
  }
}

// ============================================================================
// Export singleton instances
// ============================================================================

export const analyticsAPI = AnalyticsWrapper.getInstance();
export const gtagAPI = GoogleAnalyticsWrapper.getInstance();
export const recaptchaAPI = ReCaptchaWrapper.getInstance();
export const mapsAPI = GoogleMapsWrapper.getInstance();
export const externalAPIs = ExternalAPIsWrapper.getInstance();
