/**
 * Data Manager - Viewport-keyed Cache + TTL
 * 
 * Manages restaurant data loading with intelligent caching and performance limits.
 */

import { useLivemapStore } from "@/lib/stores/livemap-store";
// import { PERFORMANCE_LIMITS } from "@/types/livemap";
import type { Restaurant, Bounds } from "@/types/livemap";
import { fetchRestaurants as apiFetchRestaurants } from "@/lib/api/restaurants";
import type { AppliedFilters } from "@/lib/filters/filters.types";

// Cache with TTL
const cache = new Map<string, { ts: number; data: Restaurant[] }>();
const TTL = 5 * 60 * 1000; // 5 minutes

// Track loaded restaurants to prevent duplicate API calls (with size limits)
const loadedRestaurants = new Set<string>(); // Set of restaurant IDs
const restaurantCache = new Map<string, Restaurant>(); // Individual restaurant cache
const MAX_RESTAURANT_CACHE_SIZE = 5000; // Increased limit for better coverage

// Maximum bounds size to prevent excessive API calls
const MAX_BOUNDS_DEGREES = 25.0; // ~2500km max bounds (increased for zoom out)
const EXTREME_BOUNDS_DEGREES = 90.0; // ~9000km - truly extreme bounds (increased for zoom out)

// Check if bounds are too large for normal API calls
function isBoundsTooLarge(bounds: Bounds): boolean {
  const { ne, sw } = bounds;
  const latDiff = Math.abs(ne.lat - sw.lat);
  const lngDiff = Math.abs(ne.lng - sw.lng);
  return latDiff > MAX_BOUNDS_DEGREES || lngDiff > MAX_BOUNDS_DEGREES;
}

// Check if bounds are extremely large (should be blocked entirely)
function isBoundsExtremelyLarge(bounds: Bounds): boolean {
  const { ne, sw } = bounds;
  const latDiff = Math.abs(ne.lat - sw.lat);
  const lngDiff = Math.abs(ne.lng - sw.lng);
  return latDiff > EXTREME_BOUNDS_DEGREES || lngDiff > EXTREME_BOUNDS_DEGREES;
}

// Check if we already have a restaurant loaded
function isRestaurantLoaded(restaurantId: string): boolean {
  return loadedRestaurants.has(restaurantId);
}

// Add restaurant to loaded set and cache (with size limits)
function addLoadedRestaurant(restaurant: Restaurant): void {
  loadedRestaurants.add(restaurant.id);
  
  // Only cache if we haven't exceeded the limit
  if (restaurantCache.size < MAX_RESTAURANT_CACHE_SIZE) {
    restaurantCache.set(restaurant.id, restaurant);
  } else {
    // If cache is full, remove oldest entries (simple FIFO)
    const firstKey = restaurantCache.keys().next().value;
    if (firstKey) {
      restaurantCache.delete(firstKey);
      restaurantCache.set(restaurant.id, restaurant);
    }
  }
}

// Get restaurant from cache if available
function getCachedRestaurant(restaurantId: string): Restaurant | null {
  return restaurantCache.get(restaurantId) || null;
}


// Get restaurants from cache that are within the bounds (optimized)
function getCachedRestaurantsInBounds(bounds: Bounds): Restaurant[] {
  // Only check if we have a reasonable number of cached restaurants for performance
  if (restaurantCache.size > 200) {
    // Too many restaurants to check efficiently, skip this optimization
    return [];
  }
  
  const restaurants: Restaurant[] = [];
  for (const restaurant of restaurantCache.values()) {
    const lat = restaurant.pos.lat;
    const lng = restaurant.pos.lng;
    if (lat >= bounds.sw.lat && lat <= bounds.ne.lat &&
        lng >= bounds.sw.lng && lng <= bounds.ne.lng) {
      restaurants.push(restaurant);
    }
  }
  return restaurants;
}

// Generate cache key from bounds with quantization for better caching
function hashBounds(bounds: Bounds): string {
  const { ne, sw } = bounds;
  
  // Quantize bounds to 0.01 degree grid (~1km) for better cache hits
  const quantize = (coord: number) => Math.round(coord * 100) / 100;
  
  const neLat = quantize(ne.lat);
  const neLng = quantize(ne.lng);
  const swLat = quantize(sw.lat);
  const swLng = quantize(sw.lng);
  
  return `${neLat},${neLng}-${swLat},${swLng}`;
}

// Performance monitoring
let fetchCount = 0;
let cacheHits = 0;

// Simple rate limiting - just prevent rapid fire requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms minimum between requests

// Track initial load state
let isInitialLoad = true;
let initialLoadStartTime = Date.now();

