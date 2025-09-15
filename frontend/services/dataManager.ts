/**
 * Data Manager - Viewport-keyed Cache + TTL
 * 
 * Manages restaurant data loading with intelligent caching and performance limits.
 */

import { useLivemapStore } from "@/lib/stores/livemap-store";
// import { PERFORMANCE_LIMITS } from "@/types/livemap";
import type { Restaurant, Bounds } from "@/types/livemap";

// Cache with TTL
const cache = new Map<string, { ts: number; data: Restaurant[] }>();
const TTL = 5 * 60 * 1000; // 5 minutes

// Track loaded restaurants to prevent duplicate API calls (with size limits)
const loadedRestaurants = new Set<string>(); // Set of restaurant IDs
const restaurantCache = new Map<string, Restaurant>(); // Individual restaurant cache
const MAX_RESTAURANT_CACHE_SIZE = 5000; // Increased limit for better coverage

// Maximum bounds size to prevent excessive API calls
const MAX_BOUNDS_DEGREES = 15.0; // ~1500km max bounds (increased for better coverage)
const EXTREME_BOUNDS_DEGREES = 50.0; // ~5000km - truly extreme bounds

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
  if (restaurantCache.size > 1000) {
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

// Rate limiting state
let lastRequestTime = 0;
let consecutiveFailures = 0;
let isInitialLoad = true; // Track if this is the initial load
const MIN_REQUEST_INTERVAL = 500; // 500ms minimum between requests (reduced for better scrolling)
const INITIAL_LOAD_INTERVAL = 100; // Much shorter interval for initial load
const MAX_BACKOFF_MS = 10000; // 10 seconds max backoff

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
    if (cachedBounds.ne.lat >= requestedBounds.ne.lat &&
        cachedBounds.ne.lng >= requestedBounds.ne.lng &&
        cachedBounds.sw.lat <= requestedBounds.sw.lat &&
        cachedBounds.sw.lng <= requestedBounds.sw.lng) {
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

export async function loadRestaurantsInBounds(bounds: Bounds): Promise<void> {
  // Check if bounds are extremely large - block entirely
  if (isBoundsExtremelyLarge(bounds)) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗺️ Bounds extremely large (${Math.abs(bounds.ne.lat - bounds.sw.lat).toFixed(2)}° x ${Math.abs(bounds.ne.lng - bounds.sw.lng).toFixed(2)}°), blocking API call`);
    }
    return;
  }

  // For large bounds, use a different strategy - don't expand bounds and use smaller limit
  const isLargeBounds = isBoundsTooLarge(bounds);
  if (isLargeBounds && process.env.NODE_ENV === 'development') {
    console.log(`🗺️ Large bounds detected (${Math.abs(bounds.ne.lat - bounds.sw.lat).toFixed(2)}° x ${Math.abs(bounds.ne.lng - bounds.sw.lng).toFixed(2)}°), using conservative strategy`);
  }

  const key = hashBounds(bounds);
  const existing = cache.get(key);
  const now = Date.now();

  // Check cache first
  if (existing && now - existing.ts < TTL) {
    cacheHits++;
    useLivemapStore.getState().setRestaurants(existing.data);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗺️ Cache hit for bounds ${key} (${cacheHits}/${fetchCount + cacheHits})`);
    }
    return;
  }

  // Check if we already have restaurants in these bounds from previous loads
  // Only do this check for reasonable cache sizes to avoid performance issues
  if (restaurantCache.size < 500) {
    const cachedRestaurantsInBounds = getCachedRestaurantsInBounds(bounds);
    if (cachedRestaurantsInBounds.length > 0) {
      cacheHits++;
      useLivemapStore.getState().setRestaurants(cachedRestaurantsInBounds);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗺️ Using cached restaurants for bounds ${key} (${cachedRestaurantsInBounds.length} restaurants, ${cacheHits}/${fetchCount + cacheHits})`);
      }
      return;
    }
  }

  // Check if we have overlapping cached data that covers the requested bounds
  const overlappingData = findOverlappingCache(bounds);
  if (overlappingData) {
    cacheHits++;
    useLivemapStore.getState().setRestaurants(overlappingData);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗺️ Overlapping cache hit for bounds ${key} (${cacheHits}/${fetchCount + cacheHits})`);
    }
    return;
  }

  // Set loading state
  useLivemapStore.setState((s) => ({ 
    loading: { ...s.loading, restaurants: "pending" }, 
    error: null 
  }));

  try {
    // Rate limiting: check if we need to wait (shorter interval for initial load)
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - lastRequestTime;
    const backoffMs = Math.min(consecutiveFailures * 1000, MAX_BACKOFF_MS);
    const requestInterval = isInitialLoad ? INITIAL_LOAD_INTERVAL : MIN_REQUEST_INTERVAL;
    
    if (timeSinceLastRequest < requestInterval + backoffMs) {
      const waitTime = requestInterval + backoffMs - timeSinceLastRequest;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗺️ Rate limiting: waiting ${waitTime}ms before next request (initial: ${isInitialLoad})`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Mark that initial load is complete after first successful request
    // Don't reset on rate limiting or errors

    fetchCount++;
    const startTime = performance.now();
    lastRequestTime = currentTime;
    
    // Use different strategies for large vs normal bounds
    let apiBounds = bounds;
    let limit = 200;
    
    if (isLargeBounds) {
      // For large bounds: don't expand, use smaller limit, and use original bounds
      apiBounds = bounds;
      limit = 50; // Smaller limit for large areas
    } else {
      // For normal bounds: expand bounds to get more data and improve caching
      apiBounds = expandBounds(bounds, 1.5);
      limit = 200;
    }
    
    const apiKey = hashBounds(apiBounds);
    
    // Fetch from direct backend API (same as eatery page) with bounds parameter
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/v5/restaurants?bounds=${encodeURIComponent(apiKey)}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    const data = responseData.items || responseData.restaurants || responseData.data || [];
    const fetchTime = performance.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🗺️ API Response:', { 
        hasRestaurants: !!responseData.restaurants, 
        hasData: !!responseData.data, 
        restaurantsCount: responseData.restaurants?.length || 0,
        dataCount: responseData.data?.length || 0,
        finalDataCount: data.length 
      });
    }
    
    // Transform backend data to livemap format and track loaded restaurants
    const transformedData = data.map((restaurant: any) => {
      const transformedRestaurant = {
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
        zip_code: restaurant.zip_code
      };
      
      // Track this restaurant as loaded to prevent duplicate API calls
      addLoadedRestaurant(transformedRestaurant);
      
      return transformedRestaurant;
    });

    // Filter data to the actual requested bounds (client-side filtering)
    const filteredData = transformedData.filter((restaurant: any) => {
      const lat = restaurant.pos.lat;
      const lng = restaurant.pos.lng;
      return lat >= bounds.sw.lat && lat <= bounds.ne.lat &&
             lng >= bounds.sw.lng && lng <= bounds.ne.lng;
    });

    // Cache the transformed result with the API bounds key
    cache.set(apiKey, { ts: currentTime, data: transformedData });
    
    // Update store with filtered data
    useLivemapStore.getState().setRestaurants(filteredData);
    useLivemapStore.setState((s) => ({ 
      loading: { ...s.loading, restaurants: "success" } 
    }));
    
    // Trigger filtering after data is loaded
    const { runFilter } = await import('./workerManager');
    runFilter();

    if (process.env.NODE_ENV === 'development') {
      console.log(`🗺️ Loaded ${data?.length || 0} restaurants, filtered to ${filteredData.length} in ${fetchTime.toFixed(1)}ms (cache miss)`);
    }
    
    // Reset failure count on success
    consecutiveFailures = 0;
    
    // Mark that initial load is complete after first successful request
    if (isInitialLoad) {
      isInitialLoad = false;
    }
    
  } catch (error: any) {
    // Increment failure count for rate limiting
    consecutiveFailures++;
    
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
