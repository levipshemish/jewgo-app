/**
 * Server-only environment configuration
 * Contains sensitive values that should never be included in client bundles
 */

// HMAC keys for cookie signing - server-only
export const MERGE_COOKIE_HMAC_KEY_CURRENT = process.env.MERGE_COOKIE_HMAC_KEY_CURRENT;
export const MERGE_COOKIE_HMAC_KEY_PREVIOUS = process.env.MERGE_COOKIE_HMAC_KEY_PREVIOUS;
export const MERGE_COOKIE_KEY_ID = process.env.MERGE_COOKIE_KEY_ID || 'v1';

// Supabase service role key - server-only
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Redis configuration - server-only
export const REDIS_URL = process.env.REDIS_URL;
export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_DB = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0;

// Security secrets - server-only
export const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
export const IP_HASH_SALT = process.env.IP_HASH_SALT || 'default-ip-salt-change-in-production';
export const ANALYTICS_HMAC_SECRET = process.env.ANALYTICS_HMAC_SECRET;
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

// Cleanup configuration - server-only
export const CLEANUP_CRON_SECRET = process.env.CLEANUP_CRON_SECRET;

// Feature flags - server-only
export const APPLE_OAUTH_ENABLED = process.env.APPLE_OAUTH_ENABLED === 'true';
export const ACCOUNT_LINKING_ENABLED = process.env.ACCOUNT_LINKING_ENABLED === 'true';
