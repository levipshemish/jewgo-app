import { useState, useCallback, useRef } from 'react';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { toApiFormat, assembleSafeFilters } from '@/lib/filters/distance-validation';

/**
 * Restaurant data structure for cursor pagination
 */
interface CursorRestaurant {
  id: string | number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  phone_number?: string;
  website: string;
  kosher_category?: string;
  listing_type?: string;
  certifying_agency?: string;
  rating?: number | string;
  google_rating?: number | string;
  price_range?: string;
  image_url?: string;
  is_open?: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  short_description?: string;
  is_cholov_yisroel?: boolean;
  is_pas_yisroel?: boolean;
  status?: string;
}

/**
 * Cursor pagination API response structure
 */
interface CursorPaginationResponse {
  success: boolean;
  data: {
    restaurants: CursorRestaurant[];
    total?: number;
    has_more: boolean;
  };
  pagination: {
    cursor?: string;
    next_cursor?: string;
    limit: number;
    sort_key: string;
    direction: string;
    returned_count: number;
  };
  metadata: {
    data_version: string;
    cursor_version_match?: boolean;
    query_timestamp: string;
  };
  error?: string;
}

/**
 * Hook return interface for cursor pagination
 */
export interface UseCursorPaginationReturn {
  restaurants: CursorRestaurant[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalRestaurants: number;
  currentCursor: string | null;
  dataVersion: string | null;
  fetchNextPage: () => Promise<{ received: number; hasMore: boolean }>;
  fetchWithCursor: (cursor: string | null, query: string, filters?: AppliedFilters, append?: boolean) => Promise<{ received: number; hasMore: boolean }>;
  resetPagination: () => void;
  buildCursorQueryParams: (cursor: string | null, query: string, filters?: AppliedFilters, limit?: number) => URLSearchParams;
}

/**
 * Hook for cursor-based pagination with restaurant data
 * Integrates with Phase 2 backend cursor API at /api/v4/restaurants/keyset/list
 */
export function useCursorPagination(
  defaultLimit: number = 24,
  sortKey: string = 'created_at_desc'
): UseCursorPaginationReturn {
  const [restaurants, setRestaurants] = useState<CursorRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState<string | null>(null);
  
  // Track current query params for fetchNextPage
  const lastQueryRef = useRef<string>('');
  const lastFiltersRef = useRef<AppliedFilters>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanFilters = useCallback(<T extends Record<string, any>>(raw: T): Partial<T> => {
    const out: Partial<T> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) {
        continue;
      }
      if (typeof v === "string" && v.trim() === "") {
        continue;
      }
      if (Array.isArray(v) && v.length === 0) {
        continue;
      }
      out[k as keyof T] = v as any;
    }
    return out;
  }, []);

  const buildCursorQueryParams = useCallback((
    cursor: string | null,
    query: string,
    filters?: AppliedFilters,
    limit: number = defaultLimit
  ) => {
    const params = new URLSearchParams();
    
    // Add cursor if provided
    if (cursor) {
      params.set('cursor', cursor);
    }
    
    // Add pagination params
    params.set('limit', String(limit));
    params.set('sort', sortKey);
    params.set('direction', 'next');
    
    // Add search query
    if (query && String(query).trim()) {
      params.set('search', String(query).trim());
    }
    
    // Add filters
    if (filters) {
      const cleaned = cleanFilters(filters);
      const safeFilters = assembleSafeFilters(cleaned);
      const apiFilters = toApiFormat(safeFilters);
      
      // Map frontend filter format to backend API format
      if (typeof apiFilters.agency === "string") {
        params.set('certifying_agency', apiFilters.agency);
      }
      if (typeof apiFilters.category === "string") {
        params.set('kosher_category', apiFilters.category);
      }
      if (Array.isArray(apiFilters.priceRange)) {
        const [min, max] = apiFilters.priceRange;
        if (Number.isFinite(min)) {
          params.set('price_min', min.toString());
        }
        if (Number.isFinite(max)) {
          params.set('price_max', max.toString());
        }
      }
      if (typeof apiFilters.ratingMin === "number") {
        params.set('min_rating', apiFilters.ratingMin.toString());
      }
      
      // Location filters
      if (apiFilters.nearMe && Number.isFinite(apiFilters.lat) && Number.isFinite(apiFilters.lng)) {
        params.set('latitude', String(apiFilters.lat!));
        params.set('longitude', String(apiFilters.lng!));
        if (Number.isFinite(apiFilters.maxDistanceMi)) {
          params.set('radius', String(apiFilters.maxDistanceMi!));
        }
      }
      
      // Business types (multi-select)
      if (Array.isArray(apiFilters.dietary) && apiFilters.dietary.length > 0) {
        params.set('business_types', apiFilters.dietary.join(','));
      }
      
      // Note: City and state filters would need to be added to AppliedFilters interface
      // For now, these filters are not available in the current filter schema
    }
    
    return params;
  }, [cleanFilters, defaultLimit, sortKey]);

  const fetchWithCursor = useCallback(async (
    cursor: string | null,
    query: string = '',
    filters?: AppliedFilters,
    append: boolean = false
  ): Promise<{ received: number; hasMore: boolean }> => {
    try {
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      // Build URL with query parameters
      const params = buildCursorQueryParams(cursor, query, filters);
      const url = `/api/v4/restaurants/keyset/list?${params.toString()}`;
      
      // Make request to cursor API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: CursorPaginationResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }
      
      const newRestaurants = data.data.restaurants || [];
      let receivedCount = newRestaurants.length;
      
      if (append) {
        // Append new restaurants, avoiding duplicates
        setRestaurants(prev => {
          const existingIds = new Set(prev.map(r => String(r.id)));
          const uniqueNew = newRestaurants.filter(r => !existingIds.has(String(r.id)));
          receivedCount = uniqueNew.length;
          return [...prev, ...uniqueNew];
        });
      } else {
        // Replace restaurants (new query)
        setRestaurants(newRestaurants);
        if (data.data.total !== undefined) {
          setTotalRestaurants(data.data.total);
        }
      }
      
      // Update pagination state
      setHasMore(data.data.has_more);
      setCurrentCursor(data.pagination.next_cursor || null);
      
      // Update data version for cursor consistency
      if (data.metadata.data_version) {
        setDataVersion(data.metadata.data_version);
      }
      
      // Store current query for fetchNextPage
      lastQueryRef.current = query;
      lastFiltersRef.current = filters || {};
      
      return { 
        received: receivedCount, 
        hasMore: data.data.has_more 
      };
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, don't update state
        return { received: 0, hasMore: false };
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      // Minimal hardening: if cursor is invalid/expired, clear it to allow fresh fetch
      if (/\b410\b/.test(errorMessage) || /expired/i.test(errorMessage) || /Invalid cursor/i.test(errorMessage)) {
        setCurrentCursor(null);
        setHasMore(false);
      }
      console.error('Cursor pagination error:', err);
      
      return { received: 0, hasMore: false };
    } finally {
      setLoading(false);
    }
  }, [buildCursorQueryParams]);

  const fetchNextPage = useCallback(async (): Promise<{ received: number; hasMore: boolean }> => {
    if (!hasMore || !currentCursor) {
      return { received: 0, hasMore: false };
    }
    
    return fetchWithCursor(
      currentCursor,
      lastQueryRef.current,
      lastFiltersRef.current,
      true // append = true for next page
    );
  }, [hasMore, currentCursor, fetchWithCursor]);

  const resetPagination = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setRestaurants([]);
    setLoading(false);
    setError(null);
    setHasMore(false);
    setTotalRestaurants(0);
    setCurrentCursor(null);
    setDataVersion(null);
    lastQueryRef.current = '';
    lastFiltersRef.current = {};
  }, []);

  return {
    restaurants,
    loading,
    error,
    hasMore,
    totalRestaurants,
    currentCursor,
    dataVersion,
    fetchNextPage,
    fetchWithCursor,
    resetPagination,
    buildCursorQueryParams,
  };
}

/**
 * ★ Insight ─────────────────────────────────────
 * This hook provides a clean abstraction over the Phase 2 cursor API,
 * handling HMAC-signed cursor tokens transparently while maintaining
 * compatibility with existing filter and search systems.
 * ─────────────────────────────────────────────────
 */