// Find overlapping cached data that covers the requested bounds
function findOverlappingCache(requestedBounds: Bounds): Restaurant[] | null {
  const now = Date.now();
  
  for (const [cacheKey, cacheEntry] of cache.entries()) {
    if (now - cacheEntry.ts >= TTL) continue;
    
    // Parse cached bounds from key
    const [neStr, swStr] = cacheKey.split('-');
    const [neLat, neLng] = neStr.split(',').map(Number);
    const [swLat, swLng] = swStr.split(',').map(Number);
    
    const cachedBounds = {
      ne: { lat: neLat, lng: neLng },
      sw: { lat: swLat, lng: swLng }
    };
    
    // Check if cached bounds completely cover the requested bounds
    // Only use overlapping cache if the cached area is significantly larger than requested
    const cachedArea = (cachedBounds.ne.lat - cachedBounds.sw.lat) * (cachedBounds.ne.lng - cachedBounds.sw.lng);
    const requestedArea = (requestedBounds.ne.lat - requestedBounds.sw.lat) * (requestedBounds.ne.lng - requestedBounds.sw.lng);
    const coverageRatio = cachedArea / requestedArea;
    
    if (cachedBounds.ne.lat >= requestedBounds.ne.lat &&
        cachedBounds.ne.lng >= requestedBounds.ne.lng &&
        cachedBounds.sw.lat <= requestedBounds.sw.lat &&
        cachedBounds.sw.lng <= requestedBounds.sw.lng &&
        coverageRatio > 2.0) { // Only use if cached area is at least 2x larger (much more aggressive)
      return cacheEntry.data;
    }
  }
  
  return null;
}

// Expand bounds to get more data and improve caching
function expandBounds(bounds: Bounds, factor: number = 1.5): Bounds {
  const latSpan = bounds.ne.lat - bounds.sw.lat;
  const lngSpan = bounds.ne.lng - bounds.sw.lng;
  
  const latExpansion = (latSpan * factor - latSpan) / 2;
  const lngExpansion = (lngSpan * factor - lngSpan) / 2;
  
  return {
    ne: {
      lat: bounds.ne.lat + latExpansion,
      lng: bounds.ne.lng + lngExpansion
    },
    sw: {
      lat: bounds.sw.lat - latExpansion,
      lng: bounds.sw.lng - lngExpansion
    }
  };
}

