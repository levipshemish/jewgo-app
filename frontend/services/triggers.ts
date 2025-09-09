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

// Performance limits
const BOUNDS_DEBOUNCE_MS = 250;
const FILTER_DEBOUNCE_MS = 150;

// Debounced bounds change handler
export const onBoundsChanged = debounce((bounds: Bounds) => {
  useLivemapStore.getState().setMap({ bounds });
  loadRestaurantsInBounds(bounds).then(() => runFilter());
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
