import { Restaurant } from '@/lib/types/restaurant';
import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';
import { v5ApiClient } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

export type RestaurantsResponse = {
  success: boolean;
  restaurants: Restaurant[];
  totalPages: number;
  totalRestaurants: number;
  page: number;
  limit: number;
  message?: string;
  error?: string;
  next_cursor?: string | null;
  prev_cursor?: string | null;
  total_count?: number | null;
  pagination?: {
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
    total?: number;
    hasMore?: boolean;
  };
  filterOptions?: {
    agencies: string[];
    kosherCategories: string[];
    listingTypes: string[];
    priceRanges: string[];
    cities: string[];
    states: string[];
  };
};

// Use proxy in development, direct backend URL in production
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE = isDevelopment ? '' : process.env.NEXT_PUBLIC_BACKEND_URL;
if (!API_BASE && !isDevelopment) {
  // Helps catch "relative fetch" bugs in prod logs
  // (relative fetch would hit /eatery page HTML and blow up parsing)
  console.warn("NEXT_PUBLIC_BACKEND_URL is not set; fetches may fail.");
}

export async function fetchRestaurants({
  page = 1,
  limit = 50,
  filters = {},
  location,
  cursor,
  signal,
  includeFilterOptions = false,
}: { 
  page?: number; 
  limit?: number;
  filters?: Record<string, any>;
  location?: { latitude: number; longitude: number };
  cursor?: string;
  signal?: AbortSignal;
  includeFilterOptions?: boolean;
}): Promise<RestaurantsResponse> {
  try {
    // Normalize distance: if distanceMi/maxDistanceMi present and location provided, attach radius (km)
    const normalizedFilters = { ...filters } as Record<string, any>;
    let locationPayload = location as any;
    const requestedSort = filters?.sort ?? (location ? 'distance_asc' : undefined);
    const distanceMi = (filters as any).distanceMi ?? (filters as any).maxDistanceMi ?? undefined;
    if (location && distanceMi) {
      const radiusKm = Number(distanceMi) * 1.60934;
      // Provide radius to both filters (for generic parsing) and location (for v5 client convenience)
      if (normalizedFilters.radius === undefined) normalizedFilters.radius = radiusKm.toString();
      locationPayload = { ...location, radius: radiusKm };
    }
    
    // Use V5 API client for restaurants
    const response = await v5ApiClient.getRestaurants({
      page: page || undefined, // Only pass page if it's provided
      limit,
      filters: normalizedFilters,
      location: locationPayload && location ? {
        lat: location.latitude,
        lng: location.longitude,
        radius: locationPayload.radius,
      } : undefined,
      cursor,
      includeFilterOptions,
      sort: requestedSort,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch restaurants');
    }

    // Debug the V5 API response
    console.log('🔍 V5 API Response - first restaurant:', response.data?.[0]);
    console.log('🔍 V5 API Response - distance field:', response.data?.[0]?.distance);
    
    // Handle V5 API response format - V5 API returns data array directly
    const restaurants = sanitizeRestaurantData(response.data || []) as Restaurant[];
    
    // Debug after sanitization
    console.log('🔍 After sanitization - first restaurant:', restaurants[0]);
    console.log('🔍 After sanitization - distance field:', restaurants[0]?.distance);
    
    const total = response.data?.total || response.pagination?.total || restaurants.length;
    const safeLimit = limit > 0 ? limit : 1;

    return {
      success: true,
      restaurants,
      totalPages: Math.ceil(total / safeLimit),
      totalRestaurants: total,
      page,
      limit: safeLimit,
      next_cursor: response.next_cursor,
      prev_cursor: response.prev_cursor,
      total_count: response.total_count,
      filterOptions: response.filterOptions || undefined, // Pass through filter options from API response
    };
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to V5 API directly
    const u = new URL("/api/v5/restaurants", API_BASE || window.location.origin);
    
    // Build search params
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(page));
    searchParams.set('limit', String(limit));
    searchParams.set('offset', String((page - 1) * limit)); // Convert page to offset for backend

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });

    // Add location if available
    if (location) {
      searchParams.set('latitude', String(location.latitude));
      searchParams.set('longitude', String(location.longitude));
      if (normalizedFilters.radius) {
        searchParams.set('radius', String(normalizedFilters.radius));
      }
      searchParams.set('sort', 'distance_asc');
    }

    if (!searchParams.has('sort') && requestedSort) {
      searchParams.set('sort', String(requestedSort));
    }
    
    // Add filter options request if needed
    if (includeFilterOptions) {
      searchParams.set('include_filter_options', 'true');
    }
    
    u.search = searchParams.toString();

    const res = await fetch(u.toString(), {
      // No caching for freshness; change if you want ISR
      cache: "no-store",
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Backend error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json || typeof json !== 'object') {
      throw new Error("Malformed restaurants response");
    }
    
    // Handle different API response formats
    // Local API format: {success: boolean, restaurants: Restaurant[]}
    // External API format: {count: number, data: Restaurant[]}
    if (json.data && Array.isArray(json.data)) {
      // External API format
      const restaurants = sanitizeRestaurantData(json.data) as Restaurant[];
      const countNumRaw = Number((json as any).count);
      const total = Number.isFinite(countNumRaw) && countNumRaw >= 0
        ? countNumRaw
        : restaurants.length;
      const safeLimit = limit > 0 ? limit : 1;

      return {
        success: true,
        restaurants,
        totalPages: Math.ceil(total / safeLimit),
        totalRestaurants: total,
        page,
        limit: safeLimit,
        filterOptions: json.filterOptions || undefined, // Pass through filter options from fallback response
      };
    }
    
    // Local API format (fallback)
    return json as RestaurantsResponse;
  }
}

