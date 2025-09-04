// Constants used across IS implementation

export const IS_ROOT_MARGIN = '0px 0px 256px 0px'; // More conservative root margin
export const IS_THRESHOLD = 0; // Safari-safe (no fractional thresholds)
export const IS_MIN_REMAINING_VIEWPORT_MULTIPLIER = 1; // 1 * viewport height (more conservative)
export const IS_REPLACE_STATE_THROTTLE_MS = 500; // locked
export const IS_STARVATION_MS = 1500; // show "Load more" if sentinel starves
export const IS_MAX_CONSEC_AUTOLOADS = 2; // momentum guard
export const IS_USER_SCROLL_DELTA_PX = 8; // require user delta between bursts

export const ENABLE_EATERY_INFINITE_SCROLL = true; // wire to your flag system
// Virtualization feature flag (Phase 3). Keep default false until implemented/verified
export const ENABLE_EATERY_VIRTUALIZATION = false;
export const IS_VIRTUAL_OVERSCAN = 6; // rows to render beyond viewport
export const IS_VIRTUAL_ACTIVATION_MIN_ITEMS = 200; // gate to avoid premature enablement

// Memory management constants
export const IS_MEMORY_CAP_ITEMS = 600; // Maximum items to retain in memory
export const IS_MEMORY_COMPACTION_THRESHOLD = 800; // Trigger compaction when exceeding this
export const IS_MEMORY_MONITORING_INTERVAL_MS = 30000; // Check memory every 30s

// Analytics budgets
export const IS_ANALYTICS_MAX_EVENTS = 120;
export const IS_ANALYTICS_MAX_ERRORS = 40;
export const IS_MAX_RETRY_EPISODES_PER_SESSION = 5;
