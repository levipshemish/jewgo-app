/**
 * Cursor pagination configuration constants
 * Phase 2.5 feature flags and settings
 */

// Feature flag for cursor pagination
// Enabled by default for Eatery; set NEXT_PUBLIC_ENABLE_CURSOR_PAGINATION=false to disable
export const ENABLE_CURSOR_PAGINATION = process.env.NEXT_PUBLIC_ENABLE_CURSOR_PAGINATION !== 'false';

// Cursor pagination behavior
export const CURSOR_CONFIG = {
  // Prefer cursor over offset pagination
  PREFER_CURSOR: true,
  
  // Automatically fallback to offset if cursor fails
  FALLBACK_TO_OFFSET: true,
  
  // Enable URL state persistence with cursor tokens
  ENABLE_URL_STATE: true,
  
  // Default items per page for cursor mode
  DEFAULT_LIMIT: 24,
  
  // Maximum items per page
  MAX_LIMIT: 100,
  
  // Auto-fallback after this many cursor failures
  MAX_CURSOR_FAILURES: 3,
  
  // Session storage settings
  SESSION_STORAGE: {
    MAX_ENTRIES: 10,
    STALENESS_HOURS: 2,
  },
  
  // URL update throttling
  URL_UPDATE_THROTTLE_MS: 500,
} as const;

// Backend endpoint configuration
export const CURSOR_API_ENDPOINTS = {
  RESTAURANTS: '/api/restaurants/keyset/list',
  HEALTH: '/api/restaurants/keyset/health',
} as const;

// Development and debugging
export const CURSOR_DEBUG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_API_CALLS: true,
  LOG_STATE_CHANGES: true,
  SHOW_DEBUG_UI: process.env.NODE_ENV === 'development',
} as const;

/**
 * Get cursor pagination configuration based on environment and feature flags
 */
export function getCursorConfig() {
  return {
    enabled: ENABLE_CURSOR_PAGINATION,
    preferCursor: CURSOR_CONFIG.PREFER_CURSOR,
    fallbackToOffset: CURSOR_CONFIG.FALLBACK_TO_OFFSET,
    enableUrlState: CURSOR_CONFIG.ENABLE_URL_STATE,
    cursorLimit: CURSOR_CONFIG.DEFAULT_LIMIT,
    offsetLimit: CURSOR_CONFIG.DEFAULT_LIMIT,
    maxFailures: CURSOR_CONFIG.MAX_CURSOR_FAILURES,
    debug: CURSOR_DEBUG.ENABLED,
  };
}

/**
 * Check if cursor pagination should be used for a specific page
 */
export function shouldUseCursorPagination(pageType: 'eatery' | 'marketplace' | 'shuls' = 'eatery'): boolean {
  if (!ENABLE_CURSOR_PAGINATION) return false;
  
  // For now, only enable for eatery page
  // Can be expanded to other pages in the future
  return pageType === 'eatery';
}

/**
 * ★ Insight ─────────────────────────────────────
 * These constants provide centralized configuration for Phase 2.5
 * cursor pagination rollout, enabling feature flags, A/B testing,
 * and gradual deployment across different page types with
 * comprehensive fallback strategies.
 * ─────────────────────────────────────────────────
 */
