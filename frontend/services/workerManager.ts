/**
 * Worker Manager - Stateless, Cancellable
 * 
 * Manages Web Worker communication for heavy filtering operations.
 */

import { useLivemapStore } from "@/lib/stores/livemap-store";
import { makeWorker } from "@/lib/workers/makeWorker";
import type { WorkRequest, WorkResponse } from "@/workers/protocol";
import type { AppliedFilters } from "@/lib/filters/filters.types";

// Performance limits
const MAX_VISIBLE = 200;
const _CLUSTER_WHEN = 60;

// Worker instance
const worker = makeWorker<WorkRequest, WorkResponse>(
  new URL("@/workers/livemap.worker.ts", import.meta.url)
);

// Performance tracking
let filterCount = 0;
let totalFilterTime = 0;

export function runFilter(maxVisible: number = MAX_VISIBLE): void {
  const state = useLivemapStore.getState();
  
  // Temporarily do synchronous filtering to avoid worker issues
  const startTime = performance.now();
  filterCount++;

  try {
    const filteredIds = performSynchronousFilter(
      state.restaurants,
      state.filters,
      state.userLoc,
      maxVisible
    );

    const filterTime = performance.now() - startTime;
    totalFilterTime += filterTime;

    useLivemapStore.getState().applyFilterResults(filteredIds);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Filtered to ${filteredIds.length} restaurants in ${filterTime.toFixed(1)}ms (sync)`);
    }
  } catch (error: any) {
    console.error('Filter error:', error);
    useLivemapStore.setState((_s) => ({ 
      error: `Filter error: ${error?.message || 'Unknown error'}` 
    }));
  }
}

// Synchronous filtering function - now uses the same filter schema as eatery page
function performSynchronousFilter(
  restaurants: any[],
  filters: AppliedFilters,
  userLoc: any,
  maxVisible: number
): string[] {
  if (!restaurants || !Array.isArray(restaurants)) {
    return [];
  }

  let filtered = restaurants.filter(restaurant => {
    // Search query filter (q)
    if (filters.q) {
      const query = filters.q.toLowerCase();
      if (!restaurant.name.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Agency filter
    if (filters.agency) {
      if (!restaurant.agencies || !restaurant.agencies.includes(filters.agency)) {
        return false;
      }
    }
    
    // Category filter (kosher_category)
    if (filters.category) {
      if (restaurant.kosher !== filters.category.toUpperCase()) {
        return false;
      }
    }
    
    // Open now filter
    if (filters.openNow && restaurant.openNow !== undefined) {
      if (!restaurant.openNow) {
        return false;
      }
    }
    
    // Rating filter
    if (filters.ratingMin && restaurant.rating !== undefined) {
      if (restaurant.rating < filters.ratingMin) {
        return false;
      }
    }
    
    // Price range filter
    if (filters.priceRange && restaurant.price_range !== undefined) {
      const [minPrice, maxPrice] = filters.priceRange;
      if (restaurant.price_range < minPrice || restaurant.price_range > maxPrice) {
        return false;
      }
    }
    
    // Distance filter (if user location available)
    if (filters.distanceMi && userLoc) {
      const distance = calculateDistance(userLoc, restaurant.pos);
      if (distance > filters.distanceMi) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort by distance if user location available
  if (userLoc) {
    filtered = filtered.sort((a, b) => {
      const distA = calculateDistance(userLoc, a.pos);
      const distB = calculateDistance(userLoc, b.pos);
      return distA - distB;
    });
  }
  
  // Apply performance limits
  const maxVisibleLimit = Math.min(maxVisible, MAX_VISIBLE);
  if (filtered.length > maxVisibleLimit) {
    filtered = filtered.slice(0, maxVisibleLimit);
  }
  
  return filtered.map(r => r.id);
}

// Distance calculation function
function calculateDistance(point1: any, point2: any): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function runDistanceSort(ids: string[], userLocation: { lat: number; lng: number }): void {
  // Temporarily do synchronous sorting to avoid worker issues
  const startTime = performance.now();

  try {
    const state = useLivemapStore.getState();
    const restaurants = state.restaurants;
    
    // Get restaurant objects for the given IDs
    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));
    const restaurantObjects = ids
      .map(id => restaurantMap.get(id))
      .filter(Boolean);

    // Sort by distance
    const sorted = restaurantObjects.sort((a, b) => {
      if (!a || !b) return 0;
      const distA = calculateDistance(userLocation, a.pos);
      const distB = calculateDistance(userLocation, b.pos);
      return distA - distB;
    });

    const sortedIds = sorted.map(r => r?.id).filter(Boolean) as string[];
    const sortTime = performance.now() - startTime;

    useLivemapStore.getState().applyFilterResults(sortedIds);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Sorted ${sortedIds.length} restaurants by distance in ${sortTime.toFixed(1)}ms (sync)`);
    }
  } catch (error: any) {
    console.error('Sort error:', error);
  }
}

// Performance monitoring
export function getFilterStats() {
  return {
    filterCount,
    totalFilterTime,
    averageFilterTime: filterCount > 0 ? totalFilterTime / filterCount : 0,
  };
}

export function resetFilterStats(): void {
  filterCount = 0;
  totalFilterTime = 0;
}

// Cleanup
export function terminateWorker(): void {
  worker.terminate();
}
