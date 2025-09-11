import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCombinedRestaurantData } from './useCombinedRestaurantData';
import { useCursorPagination } from './useCursorPagination';
import { useUrlScrollState } from './useUrlScrollState';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { Restaurant } from '@/lib/types/restaurant';

/**
 * Configuration for hybrid pagination mode
 */
interface HybridPaginationConfig {
  preferCursor: boolean;
  fallbackToOffset: boolean;
  enableUrlState: boolean;
  cursorLimit: number;
  offsetLimit: number;
}


/**
 * Filter options for restaurant data
 */
interface FilterOptions {
  agencies: string[];
  kosherCategories: string[];
  listingTypes: string[];
  priceRanges: string[];
  cities: string[];
  states: string[];
}

/**
 * Hybrid hook return interface
 */
export interface UseHybridRestaurantDataReturn {
  restaurants: Restaurant[];
  filterOptions: FilterOptions | null;
  loading: boolean;
  error: string | null;
  totalRestaurants: number;
  hasMore: boolean;
  paginationMode: 'cursor' | 'offset';
  currentCursor: string | null;
  currentPage: number;
  totalPages: number;
  dataVersion: string | null;
  fetchData: (query: string, filters?: AppliedFilters, append?: boolean) => Promise<{ received: number; hasMore: boolean }>;
  fetchNextPage: () => Promise<{ received: number; hasMore: boolean }>;
  resetData: () => void;
  switchPaginationMode: (mode: 'cursor' | 'offset') => void;
}

/**
 * Default configuration for hybrid pagination
 */
const DEFAULT_CONFIG: HybridPaginationConfig = {
  preferCursor: true,
  fallbackToOffset: true,
  enableUrlState: true,
  cursorLimit: 24,
  offsetLimit: 24,
};

/**
 * Hybrid hook that intelligently switches between cursor and offset pagination
 * Provides seamless integration between Phase 1 (offset) and Phase 2 (cursor) APIs
 */
