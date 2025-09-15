/**
 * Worker Manager - Stateless, Cancellable
 * 
 * Manages Web Worker communication for heavy filtering operations.
 */

import { useLivemapStore } from "@/lib/stores/livemap-store";
import { makeWorker } from "@/lib/workers/makeWorker";
import type { WorkRequest, WorkResponse } from "@/workers/protocol";
import type { AppliedFilters } from "@/lib/filters/filters.types";
import { getCanonicalDistance } from "@/lib/utils/filterValidation";

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

// Synchronous filtering function - now uses the same comprehensive filter schema as eatery page
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
    // Search query filter (q) - comprehensive search across multiple fields
    if (filters.q) {
      const query = filters.q.toLowerCase().trim();
      const name = restaurant.name?.toLowerCase() || '';
      const address = restaurant.address?.toLowerCase() || '';
      const city = restaurant.city?.toLowerCase() || '';
      const state = restaurant.state?.toLowerCase() || '';
      const listingType = restaurant.listing_type?.toLowerCase() || '';
      const certifyingAgency = restaurant.certifying_agency?.toLowerCase() || '';
      
      if (!name.includes(query) && 
          !address.includes(query) && 
          !city.includes(query) && 
          !state.includes(query) && 
          !listingType.includes(query) && 
          !certifyingAgency.includes(query)) {
        return false;
      }
    }
    
    // Agency filter
    if (filters.agency) {
      const certifyingAgency = restaurant.certifying_agency?.toLowerCase() || '';
      if (!certifyingAgency.includes(filters.agency.toLowerCase())) {
        return false;
      }
    }
    
    // Dietary filter - supports multiple dietary preferences
    if (filters.dietary && filters.dietary.length > 0) {
      const kosherCategory = restaurant.kosher_category?.toLowerCase() || '';
      const matchesDietary = filters.dietary.some(dietary => {
        switch (dietary.toLowerCase()) {
          case 'meat': return kosherCategory === 'meat';
          case 'dairy': return kosherCategory === 'dairy';
          case 'pareve': return kosherCategory === 'pareve';
          default: return true;
        }
      });
      if (!matchesDietary) {
        return false;
      }
    }
    
    // Category filter (listing_type)
    if (filters.category) {
      const listingType = restaurant.listing_type?.toLowerCase() || '';
      if (!listingType.includes(filters.category.toLowerCase())) {
        return false;
      }
    }
    
    // Business types filter
    if (filters.businessTypes && filters.businessTypes.length > 0) {
      const listingType = restaurant.listing_type?.toLowerCase() || '';
      const matchesBusinessType = filters.businessTypes.some(businessType => 
        listingType.includes(businessType.toLowerCase())
      );
      if (!matchesBusinessType) {
        return false;
      }
    }
    
    // Open now filter
    if (filters.openNow && restaurant.is_open !== undefined) {
      if (!restaurant.is_open) {
        return false;
      }
    }
    
    // Hours filter - time-based filtering
    if (filters.hoursFilter) {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      
      switch (filters.hoursFilter) {
        case 'openNow':
          if (restaurant.is_open !== undefined && !restaurant.is_open) {
            return false;
          }
          break;
        case 'morning':
          if (currentHour < 6 || currentHour >= 12) {
            return false;
          }
          break;
        case 'afternoon':
          if (currentHour < 12 || currentHour >= 18) {
            return false;
          }
          break;
        case 'evening':
          if (currentHour < 18 || currentHour >= 22) {
            return false;
          }
          break;
        case 'lateNight':
          if (currentHour < 22 && currentHour >= 6) {
            return false;
          }
          break;
      }
    }
    
    // Rating filter
    if (filters.ratingMin) {
      const rating = restaurant.google_rating || restaurant.rating || restaurant.quality_rating || 0;
      if (rating < filters.ratingMin) {
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
    
    // Kosher details filter
    if (filters.kosherDetails) {
      const kosherDetails = restaurant.kosher_details?.toLowerCase() || '';
      if (!kosherDetails.includes(filters.kosherDetails.toLowerCase())) {
        return false;
      }
    }
    
    // Distance filter (if user location available)
    const distanceMi = getCanonicalDistance(filters);
    if (distanceMi && userLoc) {
      const distance = calculateDistance(userLoc, restaurant.pos);
      if (distance > distanceMi) {
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
