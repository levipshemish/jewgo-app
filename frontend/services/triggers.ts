/**
 * Debounced Triggers
 * 
 * Centralized debounced event handlers that coordinate between services.
 */

import { useLivemapStore } from "@/lib/stores/livemap-store";
import { debounce } from "@/lib/debounce";
import { loadRestaurantsInBounds } from "./dataManager";
import { runFilter } from "./workerManager";
import type { Bounds } from "@/types/livemap";

// Performance limits - increased debounce times to reduce API calls
const BOUNDS_DEBOUNCE_MS = 2000; // Increased to 2s to prevent rate limiting
const FILTER_DEBOUNCE_MS = 500;  // Increased to 500ms

// Debounced bounds change handler
export const onBoundsChanged = debounce((bounds: Bounds) => {
  useLivemapStore.getState().setMap({ bounds });
  // Load restaurants for new bounds - filtering will be handled by the data loading
  loadRestaurantsInBounds(bounds);
}, BOUNDS_DEBOUNCE_MS);

// Debounced filter change handler
export const onFiltersChanged = debounce(() => {
  runFilter();
}, FILTER_DEBOUNCE_MS);

// Debounced search handler
export const onSearchChanged = debounce((query: string) => {
  useLivemapStore.getState().setFilters({ query });
  runFilter();
}, FILTER_DEBOUNCE_MS);
