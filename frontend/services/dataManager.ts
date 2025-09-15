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
    fetchCount++;
    const startTime = performance.now();
    
    // Expand bounds to get more data and improve caching
    const expandedBounds = expandBounds(bounds, 1.5);
    const expandedKey = hashBounds(expandedBounds);
    
    // Fetch from direct backend API (same as eatery page) with expanded bounds parameter
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/v5/restaurants?bounds=${encodeURIComponent(expandedKey)}&limit=200`);
    
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
      zip_code: restaurant.zip_code
    }));

    // Filter data to the actual requested bounds (client-side filtering)
    const filteredData = transformedData.filter(restaurant => {
      const lat = restaurant.pos.lat;
      const lng = restaurant.pos.lng;
      return lat >= bounds.sw.lat && lat <= bounds.ne.lat &&
             lng >= bounds.sw.lng && lng <= bounds.ne.lng;
    });

    // Cache the transformed result with expanded bounds key for better coverage
    cache.set(expandedKey, { ts: now, data: transformedData });
    
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
  fetchCount = 0;
  cacheHits = 0;
}

export function getCacheStats() {
  return {
    size: cache.size,
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