export async function searchRestaurants(query: string, limit: number = 100): Promise<RestaurantsResponse> {
  try {
    // Use V5 API client for search
    const response = await v5ApiClient.search({
      query,
      entityType: V5_ENTITY_TYPES.RESTAURANTS,
      limit,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to search restaurants');
    }

    // Handle V5 API response format - V5 API returns data array directly
    const restaurants = sanitizeRestaurantData(response.data || []) as Restaurant[];
    const total = response.data?.total || response.pagination?.total || restaurants.length;

    return {
      success: true,
      restaurants,
      totalPages: Math.ceil(total / limit),
      totalRestaurants: total,
      page: 1,
      limit,
    };
  } catch (error) {
    console.error('V5 API search error, falling back to legacy API:', error);
    
    // Fallback to V5 API directly
    const u = new URL("/api/v5/search/restaurants", API_BASE || window.location.origin);
    u.search = new URLSearchParams({ 
      q: query, 
      limit: String(limit) 
    }).toString();

    const res = await fetch(u.toString(), {
      cache: "no-store",
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Backend error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json || typeof json !== 'object') {
      throw new Error("Malformed search response");
    }
    
    return json as RestaurantsResponse;
  }
}

export async function getRestaurant(id: number): Promise<Restaurant | null> {
  try {
    // Use V5 API client for restaurant details with cache disabled to get fresh data
    const response = await v5ApiClient.getEntity(id.toString(), V5_ENTITY_TYPES.RESTAURANTS, { 
      cache: 'no-store'
    });

    if (!response.success) {
      if (response.error?.includes('404') || response.error?.includes('not found')) {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch restaurant');
    }

    // Handle V5 API response format
    const restaurant = response.data;
    if (restaurant) {
      const sanitized = sanitizeRestaurantData([restaurant]);
      return sanitized[0] as Restaurant;
    }
    
    return null;
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to V5 API directly
    const u = new URL(`/api/v5/restaurants/${id}`, API_BASE || window.location.origin);

    const res = await fetch(u.toString(), {
      cache: "no-store",
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw new Error(`Backend error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json || typeof json !== 'object') {
      throw new Error("Malformed restaurant response");
    }
    
    // Handle different response formats
    let restaurant = null;
    if (json.restaurant) {
      restaurant = json.restaurant;
    } else if (json.success === true && json.data) {
      restaurant = json.data;
    } else if (json.id) {
      restaurant = json;
    }
    
    if (restaurant) {
      const sanitized = sanitizeRestaurantData([restaurant]);
      return sanitized[0] as Restaurant;
    }
    
    return null;
  }
}

export async function fetchRestaurantsByIds(ids: number[]): Promise<Restaurant[]> {
  try {
    if (ids.length === 0) {
      return [];
    }
    
    // For now, fetch restaurants one by one since the API doesn't support bulk fetch
    const restaurants = await Promise.all(
      ids.map(id => getRestaurant(id))
    );
    
    const validRestaurants = restaurants.filter((restaurant): restaurant is Restaurant => restaurant !== null);
    return sanitizeRestaurantData(validRestaurants) as Restaurant[];
  } catch (error) {
    console.error('Error fetching restaurants by IDs:', error);
    return [];
  }
}

export async function getStatistics(): Promise<any> {
  const u = new URL("/api/statistics", API_BASE || window.location.origin);

  const res = await fetch(u.toString(), {
    cache: "no-store",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json || typeof json !== 'object') {
    throw new Error("Malformed statistics response");
  }
  
  return json;
}
