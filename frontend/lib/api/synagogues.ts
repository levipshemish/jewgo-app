/**
 * Synagogues API
 * 
 * This API provides functions for fetching synagogue data using the V5 unified API
 * with automatic fallback to legacy endpoints.
 */

import { v5ApiClient } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

// Types for synagogue data
export interface Synagogue {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  denomination?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export type SynagoguesResponse = {
  success: boolean;
  synagogues: Synagogue[];
  totalPages: number;
  totalSynagogues: number;
  page: number;
  limit: number;
  message?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!API_BASE) {
  console.warn("NEXT_PUBLIC_BACKEND_URL is not set; fetches may fail.");
}

/**
 * Fetch synagogues with pagination and filters
 */
export async function fetchSynagogues({
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
}): Promise<SynagoguesResponse> {
  try {
    // Use V5 API client for synagogues
    const response = await v5ApiClient.getSynagogues({
      page,
      limit,
      filters,
      location: location ? {
        lat: location.latitude,
        lng: location.longitude,
      } : undefined,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch synagogues');
    }

    // Handle V5 API response format
    // Handle V5 API response format - V5 API returns data array directly
    const synagogues = response.data || [];
    const total = response.data?.total || response.pagination?.total || synagogues.length;
    const safeLimit = limit > 0 ? limit : 1;

    return {
      success: true,
      synagogues,
      totalPages: Math.ceil(total / safeLimit),
      totalSynagogues: total,
      page,
      limit: safeLimit,
    };
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL("/api/synagogues", API_BASE || window.location.origin);
    
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
      throw new Error("Malformed synagogues response");
    }
    
    // Handle different API response formats
    if (json.data && Array.isArray(json.data)) {
      const synagogues = json.data;
      const countNumRaw = Number((json as any).count);
      const total = Number.isFinite(countNumRaw) && countNumRaw >= 0
        ? countNumRaw
        : synagogues.length;
      const safeLimit = limit > 0 ? limit : 1;

      return {
        success: true,
        synagogues,
        totalPages: Math.ceil(total / safeLimit),
        totalSynagogues: total,
        page,
        limit: safeLimit,
      };
    }
    
    // Local API format (fallback)
    return json as SynagoguesResponse;
  }
}

/**
 * Search synagogues
 */
export async function searchSynagogues(query: string, limit: number = 100): Promise<SynagoguesResponse> {
  try {
    // Use V5 API client for search
    const response = await v5ApiClient.search({
      query,
      entityType: V5_ENTITY_TYPES.SYNAGOGUES,
      limit,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to search synagogues');
    }

    // Handle V5 API response format
    // Handle V5 API response format - V5 API returns data array directly
    const synagogues = response.data || [];
    const total = response.data?.total || response.pagination?.total || synagogues.length;

    return {
      success: true,
      synagogues,
      totalPages: Math.ceil(total / limit),
      totalSynagogues: total,
      page: 1,
      limit,
    };
  } catch (error) {
    console.error('V5 API search error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL("/api/synagogues/search", API_BASE || window.location.origin);
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
    
    return json as SynagoguesResponse;
  }
}

/**
 * Get a specific synagogue by ID
 */
export async function getSynagogue(id: number): Promise<Synagogue | null> {
  try {
    // Use V5 API client for synagogue details
    const response = await v5ApiClient.getEntity(id.toString(), V5_ENTITY_TYPES.SYNAGOGUES);

    if (!response.success) {
      if (response.error?.includes('404') || response.error?.includes('not found')) {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch synagogue');
    }

    // Handle V5 API response format
    // Handle V5 API response format - V5 API returns data directly
    const synagogue = response.data;
    return synagogue || null;
  } catch (error) {
    console.error('V5 API error, falling back to legacy API:', error);
    
    // Fallback to legacy API
    const u = new URL(`/api/synagogues/${id}`, API_BASE || window.location.origin);

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
      throw new Error("Malformed synagogue response");
    }
    
    // Handle different response formats
    let synagogue = null;
    if (json.synagogue) {
      synagogue = json.synagogue;
    } else if (json.success === true && json.data) {
      synagogue = json.data;
    } else if (json.id) {
      synagogue = json;
    }
    
    return synagogue;
  }
}

/**
 * Fetch synagogues by IDs
 */
export async function fetchSynagoguesByIds(ids: number[]): Promise<Synagogue[]> {
  try {
    if (ids.length === 0) {
      return [];
    }
    
    // For now, fetch synagogues one by one since the API doesn't support bulk fetch
    const synagogues = await Promise.all(
      ids.map(id => getSynagogue(id))
    );
    
    return synagogues.filter((synagogue): synagogue is Synagogue => synagogue !== null);
  } catch (error) {
    console.error('Error fetching synagogues by IDs:', error);
    return [];
  }
}
