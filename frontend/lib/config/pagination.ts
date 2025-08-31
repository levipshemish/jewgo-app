// Centralized pagination and grid sizing config
// Provides a single source of truth for page sizes

export const GRID_ROWS = 4;
export const MOBILE_COLUMNS = 2;

// Used when viewport isn’t ready yet (pre-hydration)
export const FALLBACK_GRID_ITEMS = GRID_ROWS * MOBILE_COLUMNS; // 8

// Admin tables and API pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Breakpoint-based column calculation matching existing UI expectations
export function columnsPerRowFromViewport(viewportWidth: number): number {
  if (viewportWidth >= 1441) return 8; // large desktop
  if (viewportWidth >= 1025) return 6; // desktop
  if (viewportWidth >= 769) return 4; // large tablet
  if (viewportWidth >= 641) return 3; // small tablet
  // Very small screens fall back to 2 columns via isMobile path.
  return 1;
}

// Compute items per page ensuring exactly GRID_ROWS rows.
export function itemsPerPageFromViewport(viewportWidth: number, isMobileLike: boolean): number {
  const columns = isMobileLike ? MOBILE_COLUMNS : columnsPerRowFromViewport(viewportWidth);
  return columns * GRID_ROWS;
}