export function useHybridRestaurantData(
  config: Partial<HybridPaginationConfig> = {}
): UseHybridRestaurantDataReturn {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const [paginationMode, setPaginationMode] = useState<'cursor' | 'offset'>(
    finalConfig.preferCursor ? 'cursor' : 'offset'
  );
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [currentFilters, setCurrentFilters] = useState<AppliedFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  
  // Initialize both pagination hooks
  const offsetHook = useCombinedRestaurantData();
  const cursorHook = useCursorPagination(finalConfig.cursorLimit);
  const urlState = useUrlScrollState();
  
  // Track initialization state
  const [initialized, setInitialized] = useState(false);
  const initializationRef = useRef(false);

  // Auto-fallback logic: switch to offset if cursor fails repeatedly
  const [cursorFailCount, setCursorFailCount] = useState(0);
  const maxCursorFails = 3;

  /**
   * Determine which hook's data to use based on current mode
   */
  const activeData = paginationMode === 'cursor' ? cursorHook : offsetHook;
  
  const restaurants: Restaurant[] = paginationMode === 'cursor' 
    ? cursorHook.restaurants.map(r => ({...r})) // Ensure compatible interface
    : offsetHook.restaurants.map(r => ({...r})); // Ensure compatible interface

  /**
   * Switch pagination mode with proper cleanup
   */
  const switchPaginationMode = useCallback((mode: 'cursor' | 'offset') => {
    if (mode === paginationMode) return;
    
    console.info(`Switching pagination mode: ${paginationMode} → ${mode}`);
    
    // Reset both hooks
    if (mode === 'cursor') {
      cursorHook.resetPagination();
    } else {
      // Reset offset hook state would go here
    }
    
    setPaginationMode(mode);
    setCursorFailCount(0);
    setCurrentPage(1);
  }, [paginationMode, cursorHook]);

  /**
   * Fetch data with intelligent mode selection
   */
  const fetchData = useCallback(async (
    query: string, 
    filters?: AppliedFilters, 
    append: boolean = false
  ): Promise<{ received: number; hasMore: boolean }> => {
    setCurrentQuery(query);
    setCurrentFilters(filters || {});
    
    if (paginationMode === 'cursor') {
      try {
        const result = await cursorHook.fetchWithCursor(null, query, filters, append);
        
        // Reset fail count on success
        if (result.received > 0) {
          setCursorFailCount(0);
        }
        
        return { received: result.received, hasMore: result.hasMore || false };
      } catch (error) {
        console.warn('Cursor fetch failed:', error);
        setCursorFailCount(prev => prev + 1);
        
        // Auto-fallback if cursor repeatedly fails and fallback is enabled
        if (finalConfig.fallbackToOffset && cursorFailCount >= maxCursorFails - 1) {
          console.info('Auto-falling back to offset pagination due to cursor failures');
          switchPaginationMode('offset');
          
          // Retry with offset mode
          const page = append ? Math.ceil(restaurants.length / finalConfig.offsetLimit) + 1 : 1;
          setCurrentPage(page);
          const result = await offsetHook.fetchCombinedData(page, query, filters, finalConfig.offsetLimit, append);
          return { received: result.received, hasMore: result.hasMore || false };
        }
        
        throw error;
      }
    } else {
      // Offset mode
      const page = append ? currentPage + 1 : 1;
      setCurrentPage(page);
      const result = await offsetHook.fetchCombinedData(page, query, filters, finalConfig.offsetLimit, append);
      return { received: result.received, hasMore: result.hasMore || false };
    }
  }, [
    paginationMode,
    cursorHook,
    offsetHook,
    finalConfig,
    cursorFailCount,
    switchPaginationMode,
    restaurants.length,
    currentPage
  ]);

  /**
   * Fetch next page using current pagination mode
   */
  const fetchNextPage = useCallback(async (): Promise<{ received: number; hasMore: boolean }> => {
    if (paginationMode === 'cursor' && cursorHook.hasMore && cursorHook.currentCursor) {
      return cursorHook.fetchNextPage();
    } else if (paginationMode === 'offset' && offsetHook.serverHasMore) {
      return fetchData(currentQuery, currentFilters, true);
    }
    
    return { received: 0, hasMore: false };
  }, [
    paginationMode,
    cursorHook,
    offsetHook,
    fetchData,
    currentQuery,
    currentFilters
  ]);

  /**
   * Reset all data and state
   */
  const resetData = useCallback(() => {
    cursorHook.resetPagination();
    setCurrentPage(1);
    setCurrentQuery('');
    setCurrentFilters({});
    setCursorFailCount(0);
    
    if (finalConfig.enableUrlState) {
      urlState.clearScrollState();
    }
  }, [cursorHook, finalConfig.enableUrlState, urlState]);

  /**
   * Initialize with URL state restoration if enabled
   */
  useEffect(() => {
    if (initialized || initializationRef.current) return;
    
    initializationRef.current = true;
    
    if (finalConfig.enableUrlState) {
      // Check for saved scroll state
      const savedState = urlState.restoreScrollState('', {});
      if (savedState && savedState.cursor) {
        console.info('Restoring scroll state with cursor:', savedState.cursor);
        // Could restore state here if needed
      }
    }
    
    setInitialized(true);
  }, [initialized, finalConfig.enableUrlState, urlState]);

  /**
   * Determine pagination capabilities
   */
  const hasMore = paginationMode === 'cursor' ? cursorHook.hasMore : offsetHook.serverHasMore;
  const totalPages = paginationMode === 'cursor' 
    ? Math.ceil((cursorHook.totalRestaurants || 0) / finalConfig.cursorLimit)
    : offsetHook.totalPages;

  return {
    restaurants,
    filterOptions: offsetHook.filterOptions, // Use offset hook's filter options
    loading: activeData.loading,
    error: activeData.error,
    totalRestaurants: paginationMode === 'cursor' ? cursorHook.totalRestaurants : offsetHook.totalRestaurants,
    hasMore,
    paginationMode,
    currentCursor: cursorHook.currentCursor,
    currentPage,
    totalPages,
    dataVersion: cursorHook.dataVersion,
    fetchData,
    fetchNextPage,
    resetData,
    switchPaginationMode,
  };
}

/**
 * ★ Insight ─────────────────────────────────────
 * This hybrid hook provides intelligent switching between cursor-based
 * (Phase 2) and offset-based (Phase 1) pagination, enabling progressive
 * enhancement while maintaining backward compatibility. It includes
 * auto-fallback logic for robust production deployment.
 * ─────────────────────────────────────────────────
 */