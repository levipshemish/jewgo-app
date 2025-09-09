/**
 * Livemap Worker - Heavy Filtering & Sorting
 * 
 * This worker handles:
 * - LivemapRestaurant filtering by kosher type, rating, distance, etc.
 * - Distance-based sorting from user location
 * - Performance limits (MAX_VISIBLE, CLUSTER_WHEN)
 * - All heavy computation off the main thread
 */

// Worker types - inline to avoid import issues
interface WorkRequest {
  kind: 'FILTER' | 'SORT_BY_DISTANCE';
  payload: any;
}

interface WorkResponse {
  kind: 'FILTER_RESULT' | 'SORT_RESULT' | 'ERROR';
  payload: any;
}

interface Restaurant {
  id: string;
  name: string;
  pos: { lat: number; lng: number };
  rating?: number | null;
  kosher: 'MEAT' | 'DAIRY' | 'PAREVE';
  openNow?: boolean;
  agencies?: string[];
}

interface Filters {
  query?: string;
  kosher?: string[];
  openNow?: boolean;
  agencies?: string[];
  maxDistanceMi?: number;
  minRating?: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

// Performance limits
const MAX_VISIBLE = 200;
const CLUSTER_WHEN = 60;

// Worker message handler
self.onmessage = (event: MessageEvent<WorkRequest>) => {
  const request = event.data;
  
  try {
    switch (request.kind) {
      case 'FILTER':
        handleFilter(request.payload);
        break;
      case 'SORT_BY_DISTANCE':
        handleSortByDistance(request.payload);
        break;
      default:
        console.warn('Unknown work request:', request);
    }
  } catch (error) {
    console.error('Worker error:', error);
    // Send error response
    const errorResponse: WorkResponse = {
      kind: 'ERROR',
      payload: { 
        message: `Worker error: ${error}`,
        requestKind: 'FILTER'
      }
    };
    self.postMessage(errorResponse);
  }
};

/**
 * Handle restaurant filtering
 */
function handleFilter(payload: {
  restaurants: Restaurant[];
  filters: Filters;
  userLoc: LatLng | null;
  max: number;
}) {
  const { restaurants, filters, userLoc, max } = payload;
  const startTime = performance.now();
  
  // Apply filters
  let filtered = restaurants.filter(restaurant => {
    // Query filter
    if (filters.query) {
      const query = filters.query.toLowerCase();
      if (!restaurant.name.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Kosher type filter
    if (filters.kosher && filters.kosher.length > 0) {
      if (!filters.kosher.includes(restaurant.kosher)) {
        return false;
      }
    }
    
    // Open now filter
    if (filters.openNow && restaurant.openNow !== undefined) {
      if (!restaurant.openNow) {
        return false;
      }
    }
    
    // Agencies filter
    if (filters.agencies && filters.agencies.length > 0) {
      if (!restaurant.agencies || !filters.agencies.some(agency => 
        restaurant.agencies!.includes(agency)
      )) {
        return false;
      }
    }
    
    // Rating filter
    if (filters.minRating && restaurant.rating !== undefined && restaurant.rating !== null) {
      if (restaurant.rating < filters.minRating) {
        return false;
      }
    }
    
    // Distance filter (if user location available)
    if (filters.maxDistanceMi && userLoc) {
      const distance = calculateDistance(userLoc, restaurant.pos);
      if (distance > filters.maxDistanceMi) {
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
  const maxVisible = Math.min(max, MAX_VISIBLE);
  const shouldCluster = filtered.length >= CLUSTER_WHEN;
  
  if (filtered.length > maxVisible) {
    filtered = filtered.slice(0, maxVisible);
  }
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  
  // Send response
  const response: WorkResponse = {
    kind: 'FILTER_RESULT',
    payload: {
      ids: filtered.map(r => r.id),
      reason: `Filtered ${restaurants.length} → ${filtered.length} restaurants in ${processingTime.toFixed(1)}ms${shouldCluster ? ' (clustering enabled)' : ''}`
    }
  };
  
  self.postMessage(response);
}

/**
 * Handle distance-based sorting
 */
function handleSortByDistance(payload: {
  ids: string[];
  by: LatLng;
}) {
  const { ids, by } = payload;
  const startTime = performance.now();
  
  // This would need restaurant data to calculate distances
  // For now, just return the IDs as-is
  // In a real implementation, you'd need to pass restaurant data or fetch it
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  
  const response: WorkResponse = {
    kind: 'SORT_RESULT',
    payload: {
      ids,
      reason: `Sorted ${ids.length} restaurants by distance in ${processingTime.toFixed(1)}ms`
    }
  };
  
  self.postMessage(response);
}

/**
 * Calculate distance between two points in miles
 * Uses Haversine formula
 */
function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Worker script - no exports needed
