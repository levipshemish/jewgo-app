// Constants used across IS implementation

export const IS_ROOT_MARGIN = '0px 0px 200px 0px'; // Much more aggressive - allows cards to flow under bottom nav
export const IS_THRESHOLD = 0; // Safari-safe (no fractional thresholds)
export const IS_MIN_REMAINING_VIEWPORT_MULTIPLIER = 1.0; // Full viewport height - very aggressive loading
export const IS_REPLACE_STATE_THROTTLE_MS = 500; // locked
export const IS_STARVATION_MS = 2000; // show "Load more" if sentinel starves (increased from 1500ms)
export const IS_MAX_CONSEC_AUTOLOADS = 1; // momentum guard (reduced from 2)
export const IS_USER_SCROLL_DELTA_PX = 16; // require user delta between bursts (increased from 8px)

export const ENABLE_EATERY_INFINITE_SCROLL = true; // wire to your flag system
// Virtualization feature flag (Phase 3). Keep default false until implemented/verified
export const ENABLE_EATERY_VIRTUALIZATION = false;
export const IS_VIRTUAL_OVERSCAN = 6; // rows to render beyond viewport
export const IS_VIRTUAL_ACTIVATION_MIN_ITEMS = 200; // gate to avoid premature enablement

// Memory management constants
export const IS_MEMORY_CAP_ITEMS = 300; // Maximum items to retain in memory (reduced from 600)
export const IS_MEMORY_COMPACTION_THRESHOLD = 400; // Trigger compaction when exceeding this (reduced from 800)
export const IS_MEMORY_MONITORING_INTERVAL_MS = 30000; // Check memory every 30s

// Analytics budgets - further reduced to prevent REQUEST_TOO_LARGE errors
export const IS_ANALYTICS_MAX_EVENTS = 30; // Further reduced from 60 to prevent large payloads
export const IS_ANALYTICS_MAX_ERRORS = 10; // Further reduced from 20
export const IS_MAX_RETRY_EPISODES_PER_SESSION = 2; // Further reduced from 3
