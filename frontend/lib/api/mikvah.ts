/**
 * Mikvah API
 * 
 * This API provides functions for fetching mikvah data using the V5 unified API
 * with automatic fallback to legacy endpoints.
 */

import { v5ApiClient } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

// Types for mikvah data
export interface Mikvah {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  hours?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export type MikvahResponse = {
  success: boolean;
  mikvah: Mikvah[];
  totalPages: number;
  totalMikvah: number;
  page: number;
  limit: number;
  message?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!API_BASE) {
  console.warn("NEXT_PUBLIC_BACKEND_URL is not set; fetches may fail.");
}

/**
 * Fetch mikvah with pagination and filters
 */
export async function fetchMikvah({
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
}): Promise<MikvahResponse> {
  try {
    // Use V5 API client for mikvah
    const response = await v5ApiClient.getMikvah({
      page,
      limit,
      filters,
      location: location ? {
        lat: location.latitude,
        lng: location.longitude,
      } : undefined,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch mikvah');
    }

    // Handle V5 API response format
    const mikvah = response.data?.mikvah || response.data || [];
    const total = response.data?.total || response.pagination?.total || mikvah.length;
    const safeLimit = limit > 0 ? limit : 1;

    return {
      success: true,
      mikvah,
      totalPages: Math.ceil(total / safeLimit),
      totalMikvah: total,
      page,
      limit: safeLimit,
    };
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL("/api/mikvah", API_BASE || window.location.origin);
    
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
      throw new Error("Malformed mikvah response");
    }
    
    // Handle different API response formats
    if (json.data && Array.isArray(json.data)) {
      const mikvah = json.data;
      const countNumRaw = Number((json as any).count);
      const total = Number.isFinite(countNumRaw) && countNumRaw >= 0
        ? countNumRaw
        : mikvah.length;
      const safeLimit = limit > 0 ? limit : 1;

      return {
        success: true,
        mikvah,
        totalPages: Math.ceil(total / safeLimit),
        totalMikvah: total,
        page,
        limit: safeLimit,
      };
    }
    
    // Local API format (fallback)
    return json as MikvahResponse;
  }
}

/**
 * Search mikvah
 */
export async function searchMikvah(query: string, limit: number = 100): Promise<MikvahResponse> {
  try {
    // Use V5 API client for search
    const response = await v5ApiClient.search({
      query,
      entityType: V5_ENTITY_TYPES.MIKVAH,
      limit,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to search mikvah');
    }

    // Handle V5 API response format
    const mikvah = response.data?.mikvah || response.data || [];
    const total = response.data?.total || response.pagination?.total || mikvah.length;

    return {
      success: true,
      mikvah,
      totalPages: Math.ceil(total / limit),
      totalMikvah: total,
      page: 1,
      limit,
    };
  } catch (error) {
    console.error('V5 API search error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL("/api/mikvah/search", API_BASE || window.location.origin);
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
    
    return json as MikvahResponse;
  }
}

/**
 * Get a specific mikvah by ID
 */
export async function getMikvah(id: number): Promise<Mikvah | null> {
  try {
    // Use V5 API client for mikvah details
    const response = await v5ApiClient.getEntity(id.toString(), V5_ENTITY_TYPES.MIKVAH);

    if (!response.success) {
      if (response.error?.includes('404') || response.error?.includes('not found')) {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch mikvah');
    }

    // Handle V5 API response format
    const mikvah = response.data?.mikvah || response.data;
    return mikvah || null;
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL(`/api/mikvah/${id}`, API_BASE || window.location.origin);

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
      throw new Error("Malformed mikvah response");
    }
    
    // Handle different response formats
    let mikvah = null;
    if (json.mikvah) {
      mikvah = json.mikvah;
    } else if (json.success === true && json.data) {
      mikvah = json.data;
    } else if (json.id) {
      mikvah = json;
    }
    
    return mikvah;
  }
}

/**
 * Fetch mikvah by IDs
 */
export async function fetchMikvahByIds(ids: number[]): Promise<Mikvah[]> {
  try {
    if (ids.length === 0) {
      return [];
    }
    
    // For now, fetch mikvah one by one since the API doesn't support bulk fetch
    const mikvah = await Promise.all(
      ids.map(id => getMikvah(id))
    );
    
    return mikvah.filter((mikvah): mikvah is Mikvah => mikvah !== null);
  } catch (error) {
    console.error('Error fetching mikvah by IDs:', error);
    return [];
  }
}
