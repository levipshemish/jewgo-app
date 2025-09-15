/**
 * URL Synchronization Service
 * 
 * Handles bidirectional sync between URL and store state.
 * - One-time URL → Store hydrate on load
 * - Store → URL synchronization (replaceState)
 * - Only syncs specific filter fields to keep URLs clean
 */

import { useLivemapStore } from '@/lib/stores/livemap-store';
import type { LatLng } from '@/types/livemap';
import type { AppliedFilters } from '@/lib/filters/filters.types';

// URL-synced fields (subset of filters)
const URL_SYNC_FIELDS = [
  'q',
  'dietary', 
  'agency',
  'ratingMin',
  'maxDistanceMi'
] as const;

type URLSyncableFilters = Pick<AppliedFilters, typeof URL_SYNC_FIELDS[number]>;

// URL parameter names
const URL_PARAMS = {
  q: 'q',
  dietary: 'k',
  agency: 'a',
  ratingMin: 'r',
  maxDistanceMi: 'd',
  center: 'c',
  zoom: 'z',
} as const;

/**
 * Initialize URL synchronization
 * Call this once on app load
 */
export function initializeURLSync(): void {
  // Hydrate store from URL on load
  hydrateStoreFromURL();
  
  // Subscribe to store changes for URL updates
  subscribeToStoreChanges();
}

/**
 * Hydrate store from URL parameters
 */
function hydrateStoreFromURL(): void {
  // Handle SSR - skip hydration if window is not available
  if (typeof window === 'undefined') {
    return;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const filters: Partial<URLSyncableFilters> = {};
  
  // Parse filter parameters
  if (urlParams.has(URL_PARAMS.q)) {
    filters.q = urlParams.get(URL_PARAMS.q) || undefined;
  }
  
  if (urlParams.has(URL_PARAMS.dietary)) {
    const dietaryParam = urlParams.get(URL_PARAMS.dietary);
    if (dietaryParam) {
      filters.dietary = dietaryParam.split(',').filter(k => 
        ['MEAT', 'DAIRY', 'PAREVE'].includes(k)
      );
    }
  }
  
  if (urlParams.has(URL_PARAMS.agency)) {
    const agencyParam = urlParams.get(URL_PARAMS.agency);
    if (agencyParam) {
      filters.agency = agencyParam;
    }
  }
  
  if (urlParams.has(URL_PARAMS.ratingMin)) {
    const rating = parseFloat(urlParams.get(URL_PARAMS.ratingMin) || '0');
    if (rating > 0) {
      filters.ratingMin = rating;
    }
  }
  
  if (urlParams.has(URL_PARAMS.maxDistanceMi)) {
    const distance = parseFloat(urlParams.get(URL_PARAMS.maxDistanceMi) || '0');
    if (distance > 0) {
      filters.maxDistanceMi = distance;
    }
  }
  
  // Parse map state
  let center: LatLng | null = null;
  let zoom: number | null = null;
  
  if (urlParams.has(URL_PARAMS.center)) {
    const centerParam = urlParams.get(URL_PARAMS.center);
    if (centerParam) {
      const [lat, lng] = centerParam.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        center = { lat, lng };
      }
    }
  }
  
  if (urlParams.has(URL_PARAMS.zoom)) {
    const zoomParam = urlParams.get(URL_PARAMS.zoom);
    if (zoomParam) {
      const zoomValue = parseInt(zoomParam, 10);
      if (!isNaN(zoomValue) && zoomValue > 0) {
        zoom = zoomValue;
      }
    }
  }
  
  // Update store with URL data
  const store = useLivemapStore.getState();
  
  if (Object.keys(filters).length > 0) {
    store.setFilters(filters);
  }
  
  if (center || zoom !== null) {
    store.setMap({
      center: center || store.map.center,
      zoom: zoom || store.map.zoom,
    });
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 URL → Store hydrated:', { filters, center, zoom });
  }
}

/**
 * Subscribe to store changes and update URL
 */
function subscribeToStoreChanges(): void {
  const isUpdating = false;
  
  useLivemapStore.subscribe(
    (state) => ({
      filters: state.filters,
      map: state.map,
    }),
    (newState, prevState) => {
      // Prevent infinite loops
      if (isUpdating) return;
      
      // Check if URL-synced fields changed
      const filtersChanged = URL_SYNC_FIELDS.some(field => 
        newState.filters[field] !== prevState.filters[field]
      );
      
      const mapChanged = 
        newState.map.center !== prevState.map.center ||
        newState.map.zoom !== prevState.map.zoom;
      
      if (filtersChanged || mapChanged) {
        updateURLFromStore(newState);
      }
    }
  );
}