export async function loadRestaurantsInBounds(bounds: Bounds, activeFilters?: AppliedFilters): Promise<void> {
  // Simple rate limiting - just prevent rapid fire requests
  const currentTime = Date.now();
  const timeSinceLastRequest = currentTime - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗺️ Rate limiting: waiting ${waitTime}ms before next request`);
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  // Set loading state
  useLivemapStore.setState((s) => ({ 
    loading: { ...s.loading, restaurants: "pending" }, 
    error: null 
  }));

  try {
    fetchCount++;
    const startTime = performance.now();
    
    // Use the same API as the eatery page
    const state = useLivemapStore.getState();
    const userLocation = state.userLoc ? {
      latitude: state.userLoc.lat,
      longitude: state.userLoc.lng
    } : undefined;
    
    // Build filters from activeFilters and bounds
    const filters: Record<string, any> = {};
    
    // Add bounds to filters
    const boundsStr = `${bounds.ne.lat},${bounds.ne.lng}-${bounds.sw.lat},${bounds.sw.lng}`;
    filters.bounds = boundsStr;
    
    // Add active filters if provided - comprehensive filter support matching eatery page
    if (activeFilters) {
      if (activeFilters.q) filters.search = activeFilters.q;
      if (activeFilters.agency) filters.agency = activeFilters.agency;
      if (activeFilters.category) filters.kosher_category = activeFilters.category;
      
      // Dietary filters - support multiple dietary preferences
      if (activeFilters.dietary && activeFilters.dietary.length > 0) {
        filters.dietary = activeFilters.dietary.join(',');
      }
      
      // Business types filter
      if (activeFilters.businessTypes && activeFilters.businessTypes.length > 0) {
        filters.businessTypes = activeFilters.businessTypes.join(',');
      }
      
      // Distance: support distanceMi or maxDistanceMi (miles)
      const distanceMi = activeFilters.distanceMi || activeFilters.maxDistanceMi;
      if (distanceMi) {
        const radiusKm = distanceMi * 1.60934;
        // Backend expects 'radius' in km
        filters.radius = radiusKm.toString();
      }
      
      if (activeFilters.priceRange) {
        const [min, max] = activeFilters.priceRange;
        if (min) filters.price_min = min.toString();
        if (max) filters.price_max = max.toString();
      }
      
      if (activeFilters.ratingMin) filters.ratingMin = activeFilters.ratingMin.toString();
      if (activeFilters.openNow) filters.openNow = 'true';
      if (activeFilters.kosherDetails) filters.kosherDetails = activeFilters.kosherDetails;
      
      // Hours filter - time-based filtering
      if (activeFilters.hoursFilter) {
        filters.hoursFilter = activeFilters.hoursFilter;
      }
    }
    
    // Use the same API as eatery page
    // If we have a distance filter, include radius in the location payload for the V5 client
    let locationPayload = userLocation;
    const distanceMi = activeFilters?.distanceMi || activeFilters?.maxDistanceMi;
    if (userLocation && distanceMi) {
      const radiusKm = distanceMi * 1.60934;
      locationPayload = { ...userLocation, radius: radiusKm } as any;
    }

    const response = await apiFetchRestaurants({
      page: 1,
      limit: 200,
      filters,
      location: locationPayload,
      cursor: undefined,
      includeFilterOptions: true
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch restaurants');
    }
    
    const data = response.restaurants || [];
    const fetchTime = performance.now() - startTime;
    
    // Transform backend data to livemap format
    const transformedData = data.map((restaurant: any) => ({
      id: restaurant.id.toString(),
      name: restaurant.name,
      pos: {
        lat: restaurant.latitude,
        lng: restaurant.longitude
      },
      rating: restaurant.google_rating || restaurant.rating,
      kosher: restaurant.kosher_category?.toUpperCase() as "MEAT" | "DAIRY" | "PAREVE" || "PAREVE",
      openNow: restaurant.status === 'active',
      agencies: restaurant.certifying_agency ? [restaurant.certifying_agency] : [],
      // Include additional fields for Card component
      image_url: restaurant.image_url,
      price_range: restaurant.price_range,
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      zip_code: restaurant.zip_code,
      // Include fields needed for filtering
      listing_type: restaurant.listing_type,
      certifying_agency: restaurant.certifying_agency,
      kosher_category: restaurant.kosher_category,
      is_open: restaurant.is_open,
      kosher_details: restaurant.kosher_details,
      google_rating: restaurant.google_rating,
      quality_rating: restaurant.quality_rating
    }));

    // Handle filter options if included in response
    if (response.filterOptions) {
      // Store filter options in a way that MapEngine can access them
      useLivemapStore.setState((s) => ({ 
        filterOptions: response.filterOptions
      }));
    }

    // Update store with data
    useLivemapStore.getState().setRestaurants(transformedData);
    useLivemapStore.setState((s) => ({ 
      loading: { ...s.loading, restaurants: "success" } 
    }));
    
    // Trigger filtering after data is loaded
    const { runFilter } = await import('./workerManager');
    runFilter();

    if (process.env.NODE_ENV === 'development') {
      console.log(`🗺️ Loaded ${data.length} restaurants in ${fetchTime.toFixed(1)}ms`);
    }
    
  } catch (error: any) {
    useLivemapStore.setState((s) => ({ 
      loading: { ...s.loading, restaurants: "error" }, 
      error: error?.message ?? "Failed to load restaurants" 
    }));
    
    console.error('Failed to load restaurants:', error);
  }
}

// Cache management
export function clearCache(): void {
  cache.clear();
  loadedRestaurants.clear();
  restaurantCache.clear();
  fetchCount = 0;
  cacheHits = 0;
}

// Clear only restaurant cache (keep bounds cache)
export function clearRestaurantCache(): void {
  loadedRestaurants.clear();
  restaurantCache.clear();
}

// Reset initial load flag (useful for testing or manual resets)
export function resetInitialLoad(): void {
  isInitialLoad = true;
  initialLoadStartTime = Date.now();
}

// Check if a specific restaurant is already loaded
export function isRestaurantAlreadyLoaded(restaurantId: string): boolean {
  return isRestaurantLoaded(restaurantId);
}

// Get a specific restaurant from cache
export function getRestaurantFromCache(restaurantId: string): Restaurant | null {
  return getCachedRestaurant(restaurantId);
}

export function getCacheStats() {
  return {
    boundsCacheSize: cache.size,
    restaurantCacheSize: restaurantCache.size,
    loadedRestaurantsCount: loadedRestaurants.size,
    fetchCount,
    cacheHits,
    hitRate: fetchCount + cacheHits > 0 ? cacheHits / (fetchCount + cacheHits) : 0,
  };
}

// Preload nearby data for smooth panning
export async function preloadAdjacentBounds(currentBounds: Bounds): Promise<void> {
  const { ne, sw } = currentBounds;
  const latSpan = ne.lat - sw.lat;
  const lngSpan = ne.lng - sw.lng;
  
  // Create adjacent bounds (north, south, east, west)
  const adjacentBounds: Bounds[] = [
    // North
    {
      ne: { lat: ne.lat + latSpan, lng: ne.lng },
      sw: { lat: ne.lat, lng: sw.lng }
    },
    // South  
    {
      ne: { lat: sw.lat, lng: ne.lng },
      sw: { lat: sw.lat - latSpan, lng: sw.lng }
    },
    // East
    {
      ne: { lat: ne.lat, lng: ne.lng + lngSpan },
      sw: { lat: sw.lat, lng: ne.lng }
    },
    // West
    {
      ne: { lat: ne.lat, lng: sw.lng },
      sw: { lat: sw.lat, lng: sw.lng - lngSpan }
    }
  ];

  // Preload in background (don't await)
  adjacentBounds.forEach(bounds => {
    const key = hashBounds(bounds);
    if (!cache.has(key)) {
      loadRestaurantsInBounds(bounds).catch(() => {
        // Ignore preload errors
      });
    }
  });
}
