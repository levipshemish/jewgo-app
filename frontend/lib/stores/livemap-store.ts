/**
 * Livemap Store - Centralized State Management (PR-1)
 * 
 * 🔒 AUTHORITY MODEL:
 * - Store is the ONLY source of truth
 * - Map is a pure renderer (no business state)
 * - Workers are stateless functions
 * - URL → Store one-way on load, Store → URL only after
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Restaurant, MapState, LatLng, Id, LoadingState } from '@/types/livemap';
import type { AppliedFilters } from '@/lib/filters/filters.types';

interface LivemapState {
  // Data
  restaurants: Restaurant[];          // raw cache for current viewport
  filtered: Id[];                     // derived ids for render, not objects
  selectedId: Id | null;

  // User
  userLoc: LatLng | null;
  favorites: Set<Id>;

  // Filters / UI
  filters: AppliedFilters;
  loading: { restaurants: LoadingState; location: LoadingState };
  error: string | null;

  // Map
  map: MapState;

  // Actions (NO side-effects here except store ops)
  setMap: (s: Partial<MapState>) => void;
  setFilters: (f: Partial<AppliedFilters>) => void;
  setRestaurants: (rs: Restaurant[]) => void;
  select: (id: Id | null) => void;
  toggleFavorite: (id: Id) => void;

  // Computed updaters triggered by services
  applyFilterResults: (ids: Id[]) => void;
}

export const useLivemapStore = create<LivemapState>()(
  devtools(
    subscribeWithSelector((set, _get) => ({
      restaurants: [],
      filtered: [],
      selectedId: null,
      userLoc: null,
      favorites: new Set(),
      filters: {},
      loading: { restaurants: "idle", location: "idle" },
      error: null,
      map: { bounds: null, center: null, zoom: 12 },

      setMap: (s) => set((st) => ({ map: { ...st.map, ...s } })),
      setFilters: (f) => set((st) => ({ filters: { ...st.filters, ...f } })),
      setRestaurants: (rs) => set(() => ({ restaurants: rs })),
      select: (id) => set(() => ({ selectedId: id })),
      toggleFavorite: (id) =>
        set((st) => {
          const fav = new Set(st.favorites);
          if (fav.has(id)) {
            fav.delete(id);
          } else {
            fav.add(id);
          }
          return { favorites: fav };
        }),
      applyFilterResults: (ids) => set(() => ({ filtered: ids })),
    }))
  )
);

// 🔒 Selectors (use these everywhere—never read raw state in components)
export const sel = {
  filteredIds: (s: LivemapState) => s.filtered,
  restaurantsById: (s: LivemapState) => s.restaurants, // Return array directly, let components handle mapping
  selected: (s: LivemapState) =>
    s.selectedId ? s.restaurants.find((r) => r.id === s.selectedId) ?? null : null,
  userLocation: (s: LivemapState) => s.userLoc,
  favorites: (s: LivemapState) => s.favorites,
  filters: (s: LivemapState) => s.filters,
  loading: (s: LivemapState) => s.loading,
  error: (s: LivemapState) => s.error,
  map: (s: LivemapState) => s.map,
};

// Convenience hooks for common selectors
export const useFilteredIds = () => useLivemapStore(sel.filteredIds);
export const useRestaurantsById = () => useLivemapStore(sel.restaurantsById);
export const useSelected = () => useLivemapStore(sel.selected);
export const useUserLocation = () => useLivemapStore(sel.userLocation);
export const useFavorites = () => useLivemapStore(sel.favorites);
export const useFilters = () => useLivemapStore(sel.filters);
export const useLoading = () => useLivemapStore(sel.loading);
export const useError = () => useLivemapStore(sel.error);
export const useMap = () => useLivemapStore(sel.map);

// Actions
export const useLivemapActions = () => useLivemapStore((state) => ({
  setMap: state.setMap,
  setFilters: state.setFilters,
  setRestaurants: state.setRestaurants,
  select: state.select,
  toggleFavorite: state.toggleFavorite,
  applyFilterResults: state.applyFilterResults,
}));
