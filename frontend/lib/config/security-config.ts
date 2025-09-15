/**
 * Security Configuration for JewGo Frontend
 * 
 * Centralizes all security-related configuration including
 * authentication, rate limiting, WebAuthn, and security headers.
 */

export interface SecurityConfig {
  auth: {
    baseUrl: string;
    tokenRefreshThreshold: number;
    maxRetryAttempts: number;
    retryDelay: number;
    sessionTimeout: number;
  };
  webauthn: {
    enabled: boolean;
    rpId: string;
    rpName: string;
    origin: string;
    timeout: number;
  };
  rateLimiting: {
    enabled: boolean;
    showWarnings: boolean;
    warningThreshold: number;
  };
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableXFrameOptions: boolean;
    reportUri?: string;
  };
  monitoring: {
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
    enableSecurityEventLogging: boolean;
  };
}

// Default security configuration
const defaultConfig: SecurityConfig = {
  auth: {
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app',
    tokenRefreshThreshold: 300, // 5 minutes
    maxRetryAttempts: 2,
    retryDelay: 1000, // 1 second
    sessionTimeout: 28800, // 8 hours
  },
  webauthn: {
    enabled: process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === 'true',
    rpId: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'jewgo.app',
    rpName: process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'JewGo',
    origin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'https://jewgo.app',
    timeout: parseInt(process.env.NEXT_PUBLIC_WEBAUTHN_TIMEOUT || '300000'), // 5 minutes in ms
  },
  rateLimiting: {
    enabled: process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED !== 'false',
    showWarnings: process.env.NODE_ENV === 'development',
    warningThreshold: 0.8, // Show warning at 80% of rate limit
  },
  security: {
    enableCSP: process.env.NODE_ENV === 'production',
    enableHSTS: process.env.NODE_ENV === 'production',
    enableXFrameOptions: true,
    reportUri: process.env.NEXT_PUBLIC_CSP_REPORT_URI,
  },
  monitoring: {
    enableErrorReporting: process.env.NODE_ENV === 'production',
    enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableSecurityEventLogging: true,
  },
};

// Environment-specific overrides
const environmentConfigs: Record<string, Partial<SecurityConfig>> = {
  development: {
    auth: {
      baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
      tokenRefreshThreshold: 300,
      maxRetryAttempts: 2,
      retryDelay: 1000,
      sessionTimeout: 28800,
    },
    webauthn: {
      enabled: process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === 'true',
      rpId: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
      rpName: process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'JewGo Dev',
      origin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3000',
      timeout: 300000,
    },
    rateLimiting: {
      enabled: true,
      showWarnings: true,
      warningThreshold: 0.8,
    },
    security: {
      enableCSP: false,
      enableHSTS: false,
      enableXFrameOptions: true,
    },
    monitoring: {
      enableErrorReporting: false,
      enablePerformanceMonitoring: false,
      enableSecurityEventLogging: true,
    },
  },
  test: {
    auth: {
      baseUrl: 'http://localhost:5000',
      tokenRefreshThreshold: 300,
      maxRetryAttempts: 1,
      retryDelay: 100,
      sessionTimeout: 28800,
    },
    webauthn: {
      enabled: false,
      rpId: 'test',
      rpName: 'JewGo Test',
      origin: 'http://localhost:3000',
      timeout: 300000,
    },
    rateLimiting: {
      enabled: false,
      showWarnings: false,
      warningThreshold: 0.8,
    },
    security: {
      enableCSP: false,
      enableHSTS: false,
      enableXFrameOptions: true,
    },
    monitoring: {
      enableErrorReporting: false,
      enablePerformanceMonitoring: false,
      enableSecurityEventLogging: false,
    },
  },
  production: {
    auth: {
      baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app',
      tokenRefreshThreshold: 300,
      maxRetryAttempts: 2,
      retryDelay: 1000,
      sessionTimeout: 28800,
    },
    webauthn: {
      enabled: process.env.NEXT_PUBLIC_WEBAUTHN_ENABLED === 'true',
      rpId: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'jewgo.app',
      rpName: process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'JewGo',
      origin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'https://jewgo.app',
      timeout: 300000,
    },
    rateLimiting: {
      enabled: true,
      showWarnings: false,
      warningThreshold: 0.8,
    },
    security: {
      enableCSP: true,
      enableHSTS: true,
      enableXFrameOptions: true,
    },
    monitoring: {
      enableErrorReporting: true,
      enablePerformanceMonitoring: true,
      enableSecurityEventLogging: true,
    },
  },
};

