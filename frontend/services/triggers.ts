/**
 * Debounced Triggers
 * 
 * Centralized debounced event handlers that coordinate between services.
 */

import { useLivemapStore } from "@/lib/stores/livemap-store";
import { debounce } from "@/lib/debounce";
import { loadRestaurantsInBounds } from "./dataManager";
import type { Bounds } from "@/types/livemap";
import type { AppliedFilters } from "@/lib/filters/filters.types";

// Performance limits - simple debounce times
const BOUNDS_DEBOUNCE_MS = 300; // 300ms - simple debounce
const FILTER_DEBOUNCE_MS = 200;  // 200ms for filtering

// Debounced bounds change handler
export const onBoundsChanged = debounce((bounds: Bounds, activeFilters?: AppliedFilters) => {
  useLivemapStore.getState().setMap({ bounds });
  // Load restaurants for new bounds - filtering will be handled by the data loading
  loadRestaurantsInBounds(bounds, activeFilters);
}, BOUNDS_DEBOUNCE_MS);

// Immediate bounds change handler for initial load (no debounce)
export const onBoundsChangedImmediate = (bounds: Bounds, activeFilters?: AppliedFilters) => {
  useLivemapStore.getState().setMap({ bounds });
  // Load restaurants for new bounds immediately
  loadRestaurantsInBounds(bounds, activeFilters);
};

// Debounced filter change handler - now reloads data with server-side filtering
export const onFiltersChanged = debounce((filters: AppliedFilters) => {
  useLivemapStore.getState().setFilters(filters);
  const state = useLivemapStore.getState();
  if (state.map.bounds) {
    // Reload data with new filters (server-side filtering)
    loadRestaurantsInBounds(state.map.bounds, filters).then(() => {
      // After reloading, set all restaurants as filtered (server already filtered them)
      const allRestaurantIds = state.restaurants.map(r => r.id);
      useLivemapStore.getState().applyFilterResults(allRestaurantIds);
    });
  }
}, FILTER_DEBOUNCE_MS);

// Debounced search handler - now reloads data with server-side filtering
export const onSearchChanged = debounce((query: string) => {
  const filters = { q: query };
  useLivemapStore.getState().setFilters(filters);
  const state = useLivemapStore.getState();
  if (state.map.bounds) {
    // Reload data with new filters (server-side filtering)
    loadRestaurantsInBounds(state.map.bounds, filters).then(() => {
      // After reloading, set all restaurants as filtered (server already filtered them)
      const allRestaurantIds = state.restaurants.map(r => r.id);
      useLivemapStore.getState().applyFilterResults(allRestaurantIds);
    });
  }
}, FILTER_DEBOUNCE_MS);
