/**
 * Livemap Store Tests
 * 
 * Unit tests for store mutations and selectors.
 */

import { renderHook, act } from '@testing-library/react';
import { useLivemapStore, sel } from '@/lib/stores/livemap-store';
import type { Restaurant, Filters } from '@/types/livemap';

// Mock restaurant data
const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Test Restaurant 1',
    pos: { lat: 25.7617, lng: -80.1918 },
    rating: 4.5,
    kosher: 'MEAT',
    openNow: true,
    agencies: ['ORB'],
  },
  {
    id: '2', 
    name: 'Test Restaurant 2',
    pos: { lat: 25.7627, lng: -80.1928 },
    rating: 3.8,
    kosher: 'DAIRY',
    openNow: false,
    agencies: ['Kosher Miami'],
  },
];

describe('LivemapStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLivemapStore.setState({
      restaurants: [],
      filtered: [],
      selectedId: null,
      userLoc: null,
      favorites: new Set(),
      filters: {},
      loading: { restaurants: 'idle', location: 'idle' },
      error: null,
      map: { bounds: null, center: null, zoom: 12 },
    });
  });

  describe('Basic State Management', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      expect(result.current.restaurants).toEqual([]);
      expect(result.current.filtered).toEqual([]);
      expect(result.current.selectedId).toBeNull();
      expect(result.current.userLoc).toBeNull();
      expect(result.current.favorites.size).toBe(0);
      expect(result.current.filters).toEqual({});
    });

    it('should set restaurants', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      act(() => {
        result.current.setRestaurants(mockRestaurants);
      });
      
      expect(result.current.restaurants).toEqual(mockRestaurants);
    });

    it('should select restaurant', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      act(() => {
        result.current.setRestaurants(mockRestaurants);
        result.current.select('1');
      });
      
      expect(result.current.selectedId).toBe('1');
    });

    it('should toggle favorites', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      act(() => {
        result.current.toggleFavorite('1');
      });
      
      expect(result.current.favorites.has('1')).toBe(true);
      
      act(() => {
        result.current.toggleFavorite('1');
      });
      
      expect(result.current.favorites.has('1')).toBe(false);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      useLivemapStore.setState({
        restaurants: mockRestaurants,
        filtered: ['1', '2'],
        selectedId: '1',
        favorites: new Set(['1']),
      });
    });

    it('should return filtered IDs', () => {
      const { result } = renderHook(() => useLivemapStore(sel.filteredIds));
      expect(result.current).toEqual(['1', '2']);
    });

    it('should return restaurants by ID map', () => {
      const { result } = renderHook(() => useLivemapStore(sel.restaurantsById));
      
      expect(result.current.get('1')).toEqual(mockRestaurants[0]);
      expect(result.current.get('2')).toEqual(mockRestaurants[1]);
      expect(result.current.get('3')).toBeUndefined();
    });

    it('should return selected restaurant', () => {
      const { result } = renderHook(() => useLivemapStore(sel.selected));
      expect(result.current).toEqual(mockRestaurants[0]);
    });

    it('should return null for non-existent selected restaurant', () => {
      useLivemapStore.setState({ selectedId: '999' });
      
      const { result } = renderHook(() => useLivemapStore(sel.selected));
      expect(result.current).toBeNull();
    });
  });

  describe('Filter Management', () => {
    it('should set filters', () => {
      const { result } = renderHook(() => useLivemapStore());
      const filters: Filters = { kosher: ['MEAT'], openNow: true };
      
      act(() => {
        result.current.setFilters(filters);
      });
      
      expect(result.current.filters).toEqual(filters);
    });

    it('should update partial filters', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      act(() => {
        result.current.setFilters({ kosher: ['MEAT'] });
        result.current.setFilters({ openNow: true });
      });
      
      expect(result.current.filters).toEqual({
        kosher: ['MEAT'],
        openNow: true,
      });
    });

    it('should apply filter results', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      act(() => {
        result.current.applyFilterResults(['1', '2']);
      });
      
      expect(result.current.filtered).toEqual(['1', '2']);
    });
  });

  describe('Map State', () => {
    it('should update map state', () => {
      const { result } = renderHook(() => useLivemapStore());
      
      act(() => {
        result.current.setMap({
          center: { lat: 25.7617, lng: -80.1918 },
          zoom: 15,
        });
      });
      
      expect(result.current.map.center).toEqual({ lat: 25.7617, lng: -80.1918 });
      expect(result.current.map.zoom).toBe(15);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      const { result } = renderHook(() => {
        renderCount++;
        return useLivemapStore(sel.filteredIds);
      });
      
      // Initial render
      expect(renderCount).toBe(1);
      
      // Update unrelated state
      act(() => {
        useLivemapStore.setState({ userLoc: { lat: 25.7617, lng: -80.1918 } });
      });
      
      // Should not re-render because filteredIds didn't change
      expect(renderCount).toBe(1);
      
      // Update filtered state
      act(() => {
        useLivemapStore.setState({ filtered: ['1'] });
      });
      
      // Should re-render now
      expect(renderCount).toBe(2);
    });
  });
});
