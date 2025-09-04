import { useState, useCallback, useRef, useEffect } from 'react';
import { deduplicatedFetch } from '@/lib/utils/request-deduplication';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { toApiFormat, assembleSafeFilters } from '@/lib/filters/distance-validation';
import { IS_MEMORY_CAP_ITEMS, IS_MEMORY_COMPACTION_THRESHOLD, IS_MEMORY_MONITORING_INTERVAL_MS } from '@/lib/config/infiniteScroll.constants';

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
  // New: page items for infinite scroll management
  pageItems: Restaurant[];
  fetchCombinedData: (page: number, query: string, filters?: AppliedFilters, itemsPerPage?: number, append?: boolean) => Promise<{ received: number; hasMore?: boolean }>;
  buildQueryParams: (page: number, query: string, filters?: AppliedFilters, itemsPerPage?: number) => URLSearchParams;
  resetData: () => void;
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
  // New: page items for infinite scroll (accumulated across pages)
  const [pageItems, setPageItems] = useState<Restaurant[]>([]);
  
  // Collapse duplicate calls with the same params within a short window (dev/StrictMode, hydration)
  const lastKeyRef = useRef<string | null>(null);
  const lastStartAtRef = useRef<number>(0);
  const lastRequestParamsRef = useRef<{ page: number; query: string; filters: AppliedFilters | undefined; itemsPerPage: number } | null>(null);
  const SUPPRESS_WINDOW_MS = 3000; // Increased to 3000ms for better deduplication and to prevent excessive calls

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
  }, []); // No dependencies needed - this function is pure

  const resetData = useCallback(() => {
    setRestaurants([]);
    setFilterOptions(null);
    setLoading(false);
    setError(null);
    setTotalRestaurants(0);
    setTotalPages(1);
    setServerHasMore(false);
    setPageItems([]);
    lastKeyRef.current = null;
    lastStartAtRef.current = 0;
    lastRequestParamsRef.current = null;
  }, []);

  // Memory management for infinite scroll data
  useEffect(() => {
    let mounted = true;
    const checkMemory = () => {
      if (!mounted) return;
      
      const currentCount = pageItems.length;
      
      if (currentCount > IS_MEMORY_COMPACTION_THRESHOLD) {
        // Trigger compaction: keep only the last N items
        const itemsToKeep = IS_MEMORY_CAP_ITEMS;
        const startIndex = Math.max(0, currentCount - itemsToKeep);
        
        setPageItems(prev => {
          const compacted = prev.slice(startIndex);
          console.info(`Memory compaction: reduced from ${currentCount} to ${compacted.length} items`);
          return compacted;
        });
      }
    };
    
    const intervalId = setInterval(checkMemory, IS_MEMORY_MONITORING_INTERVAL_MS);
    // Initial check
    checkMemory();
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [pageItems.length]);

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
  }, [cleanFilters]); // cleanFilters is used in this function

  const fetchCombinedData = useCallback(async (
    page: number = 1,
    query: string = '',
    filters?: AppliedFilters,
    itemsPerPage: number = 24,
    append: boolean = false
  ): Promise<{ received: number; hasMore?: boolean }> => {
    try {
      // CRITICAL FIX: Add safety check to prevent infinite API calls
      if (page > 100) { // Arbitrary safety limit
        console.error('API safety limit reached: page', page);
        return { received: 0, hasMore: false };
      }
      
      // Build the key early to guard duplicate triggers
      const params = buildQueryParams(page, query, filters, itemsPerPage);
      const key = params.toString();
      const now = Date.now();
      
      // If an identical request was just started recently, skip it

      const currentOffset = params.get('offset');
      const lastParams = lastKeyRef.current ? new URLSearchParams(lastKeyRef.current) : null;
      const lastOffset = lastParams?.get('offset');
      
      const isDifferentPage = currentOffset !== lastOffset;
      const isWithinSuppressWindow = (now - lastStartAtRef.current) < SUPPRESS_WINDOW_MS;
      
      // Additional deduplication: check if request parameters are identical
      const currentRequestParams = { page, query, filters, itemsPerPage };
      const lastRequestParams = lastRequestParamsRef.current;
      const isIdenticalRequest = lastRequestParams && 
        lastRequestParams.page === page &&
        lastRequestParams.query === query &&
        lastRequestParams.itemsPerPage === itemsPerPage &&
        JSON.stringify(lastRequestParams.filters) === JSON.stringify(filters);
      
      if (lastKeyRef.current === key && isWithinSuppressWindow && !isDifferentPage) {
        // Debug logging removed for production
        return { received: 0, hasMore: false };
      }
      
      // Additional check for identical request parameters
      if (isIdenticalRequest && isWithinSuppressWindow) {
        // Debug logging removed for production
        return { received: 0, hasMore: false };
      }
      
      lastKeyRef.current = key;
      lastStartAtRef.current = now;
      lastRequestParamsRef.current = currentRequestParams;
      
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
          
          // Update pageItems for infinite scroll (accumulate across pages)
          setPageItems(prev => {
            const existingIds = new Set(prev.map(r => String(r.id)));
            const newRestaurants = response.data.restaurants.filter(r => !existingIds.has(String(r.id)));
            return [...prev, ...newRestaurants];
          });
          
          // Update totalRestaurants when appending to maintain accurate count
          if (response.data.total > 0) {
            setTotalRestaurants(response.data.total);
          }
        } else {
          // Replace restaurants (default behavior)
          setRestaurants(response.data.restaurants);
          receivedCount = Array.isArray(response.data.restaurants) ? response.data.restaurants.length : 0;
          
          // Reset pageItems on new search/filter
          setPageItems(response.data.restaurants);
          
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
          const total = Number(response.data.total) || 0;
          
          if (total > 0) {
            // Use the total from the response to calculate hasMore
            const currentTotal = append ? (restaurants.length + returned) : returned;
            hasMoreFromServer = (offset + currentTotal) < total;
          } else {
            // Fallback: if we got fewer items than requested, we're definitely at the end
            // If we got exactly the limit, we need to check if there's actually more data
            hasMoreFromServer = returned > limit || (returned === limit && total > 0 && (offset + returned) < total);
          }
          
          setServerHasMore(hasMoreFromServer);
        }
        
        // CRITICAL FIX: Additional safety check for hasMore
        // If we received 0 items but hasMore is true, force it to false to prevent infinite loops
        if (receivedCount === 0 && hasMoreFromServer) {
          console.warn('API returned 0 items but hasMore=true, forcing to false to prevent infinite loop');
          hasMoreFromServer = false;
          setServerHasMore(false);
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
  }, [buildQueryParams, restaurants.length]); // buildQueryParams and restaurants.length are used in this function

  return {
    restaurants,
    filterOptions,
    loading,
    error,
    totalRestaurants,
    totalPages,
    serverHasMore,
    pageItems,
    fetchCombinedData,
    buildQueryParams,
    resetData
  };
}