// Merge configurations
function mergeConfig(base: SecurityConfig, override: Partial<SecurityConfig>): SecurityConfig {
  return {
    auth: { ...base.auth, ...override.auth },
    webauthn: { ...base.webauthn, ...override.webauthn },
    rateLimiting: { ...base.rateLimiting, ...override.rateLimiting },
    security: { ...base.security, ...override.security },
    monitoring: { ...base.monitoring, ...override.monitoring },
  };
}

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Export final configuration
export const securityConfig: SecurityConfig = mergeConfig(
  defaultConfig,
  environmentConfigs[environment] || {}
);

// Security validation functions
export const securityValidation = {
  /**
   * Validate if current origin matches configured WebAuthn origin
   */
  validateWebAuthnOrigin(): boolean {
    if (typeof window === 'undefined') return true;
    return window.location.origin === securityConfig.webauthn.origin;
  },

  /**
   * Validate if HTTPS is enabled in production
   */
  validateHTTPS(): boolean {
    if (typeof window === 'undefined') return true;
    if (environment !== 'production') return true;
    return window.location.protocol === 'https:';
  },

  /**
   * Validate CSP compliance
   */
  validateCSP(): boolean {
    if (!securityConfig.security.enableCSP) return true;
    // Add CSP validation logic here
    return true;
  },

  /**
   * Run all security validations
   */
  validateAll(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validateWebAuthnOrigin()) {
      errors.push('WebAuthn origin mismatch');
    }

    if (!this.validateHTTPS()) {
      errors.push('HTTPS required in production');
    }

    if (!this.validateCSP()) {
      errors.push('CSP validation failed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// Security headers configuration
export const securityHeaders = {
  /**
   * Content Security Policy
   */
  getCSP(): string {
    if (!securityConfig.security.enableCSP) return '';

    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.jewgo.app https://maps.googleapis.com wss:",
      "frame-src 'self' https://maps.googleapis.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ];

    if (securityConfig.security.reportUri) {
      directives.push(`report-uri ${securityConfig.security.reportUri}`);
    }

    return directives.join('; ');
  },

  /**
   * Get all security headers
   */
  getAllHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (securityConfig.security.enableCSP) {
      headers['Content-Security-Policy'] = this.getCSP();
    }

    if (securityConfig.security.enableHSTS) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    if (securityConfig.security.enableXFrameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';

    return headers;
  },
};

// Rate limiting configuration
export const rateLimitConfig = {
  /**
   * Get rate limit configuration for different endpoint types
   */
  getEndpointLimits(): Record<string, { requests: number; window: number }> {
    return {
      login: { requests: 10, window: 900 }, // 10 requests per 15 minutes
      register: { requests: 5, window: 3600 }, // 5 requests per hour
      'password-reset': { requests: 3, window: 3600 }, // 3 requests per hour
      'profile-update': { requests: 10, window: 3600 }, // 10 requests per hour
      'api-general': { requests: 100, window: 3600 }, // 100 requests per hour
      'api-search': { requests: 200, window: 3600 }, // 200 requests per hour
    };
  },

  /**
   * Check if rate limit warning should be shown
   */
  shouldShowWarning(current: number, limit: number): boolean {
    if (!securityConfig.rateLimiting.showWarnings) return false;
    return current / limit >= securityConfig.rateLimiting.warningThreshold;
  },
};

// Export individual configurations for convenience
export const authConfig = securityConfig.auth;
export const webauthnConfig = securityConfig.webauthn;
export const monitoringConfig = securityConfig.monitoring;

// Development helpers
if (environment === 'development') {
  console.log('Security Configuration:', securityConfig);
  
  const validation = securityValidation.validateAll();
  if (!validation.valid) {
    console.warn('Security validation warnings:', validation.errors);
  }
}