/**
 * Comprehensive production configuration with versioned keys and trusted IP specifications
 * Centralized environment variable management with validation and security documentation
 */

// Versioned HMAC keys for smooth rotations
export const MERGE_COOKIE_HMAC_KEY_CURRENT = process.env.MERGE_COOKIE_HMAC_KEY_CURRENT;
export const MERGE_COOKIE_HMAC_KEY_PREVIOUS = process.env.MERGE_COOKIE_HMAC_KEY_PREVIOUS;
export const MERGE_COOKIE_KEY_ID = process.env.MERGE_COOKIE_KEY_ID || 'v1';

// Trusted CDN configuration
export const TRUSTED_CDN_IPS = [
  // Cloudflare
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  // EdgeCast
  '103.245.222.0/23', '103.245.224.0/24', '103.245.225.0/24', '103.245.226.0/23',
  // Add other CDNs as needed
];

export const TRUSTED_PROXY_STRATEGY = 'left-most-when-trusted'; // left-most when request IP in allowlist

// SameSite configuration
export const COOKIE_SAMESITE_STRATEGY = process.env.COOKIE_SAMESITE_STRATEGY || 'Lax'; // Lax for top-level, None for webview
export const WEBVIEW_MODE_ENABLED = process.env.WEBVIEW_MODE_ENABLED === 'true';

// CORS settings
export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://jewgo.app',
  'https://www.jewgo.app',
  // Add staging/production domains as needed
].filter(Boolean);

export const CORS_CREDENTIALS_ENABLED = process.env.CORS_CREDENTIALS_ENABLED !== 'false';

// Cleanup safety configuration
export const CLEANUP_DRY_RUN_MODE = process.env.CLEANUP_DRY_RUN_MODE === 'true';
export const CLEANUP_SAFETY_CHECKS_ENABLED = process.env.CLEANUP_SAFETY_CHECKS_ENABLED !== 'false';
export const CLEANUP_CRON_SECRET = process.env.CLEANUP_CRON_SECRET;

// Rate limiting UX configuration
export const RATE_LIMIT_SHOW_REMAINING = process.env.RATE_LIMIT_SHOW_REMAINING !== 'false';
export const RATE_LIMIT_SHOW_RESET_TIME = process.env.RATE_LIMIT_SHOW_RESET_TIME !== 'false';

// Supabase configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Redis configuration
export const REDIS_URL = process.env.REDIS_URL;
export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_DB = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0;

// Sentry configuration
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
export const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development';

// App configuration
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

/**
 * Validate required environment variables
 * Fails fast with detailed error messages for missing critical variables
 */
export function validateEnvironment(): void {
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_ROLE_KEY },
  ];

  const missingVars = requiredVars.filter(({ value }) => !value);
  
  if (missingVars.length > 0) {
    const missingNames = missingVars.map(({ name }) => name).join(', ');
    const errorMessage = `Missing required environment variables: ${missingNames}`;
    

    
    throw new Error(errorMessage);
  }

  // Validate HMAC keys in production
  if (IS_PRODUCTION) {
    if (!MERGE_COOKIE_HMAC_KEY_CURRENT || MERGE_COOKIE_HMAC_KEY_CURRENT === 'default-key') {
      throw new Error('MERGE_COOKIE_HMAC_KEY_CURRENT must be set in production');
    }
    
    if (!MERGE_COOKIE_HMAC_KEY_PREVIOUS || MERGE_COOKIE_HMAC_KEY_PREVIOUS === 'default-key') {
      throw new Error('MERGE_COOKIE_HMAC_KEY_PREVIOUS must be set in production');
    }
  }

  // Validate cleanup secret in production
  if (IS_PRODUCTION && !CLEANUP_CRON_SECRET) {
    throw new Error('CLEANUP_CRON_SECRET must be set in production');
  }
}

/**
 * Get cookie domain based on environment
 */
export function getCookieDomain(): string | undefined {
  if (IS_PRODUCTION) {
    return '.jewgo.app'; // Include subdomain support
  }
  return undefined; // Don't set domain in development
}

/**
 * Get cookie security options based on environment
 */
export function getCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: WEBVIEW_MODE_ENABLED ? 'none' : 'lax',
    domain: getCookieDomain(),
    maxAge: 600, // 10 minutes (reduced from 1 hour)
  };
}

/**
 * Get CORS headers for API responses
 * Returns either the matched origin or no Access-Control-Allow-Origin header for disallowed origins
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer, x-csrf-token',
    'Access-Control-Allow-Credentials': CORS_CREDENTIALS_ENABLED ? 'true' : 'false',
    'Cache-Control': 'no-store',
  };
  
  // Only set Access-Control-Allow-Origin if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

/**
 * Check if feature flags are enabled
 */
export const FEATURE_FLAGS = {
  ANONYMOUS_AUTH: process.env.FEATURE_ANONYMOUS_AUTH !== 'false',
  MERGE_OPERATIONS: process.env.FEATURE_MERGE_OPERATIONS !== 'false',
  ENHANCED_RATE_LIMITING: process.env.FEATURE_ENHANCED_RATE_LIMITING !== 'false',
  CLEANUP_OPERATIONS: process.env.FEATURE_CLEANUP_OPERATIONS !== 'false',
} as const;

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isProduction: IS_PRODUCTION,
    isDevelopment: IS_DEVELOPMENT,
    appUrl: APP_URL,
    allowedOrigins: ALLOWED_ORIGINS,
    cookieOptions: getCookieOptions(),
    featureFlags: FEATURE_FLAGS,
    trustedCDNIPs: TRUSTED_CDN_IPS,
    trustedProxyStrategy: TRUSTED_PROXY_STRATEGY,
  };
}

// Validate environment on module load (only during runtime, not build time)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only validate on server side and not during build/test
  try {
    validateEnvironment();
    
    // Boot-time feature support validation
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      // Import and run feature validation asynchronously
      import('@/lib/utils/auth-utils.server').then(async ({ validateSupabaseFeaturesWithLogging }) => {
        try {
          const featuresSupported = await validateSupabaseFeaturesWithLogging();
          if (!featuresSupported) {
            console.error('🚨 CRITICAL: Supabase features not available at boot time');
            if (IS_PRODUCTION) {
              // In production, this is a critical error that should fail fast
              process.exit(1);
            }
          } else {
            console.log('✅ Supabase features validated successfully at boot time');
          }
        } catch (error) {
          console.error('🚨 CRITICAL: Feature validation failed at boot time:', error);
          if (IS_PRODUCTION) {
            process.exit(1);
          }
        }
      }).catch((error) => {
        console.error('🚨 CRITICAL: Failed to import feature validation module:', error);
        if (IS_PRODUCTION) {
          process.exit(1);
        }
      });
    }
  } catch (error) {
    console.error('Environment validation failed:', error);
    // Don't throw during build time, only during runtime
    if (IS_PRODUCTION && process.env.NEXT_PHASE !== 'phase-production-build') {
      throw error; // Fail fast in production runtime
    }
  }
}
