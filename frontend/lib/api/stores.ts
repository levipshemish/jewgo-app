/**
 * Stores API
 * 
 * This API provides functions for fetching store data using the V5 unified API
 * with automatic fallback to legacy endpoints.
 */

import { v5ApiClient } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

// Types for store data
export interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export type StoresResponse = {
  success: boolean;
  stores: Store[];
  totalPages: number;
  totalStores: number;
  page: number;
  limit: number;
  message?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!API_BASE) {
  console.warn("NEXT_PUBLIC_BACKEND_URL is not set; fetches may fail.");
}

/**
 * Fetch stores with pagination and filters
 */
export async function fetchStores({
  page = 1,
  limit = 50,
  filters = {},
  location,
  signal,
}: { 
  page?: number; 
  limit?: number;
  filters?: Record<string, any>;
  location?: { latitude: number; longitude: number };
  signal?: AbortSignal;
}): Promise<StoresResponse> {
  try {
    // Use V5 API client for stores
    const response = await v5ApiClient.getStores({
      page,
      limit,
      filters,
      location: location ? {
        lat: location.latitude,
        lng: location.longitude,
      } : undefined,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch stores');
    }

    // Handle V5 API response format
    const stores = response.data?.stores || response.data || [];
    const total = response.data?.total || response.pagination?.total || stores.length;
    const safeLimit = limit > 0 ? limit : 1;

    return {
      success: true,
      stores,
      totalPages: Math.ceil(total / safeLimit),
      totalStores: total,
      page,
      limit: safeLimit,
    };
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL("/api/stores", API_BASE || window.location.origin);
    
    // Build search params
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(page));
    searchParams.set('limit', String(limit));
    searchParams.set('offset', String((page - 1) * limit));
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    
    // Add location if available
    if (location) {
      searchParams.set('lat', String(location.latitude));
      searchParams.set('lng', String(location.longitude));
    }
    
    u.search = searchParams.toString();

    const res = await fetch(u.toString(), {
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
      throw new Error("Malformed stores response");
    }
    
    // Handle different API response formats
    if (json.data && Array.isArray(json.data)) {
      const stores = json.data;
      const countNumRaw = Number((json as any).count);
      const total = Number.isFinite(countNumRaw) && countNumRaw >= 0
        ? countNumRaw
        : stores.length;
      const safeLimit = limit > 0 ? limit : 1;

      return {
        success: true,
        stores,
        totalPages: Math.ceil(total / safeLimit),
        totalStores: total,
        page,
        limit: safeLimit,
      };
    }
    
    // Local API format (fallback)
    return json as StoresResponse;
  }
}

/**
 * Search stores
 */
export async function searchStores(query: string, limit: number = 100): Promise<StoresResponse> {
  try {
    // Use V5 API client for search
    const response = await v5ApiClient.search({
      query,
      entityType: V5_ENTITY_TYPES.STORES,
      limit,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to search stores');
    }

    // Handle V5 API response format
    const stores = response.data?.stores || response.data || [];
    const total = response.data?.total || response.pagination?.total || stores.length;

    return {
      success: true,
      stores,
      totalPages: Math.ceil(total / limit),
      totalStores: total,
      page: 1,
      limit,
    };
  } catch (error) {
    console.error('V5 API search error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL("/api/stores/search", API_BASE || window.location.origin);
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
    
    return json as StoresResponse;
  }
}

/**
 * Get a specific store by ID
 */
export async function getStore(id: number): Promise<Store | null> {
  try {
    // Use V5 API client for store details
    const response = await v5ApiClient.getEntity(id.toString(), V5_ENTITY_TYPES.STORES);

    if (!response.success) {
      if (response.error?.includes('404') || response.error?.includes('not found')) {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch store');
    }

    // Handle V5 API response format
    const store = response.data?.store || response.data;
    return store || null;
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL(`/api/stores/${id}`, API_BASE || window.location.origin);

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
      throw new Error("Malformed store response");
    }
    
    // Handle different response formats
    let store = null;
    if (json.store) {
      store = json.store;
    } else if (json.success === true && json.data) {
      store = json.data;
    } else if (json.id) {
      store = json;
    }
    
    return store;
  }
}

/**
 * Fetch stores by IDs
 */
export async function fetchStoresByIds(ids: number[]): Promise<Store[]> {
  try {
    if (ids.length === 0) {
      return [];
    }
    
    // For now, fetch stores one by one since the API doesn't support bulk fetch
    const stores = await Promise.all(
      ids.map(id => getStore(id))
    );
    
    return stores.filter((store): store is Store => store !== null);
  } catch (error) {
    console.error('Error fetching stores by IDs:', error);
    return [];
  }
}
