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
// Tailwind-like breakpoints for consistent grid behavior
// <640: mobile baseline handled by MOBILE_COLUMNS
// >=640 (sm): 3 cols, >=768 (md): 4 cols, >=1024 (lg): 4 cols, >=1280 (xl): 6 cols, >=1536 (2xl): 8 cols
export function columnsPerRowFromViewport(viewportWidth: number): number {
  if (viewportWidth >= 1536) return 8; // 2xl
  if (viewportWidth >= 1280) return 6; // xl
  if (viewportWidth >= 1024) return 4; // lg
  if (viewportWidth >= 768)  return 4; // md
  if (viewportWidth >= 640)  return 3; // sm
  return 2; // xs
}

// Compute items per page ensuring exactly GRID_ROWS rows.
// Upper bound for cards per page regardless of columns x rows
export const MAX_GRID_ITEMS_PER_PAGE = 50;

export function itemsPerPageFromViewport(viewportWidth: number, isMobileLike: boolean): number {
  const columns = isMobileLike ? MOBILE_COLUMNS : columnsPerRowFromViewport(viewportWidth);
  const target = columns * GRID_ROWS;
  return Math.min(MAX_GRID_ITEMS_PER_PAGE, target);
}
