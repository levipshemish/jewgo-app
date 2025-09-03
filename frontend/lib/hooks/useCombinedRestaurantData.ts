import { useState, useCallback, useRef } from 'react';
import { deduplicatedFetch } from '@/lib/utils/request-deduplication';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { toApiFormat, assembleSafeFilters } from '@/lib/filters/distance-validation';

interface Restaurant {
  id: string | number;
  name: string;
  address: string;
  phone?: string;
  phone_number?: string;
  website: string;
  cuisine?: string;
  kosher_category?: string;
  rating?: number | string;
  google_rating?: number | string;
  price_range: string;
  image_url: string;
  is_open: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

interface FilterOptions {
  agencies: string[];
  kosherCategories: string[];
  listingTypes: string[];
  priceRanges: string[];
  cities: string[];
  states: string[];
}

interface CombinedApiResponse {
  success: boolean;
  data: {
    restaurants: Restaurant[];
    total: number;
    filterOptions: FilterOptions;
  };
  pagination: {
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
  };
  cached?: boolean;
  error?: string;
}

interface UseCombinedRestaurantDataReturn {
  restaurants: Restaurant[];
  filterOptions: FilterOptions | null;
  loading: boolean;
  error: string | null;
  totalRestaurants: number;
  totalPages: number;
  serverHasMore: boolean;
  fetchCombinedData: (page: number, query: string, filters?: AppliedFilters, itemsPerPage?: number, append?: boolean) => Promise<{ received: number; hasMore?: boolean }>;
  buildQueryParams: (page: number, query: string, filters?: AppliedFilters, itemsPerPage?: number) => URLSearchParams;
}

/**
 * Hook for fetching both restaurant data and filter options in a single API call
 * This reduces server load and improves performance by eliminating separate requests
 */
export function useCombinedRestaurantData(): UseCombinedRestaurantDataReturn {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  // Start in loading state so UI doesn't flash an empty state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverHasMore, setServerHasMore] = useState(false);
  
  // Collapse duplicate calls with the same params within a short window (dev/StrictMode, hydration)
  const lastKeyRef = useRef<string | null>(null);
  const lastStartAtRef = useRef<number>(0);
  const SUPPRESS_WINDOW_MS = 1500; // Increased from 750ms to 1500ms for better deduplication

  // Clean filters utility (copied from EateryPageClient)
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

  const buildQueryParams = useCallback((
    page: number, 
    query: string, 
    filters?: AppliedFilters,
    itemsPerPage: number = 24
  ) => {
    const params = new URLSearchParams();
    const limit = itemsPerPage;
    const offset = Math.max(0, (page - 1) * limit);
    
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    
    if (query && String(query).trim()) {
      params.set('search', String(query).trim());
    }
    
    if (filters) {
      const cleaned = cleanFilters(filters);
      
      // Use safe filter assembly to handle distance field conflicts
      const safeFilters = assembleSafeFilters(cleaned);
      
      // Convert to API format (always use maxDistanceMi)
      const apiFilters = toApiFormat(safeFilters);
      
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
        params.set('lat', String(apiFilters.lat!));
        params.set('lng', String(apiFilters.lng!));
        // Always use maxDistanceMi for API compatibility
        if (Number.isFinite(apiFilters.maxDistanceMi)) {
          params.set('max_distance_mi', String(apiFilters.maxDistanceMi!));
        }
      }
      // Dietary filters (multi-select)
      if (Array.isArray(apiFilters.dietary) && apiFilters.dietary.length > 0) {
        apiFilters.dietary.forEach(d => params.append('dietary', d));
      } else if (apiFilters.dietary && typeof apiFilters.dietary === 'string' && String(apiFilters.dietary).trim() !== '') {
        // Handle single string dietary for backward compatibility
        params.set('dietary', String(apiFilters.dietary).trim());
      }
    }
    
    return params;
  }, [cleanFilters]);

