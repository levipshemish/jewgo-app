/**
 * Analytics Configuration Utility
 * Centralized configuration for all analytics services
 */

export interface AnalyticsConfig {
  // Google Analytics
  gaMeasurementId: string | null;
  gaEnabled: boolean;
  gaDebugMode: boolean;
  gaEnhancedEcommerce: boolean;
  gaCustomDimensions: boolean;
  
  // General Analytics
  enabled: boolean;
  provider: 'google_analytics' | 'mixpanel' | 'custom' | 'none';
  
  // Tracking Features
  trackUserId: boolean;
  trackSessionId: boolean;
  trackPerformance: boolean;
  trackErrors: boolean;
  
  // API Configuration
  apiEndpoint: string;
  batchSize: number;
  flushInterval: number;
}

/**
 * Get analytics configuration from environment variables
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  return {
    // Google Analytics
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null,
    gaEnabled: process.env.NEXT_PUBLIC_GA_ENABLED === 'true',
    gaDebugMode: process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true',
    gaEnhancedEcommerce: process.env.NEXT_PUBLIC_GA_ENHANCED_ECOMMERCE === 'true',
    gaCustomDimensions: process.env.NEXT_PUBLIC_GA_CUSTOM_DIMENSIONS === 'true',
    
    // General Analytics
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
    provider: (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as any) || 'google_analytics',
    
    // Tracking Features
    trackUserId: process.env.NEXT_PUBLIC_ANALYTICS_TRACK_USER_ID === 'true',
    trackSessionId: process.env.NEXT_PUBLIC_ANALYTICS_TRACK_SESSION_ID === 'true',
    trackPerformance: process.env.NEXT_PUBLIC_ANALYTICS_TRACK_PERFORMANCE === 'true',
    trackErrors: process.env.NEXT_PUBLIC_ANALYTICS_TRACK_ERRORS === 'true',
    
    // API Configuration
    apiEndpoint: process.env.NEXT_PUBLIC_ANALYTICS_API_ENDPOINT || '/api/analytics',
    batchSize: parseInt(process.env.NEXT_PUBLIC_ANALYTICS_BATCH_SIZE || '10', 10),
    flushInterval: parseInt(process.env.NEXT_PUBLIC_ANALYTICS_FLUSH_INTERVAL || '30000', 10),
  };
}

/**
 * Check if Google Analytics is properly configured
 */
export function isGoogleAnalyticsConfigured(): boolean {
  const config = getAnalyticsConfig();
  return config.gaEnabled && 
         config.gaMeasurementId !== null && 
         config.gaMeasurementId !== 'G-XXXXXXXXXX' &&
         config.gaMeasurementId.length > 0;
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  const config = getAnalyticsConfig();
  return config.enabled && (config.provider !== 'none');
}

/**
 * Get debug configuration for development
 */
export function getDebugConfig() {
  const config = getAnalyticsConfig();
  return {
    enabled: config.gaDebugMode && process.env.NODE_ENV === 'development',
    config: config,
  };
}

/**
 * Validate analytics configuration
 */
export function validateAnalyticsConfig(): { valid: boolean; errors: string[] } {
  const config = getAnalyticsConfig();
  const errors: string[] = [];
  
  if (config.enabled) {
    if (config.provider === 'google_analytics' && !isGoogleAnalyticsConfigured()) {
      errors.push('Google Analytics enabled but measurement ID not configured');
    }
    
    if (config.apiEndpoint && !config.apiEndpoint.startsWith('/')) {
      errors.push('Analytics API endpoint must be a relative path');
    }
    
    if (config.batchSize < 1 || config.batchSize > 100) {
      errors.push('Analytics batch size must be between 1 and 100');
    }
    
    if (config.flushInterval < 1000 || config.flushInterval > 300000) {
      errors.push('Analytics flush interval must be between 1 and 300 seconds');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