/**
 * Update URL from store state
 */
function updateURLFromStore(state: {
  filters: AppliedFilters;
  map: { center: LatLng | null; zoom: number };
}): void {
  // Handle SSR - skip URL update if window is not available
  if (typeof window === 'undefined') {
    return;
  }
  
  const urlParams = new URLSearchParams();
  
  // Add filter parameters
  if (state.filters.q) {
    urlParams.set(URL_PARAMS.q, state.filters.q);
  }
  
  if (state.filters.dietary && state.filters.dietary.length > 0) {
    urlParams.set(URL_PARAMS.dietary, state.filters.dietary.join(','));
  }
  
  if (state.filters.agency) {
    urlParams.set(URL_PARAMS.agency, state.filters.agency);
  }
  
  if (state.filters.ratingMin && state.filters.ratingMin > 0) {
    urlParams.set(URL_PARAMS.ratingMin, state.filters.ratingMin.toString());
  }
  
  if (state.filters.maxDistanceMi && state.filters.maxDistanceMi > 0) {
    urlParams.set(URL_PARAMS.maxDistanceMi, state.filters.maxDistanceMi.toString());
  }
  
  // Add map parameters
  if (state.map.center) {
    urlParams.set(URL_PARAMS.center, `${state.map.center.lat},${state.map.center.lng}`);
  }
  
  if (state.map.zoom && state.map.zoom !== 12) { // Don't sync default zoom
    urlParams.set(URL_PARAMS.zoom, state.map.zoom.toString());
  }
  
  // Update URL without page reload
  const newURL = urlParams.toString() 
    ? `${window.location.pathname}?${urlParams.toString()}`
    : window.location.pathname;
  
  window.history.replaceState({}, '', newURL);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Store → URL updated:', newURL);
  }
}

/**
 * Get current URL state for debugging
 */
export function getURLState(): {
  filters: URLSyncableFilters;
  map: { center: LatLng | null; zoom: number | null };
} {
  // Handle SSR - return empty state if window is not available
  if (typeof window === 'undefined') {
    return {
      filters: {},
      map: { center: null, zoom: null }
    };
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  
  const filters: URLSyncableFilters = {};
  
  if (urlParams.has(URL_PARAMS.q)) {
    filters.q = urlParams.get(URL_PARAMS.q) || undefined;
  }
  
  if (urlParams.has(URL_PARAMS.dietary)) {
    const dietaryParam = urlParams.get(URL_PARAMS.dietary);
    if (dietaryParam) {
      filters.dietary = dietaryParam.split(',').filter(k => 
        ['MEAT', 'DAIRY', 'PAREVE'].includes(k)
      );
    }
  }
  
  if (urlParams.has(URL_PARAMS.agency)) {
    const agencyParam = urlParams.get(URL_PARAMS.agency);
    if (agencyParam) {
      filters.agency = agencyParam;
    }
  }
  
  if (urlParams.has(URL_PARAMS.ratingMin)) {
    const rating = parseFloat(urlParams.get(URL_PARAMS.ratingMin) || '0');
    if (rating > 0) {
      filters.ratingMin = rating;
    }
  }
  
  if (urlParams.has(URL_PARAMS.maxDistanceMi)) {
    const distance = parseFloat(urlParams.get(URL_PARAMS.maxDistanceMi) || '0');
    if (distance > 0) {
      filters.maxDistanceMi = distance;
    }
  }
  
  let center: LatLng | null = null;
  let zoom: number | null = null;
  
  if (urlParams.has(URL_PARAMS.center)) {
    const centerParam = urlParams.get(URL_PARAMS.center);
    if (centerParam) {
      const [lat, lng] = centerParam.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        center = { lat, lng };
      }
    }
  }
  
  if (urlParams.has(URL_PARAMS.zoom)) {
    const zoomParam = urlParams.get(URL_PARAMS.zoom);
    if (zoomParam) {
      const zoomValue = parseInt(zoomParam, 10);
      if (!isNaN(zoomValue) && zoomValue > 0) {
        zoom = zoomValue;
      }
    }
  }
  
  return { filters, map: { center, zoom } };
}