  const fetchCombinedData = useCallback(async (
    page: number = 1,
    query: string = '',
    filters?: AppliedFilters,
    itemsPerPage: number = 24,
    append: boolean = false
  ): Promise<{ received: number; hasMore?: boolean }> => {
    try {
      // Build the key early to guard duplicate triggers
      const params = buildQueryParams(page, query, filters, itemsPerPage);
      const key = params.toString();
      const now = Date.now();
      
      // If an identical request was just started recently, skip it
      if (lastKeyRef.current === key && (now - lastStartAtRef.current) < SUPPRESS_WINDOW_MS) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 useCombinedRestaurantData: Skipping duplicate request within suppress window');
        }
        return { received: 0, hasMore: false };
      }
      lastKeyRef.current = key;
      lastStartAtRef.current = now;
      
      setLoading(true);
      setError(null);
      const url = `/api/restaurants-with-filters?${key}`;
      
      const response: CombinedApiResponse = await deduplicatedFetch(url);
      let receivedCount = 0;
      let hasMoreFromServer: boolean | undefined = undefined;
      
      if (response.success && response.data) {
        if (append) {
          // Append new restaurants to existing ones, avoiding duplicates
          // Normalize IDs to strings to avoid type-mismatch duplicates (e.g., 123 vs "123")
          setRestaurants(prev => {
            const existingIds = new Set(prev.map(r => String(r.id)));
            const newRestaurants = response.data.restaurants.filter(r => !existingIds.has(String(r.id)));
            receivedCount = newRestaurants.length;
            return [...prev, ...newRestaurants];
          });
          // Don't update totalRestaurants when appending - keep the original total
          // This prevents the total from being overwritten with page-specific totals
        } else {
          // Replace restaurants (default behavior)
          setRestaurants(response.data.restaurants);
          receivedCount = Array.isArray(response.data.restaurants) ? response.data.restaurants.length : 0;
          // Only update totalRestaurants on initial load, not when appending
          setTotalRestaurants(response.data.total);
          // Ensure totalPages is always a valid number
          const limit = Number((response as any).pagination?.limit) || itemsPerPage;
          const total = Number(response.data.total) || 0;
          const serverTotalPages = (response as any).pagination?.totalPages;
          const computedTotalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
          const safeTotalPages = Number.isFinite(serverTotalPages) && serverTotalPages > 0
            ? serverTotalPages
            : computedTotalPages;
          setTotalPages(safeTotalPages);
        }
        
        // Track server hasMore if provided
        if ((response as any).pagination && typeof (response as any).pagination.hasMore === 'boolean') {
          hasMoreFromServer = (response as any).pagination.hasMore;
          setServerHasMore(hasMoreFromServer || false);
        } else {
          // Fallback: infer hasMore
          const returned = receivedCount;
          const { limit = itemsPerPage, offset = (page - 1) * itemsPerPage } = (response as any).pagination || {};
          const inferred = response.data.total > 0 ? (offset + returned) < response.data.total : (returned >= limit);
          hasMoreFromServer = inferred;
          setServerHasMore(inferred);
        }
        
        // Only update filter options if we got them (they might be cached separately)
        if (response.data.filterOptions) {
          setFilterOptions(response.data.filterOptions);
        }
      } else {
        setError(response.error || 'Failed to fetch data');
        // Set empty states on error
        setRestaurants([]);
        setTotalRestaurants(0);
        setTotalPages(1);
        receivedCount = 0;
        hasMoreFromServer = false;
      }
      return { received: receivedCount, hasMore: hasMoreFromServer };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Error fetching combined restaurant data:', err);
      
      // Set empty states on error
      setRestaurants([]);
      setTotalRestaurants(0);
      setTotalPages(1);
      return { received: 0, hasMore: false };
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  return {
    restaurants,
    filterOptions,
    loading,
    error,
    totalRestaurants,
    totalPages,
    serverHasMore,
    fetchCombinedData,
    buildQueryParams
  };
}
