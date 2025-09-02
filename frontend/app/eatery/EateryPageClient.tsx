'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DEBUG, debugLog } from '@/lib/utils/debug';
import { useRouter } from 'next/navigation';
import { Header, GenericPageLayout } from '@/components/layout';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import ActionButtons from '@/components/layout/ActionButtons';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { ModernFilterPopup } from '@/components/filters/ModernFilterPopup';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { useMobileOptimization } from '@/lib/mobile-optimization';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

import { deduplicatedFetch } from '@/lib/utils/request-deduplication';
import { useCombinedRestaurantData } from '@/lib/hooks/useCombinedRestaurantData';
import { useDistanceCalculation } from '@/lib/hooks/useDistanceCalculation';
import BottomNavigation from '@/components/navigation/ui/BottomNavigation';
import CategoryTabs from '@/components/navigation/ui/CategoryTabs';



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

interface ApiResponse {
  success: boolean;
  data: Restaurant[];
  total: number;
  error: string | null;
  message?: string;
}

interface CombinedApiResponse {
  success: boolean;
  data: {
    restaurants: Restaurant[];
    total: number;
  };
  error: string | null;
}

export default function EateryPageClient() {
  // DEBUG flag and logger are centralized in debug util
  
  // API call tracking for debugging excessive calls
  const apiCallCountRef = useRef(0);
  const lastApiCallRef = useRef<{ url: string; timestamp: number; reason: string } | null>(null);
  
  // Track API calls for debugging
  const trackApiCall = useCallback((url: string, reason: string) => {
    apiCallCountRef.current += 1;
    lastApiCallRef.current = { url, timestamp: Date.now(), reason };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 API Call #${apiCallCountRef.current}:`, {
        url,
        reason,
        timestamp: new Date().toISOString(),
        totalCalls: apiCallCountRef.current
      });
    }
  }, []);
  
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AbortController for request cancellation (still needed for infinite scroll)
  const controllerRef = useRef<AbortController | null>(null);
  
  // Mobile optimization hook
  const { isMobile, viewportWidth } = useMobileOptimization();
  
  // Centralized distance calculation hook
  const { calculateDistance, formatDistance } = useDistanceCalculation();
  
  // Hydration state to prevent SSR/client mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Stabilized items per page calculation to prevent hydration race conditions
  const [stableItemsPerPage, setStableItemsPerPage] = useState(24); // Default to reasonable desktop value
  
  const mobileOptimizedItemsPerPage = useMemo(() => {
    if (!isHydrated) {
      return stableItemsPerPage; // Use stable value during hydration
    }

    // Calculate optimal items per page based on viewport
    let columnsPerRow = 1;

    if (viewportWidth >= 1441) {
      columnsPerRow = 8; // Large desktop
    } else if (viewportWidth >= 1025) {
      columnsPerRow = 6; // Desktop
    } else if (viewportWidth >= 769) {
      columnsPerRow = 4; // Large tablet
    } else if (viewportWidth >= 641) {
      columnsPerRow = 3; // Small tablet
    } else if (viewportWidth >= 360) {
      columnsPerRow = 2; // Standard mobile
    } // otherwise remain at 1 column for very small screens

    const calculatedItems = columnsPerRow * 4; // Always 4 rows
    
    // Only update stable value if there's a significant change (avoid micro-adjustments)
    if (Math.abs(calculatedItems - stableItemsPerPage) >= 4) {
      setStableItemsPerPage(calculatedItems);
    }
    
    return stableItemsPerPage;
  }, [isHydrated, viewportWidth, stableItemsPerPage]);
  
  // Unified mobile detection for infinite scroll and UI gating
  // Include tablets (up to 1024px) in mobile view for better infinite scroll experience
  const isMobileView = useMemo(() => {
    // Consider tablets as mobile for infinite scroll (up to 1024px)
    const isTabletOrMobile = viewportWidth <= 1024;
    return isHydrated && (isMobile || isTabletOrMobile);
  }, [isHydrated, isMobile, viewportWidth]);

  // Advanced filters hook
  const {
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters
  } = useAdvancedFilters();
  
  // Location state from context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
    checkPermissionStatus,
    refreshPermissionStatus,
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(() => {
    // Check sessionStorage to see if we've already shown the prompt this session
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hasShownLocationPrompt') === 'true';
    }
    return false;
  });

  // Combined API hook for restaurants and filter options
  const {
    restaurants,
    filterOptions,
    loading,
    error,
    totalRestaurants,
    totalPages,
    fetchCombinedData,
    buildQueryParams
  } = useCombinedRestaurantData();

  // Separate state for infinite scroll to avoid conflicts
  const [_infiniteScrollPage, setInfiniteScrollPage] = useState(1);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const prefetchRef = useRef<{ offset: number; items: Restaurant[]; total: number; timestamp: number } | null>(null);
  const prefetchInFlightOffsetRef = useRef<number | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  
  // Ref for setHasMore to avoid dependency cycles
  const setHasMoreRef = useRef<((value: boolean) => void) | null>(null);



  // Track the last fetched URL to prevent immediate duplicates
  const lastFetchedUrlRef = useRef<string | null>(null);

  // Memoized fetch function to prevent recreation on every render
  const fetchRestaurants = useCallback(async (page: number = 1, query: string = '', filters?: AppliedFilters) => {
    const params = buildQueryParams(page, query, filters, mobileOptimizedItemsPerPage);
    const url = `/api/restaurants-with-filters?${params.toString()}`;
    
    // Track API call
    trackApiCall(url, `fetchRestaurants - page: ${page}, query: "${query}"`);
    
    // Use the combined API hook which handles deduplication and caching internally
    await fetchCombinedData(page, query, filters, mobileOptimizedItemsPerPage);
    if (DEBUG) {
      debugLog('🎯 EateryPageClient: Combined API request triggered');
    }
    // Note: State updates are managed by the hook; avoid referencing them here to keep deps minimal
  }, [buildQueryParams, mobileOptimizedItemsPerPage, fetchCombinedData, trackApiCall]);

  // Reset the last fetched URL when query dependencies change
  useEffect(() => {
    lastFetchedUrlRef.current = null;
  }, [searchQuery, activeFilters, currentPage]);

  // Memoized query key to prevent unnecessary refetches
  // Removed unused queryKey variable - was intended for React Query but not implemented
  
  // Infinite scroll hook - only enabled on mobile  
  const loadErrorCountRef = useRef(0);

  // Use the combined API for infinite scroll instead of separate endpoint
  const fetchRestaurantsPage = useCallback(async (offset: number): Promise<ApiResponse> => {
    const page = Math.floor(offset / mobileOptimizedItemsPerPage) + 1;
    const params = buildQueryParams(page, searchQuery, activeFilters, mobileOptimizedItemsPerPage);
    params.set('offset', offset.toString());
    
    // Use the combined API endpoint instead of separate images endpoint
    const url = `/api/restaurants-with-filters?${params.toString()}`;
    
    // Track API call
    trackApiCall(url, `fetchRestaurantsPage - offset: ${offset}, page: ${page}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const data: CombinedApiResponse = await deduplicatedFetch(url);
      // Transform the response to match the expected ApiResponse format
      return {
        success: data.success,
        data: data.data?.restaurants || [],
        total: data.data?.total || 0,
        error: data.error || null
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }, [mobileOptimizedItemsPerPage, buildQueryParams, searchQuery, activeFilters, trackApiCall]);

  const schedulePrefetch = useCallback(async () => {
    // Enable prefetch for all viewports
    const nextOffset = allRestaurants.length;
    
    // Prevent prefetch if we're still loading initial data
    if (loading || nextOffset === 0) {
      return;
    }
    
    // Avoid duplicate prefetch for the same offset
    if (prefetchRef.current?.offset === nextOffset || prefetchInFlightOffsetRef.current === nextOffset) {
      return;
    }
    
    // Add cooldown to prevent rapid prefetch calls
    const now = Date.now();
    const lastPrefetchTime = prefetchRef.current?.timestamp || 0;
    const PREFETCH_COOLDOWN_MS = 2000; // 2 second cooldown between prefetches
    
    if (now - lastPrefetchTime < PREFETCH_COOLDOWN_MS) {
      if (DEBUG) {
        debugLog('Prefetch blocked - cooldown period active');
      }
      return;
    }
    
    // Cancel any in-flight prefetch
    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    
    try {
      prefetchInFlightOffsetRef.current = nextOffset;
      const data = await fetchRestaurantsPage(nextOffset);
      if (data.success && Array.isArray(data.data)) {
        prefetchRef.current = { 
          offset: nextOffset, 
          items: data.data, 
          total: data.total,
          timestamp: now // Track when prefetch was made
        };
      } else {
        prefetchRef.current = null;
      }
    } catch {
      prefetchRef.current = null;
    } finally {
      prefetchInFlightOffsetRef.current = null;
    }
  }, [allRestaurants.length, loading, fetchRestaurantsPage]);

  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    async () => {
      
      // Get current values using refs to avoid stale closures
      const currentItems = allRestaurants.length;
      const nextOffset = currentItems;
      const nextPage = Math.floor(nextOffset / mobileOptimizedItemsPerPage) + 1;
      
      if (DEBUG) { debugLog('Infinite scroll: Starting fetch', { nextOffset, nextPage, currentItems }); }
      
      try {
        let data: ApiResponse | null = null;
        if (prefetchRef.current && prefetchRef.current.offset === nextOffset && prefetchRef.current.items.length > 0) {
          data = { success: true, data: prefetchRef.current.items, total: prefetchRef.current.total, error: null } as ApiResponse;
          prefetchRef.current = null; // consume prefetch
        } else {
          data = await fetchRestaurantsPage(nextOffset);
        }
        
        if (DEBUG) {
          debugLog('Infinite scroll: Response received', { 
            success: data.success, 
            dataLength: data.data?.length || 0, 
            total: data.total,
            hasData: !!data.data 
          });
        }
        
        if (data.success && data.data.length > 0) {
          // Append new restaurants to the accumulated list, ensuring no duplicates
          setAllRestaurants(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const newRestaurants = data.data.filter(r => !existingIds.has(r.id));
            return [...prev, ...newRestaurants];
          });
          setInfiniteScrollPage(nextPage);
          
          // Check if we have more data
          const newTotalItems = currentItems + data.data.length;
          // Check both total count and actual data returned
          const hasMoreData = data.data.length >= mobileOptimizedItemsPerPage && newTotalItems < totalRestaurants;
          setHasMore(hasMoreData);
          
          // Debug logging
          if (DEBUG) { debugLog('Infinite scroll: Loaded page', nextPage, 'items:', data.data.length, 'total loaded:', newTotalItems, 'total available:', data.total, 'hasMore:', hasMoreData); }
          // Prime next prefetch only if we have more data
          if (hasMoreData) {
            // Delay prefetch to avoid immediate calls
            setTimeout(() => {
              schedulePrefetch();
            }, 1000); // 1 second delay before next prefetch
          }
        } else {
          // No more data available
          setHasMore(false);
          
          // Debug logging
          if (DEBUG) { debugLog('Infinite scroll: No more data available (empty response)'); }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Request was aborted, ignore
        }
        // eslint-disable-next-line no-console
        console.error('Error fetching more restaurants:', err);
        // Back off after repeated failures to avoid infinite loading loop
        loadErrorCountRef.current += 1;
        if (loadErrorCountRef.current >= 2) {
          setHasMore(false);
        }
        if (DEBUG) { debugLog('Infinite scroll: Error occurred. Failure count =', loadErrorCountRef.current); }
      }
    },
    { 
      threshold: 0.15,
      rootMargin: '400px', // Increased to provide much more buffer from ScrollToTop button
      disabled: loading || !isHydrated // Only enable when hydrated and not loading
    }
  );

  // Populate setHasMore ref to avoid dependency cycles
  useEffect(() => {
    setHasMoreRef.current = setHasMore;
  }, [setHasMore]);

  // Debounced fetch to prevent rapid refetches during hydration
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);
  
  // Consolidated effect to trigger combined API fetch
  // Keep dependencies tight to avoid refetch loops
  useEffect(() => {
    // Clear any existing debounced fetch
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
    
    // Cancel any in-flight requests and prefetch operations
    prefetchRef.current = null;
    prefetchAbortRef.current?.abort();
    
    // Reset infinite scroll state for all viewports
    setHasMore(true);
    setInfiniteScrollPage(1);
    loadErrorCountRef.current = 0;
    
    // Debounce the fetch to prevent rapid hydration-induced calls
    debouncedFetchRef.current = setTimeout(() => {
      // Use the combined API directly without wrapper
      fetchCombinedData(currentPage, searchQuery, activeFilters, mobileOptimizedItemsPerPage);
    }, isHydrated ? 25 : 75); // Small delay to allow deduplication to work
    
    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
  }, [currentPage, searchQuery, activeFilters, mobileOptimizedItemsPerPage, fetchCombinedData, isHydrated, setHasMore]);

  // Separate effect: schedule prefetch when data is ready for all viewports
  useEffect(() => {
    // Don't schedule prefetch immediately on page load
    // Wait for user interaction or scroll before starting prefetch
    if (allRestaurants.length === 0) {
      return;
    }
    
    // After restaurants update, schedule a single prefetch for next page
    // But only if we're not in the initial loading state
    const t = setTimeout(() => {
      // Only schedule prefetch if we have data and user has scrolled
      if (allRestaurants.length > 0 && !loading) {
        schedulePrefetch();
      }
    }, 2000); // Increased delay to 2 seconds to prevent immediate prefetch
    
    return () => clearTimeout(t);
  }, [restaurants, totalRestaurants, schedulePrefetch, allRestaurants.length, loading]);

  // Update infinite scroll state when combined hook data loads
  useEffect(() => {
    if (restaurants && restaurants.length > 0 && !loading) {
      // Always populate allRestaurants for all viewports after data loads
      const uniqueRestaurants = restaurants.filter((restaurant, index, self) => 
        index === self.findIndex(r => r.id === restaurant.id)
      );
      setAllRestaurants(uniqueRestaurants);
      
      // Reset infinite scroll state for all viewports
      setInfiniteScrollPage(1);
      // Set hasMore based on whether we've loaded all items
      const totalLoadedItems = restaurants.length;
      const hasMoreData = totalLoadedItems < totalRestaurants;
      setHasMoreRef.current?.(hasMoreData);
      
      if (DEBUG) {
        debugLog('Initial load for infinite scroll:', { 
          items: restaurants.length, 
          total: totalRestaurants, 
          hasMore: hasMoreData 
        });
      }
    }
  }, [restaurants, totalRestaurants, loading]); // Only when loading completes

  // Cleanup AbortController on unmount
  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
    // Add delay to prevent popup from showing too early
    const timeoutId = setTimeout(async () => {
      // Only show prompt if we haven't shown it before and user doesn't have location
      if (!hasShownLocationPrompt && !userLocation && !locationLoading && isHydrated) {
        // Check the actual browser permission status
        const actualPermissionStatus = await checkPermissionStatus();
        
    if (DEBUG) {
      debugLog('🌍 Location prompt check:', {
        hasShownLocationPrompt,
        userLocation: !!userLocation,
        locationLoading,
        isHydrated,
        actualPermissionStatus
      });
    }
        
        // Only show prompt if permission is not denied and not granted
        if (actualPermissionStatus === 'prompt') {
          setShowLocationPrompt(true);
          setHasShownLocationPrompt(true);
          // Store in sessionStorage to prevent showing again this session
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('hasShownLocationPrompt', 'true');
          }
        }
      }
    }, 1500); // 1.5 second delay to let the page settle

    return () => clearTimeout(timeoutId);
  }, [hasShownLocationPrompt, userLocation, locationLoading, checkPermissionStatus, isHydrated]);

  // Close location prompt when user gets location
  useEffect(() => {
    if (showLocationPrompt && userLocation) {
      setShowLocationPrompt(false);
    }
  }, [showLocationPrompt, userLocation]);

  // Force re-render when permission status changes
  useEffect(() => {
    if (DEBUG) { debugLog('📍 EateryPage: Permission status changed to:', permissionStatus); }
    
    // If permission is granted but we don't have location, request it
    if (permissionStatus === 'granted' && !userLocation && !locationLoading) {
      if (DEBUG) { debugLog('📍 EateryPage: Permission granted but no location, requesting location'); }
      requestLocation();
    }
  }, [permissionStatus, userLocation, locationLoading, requestLocation]);

  // Calculate distances and sort restaurants when location is available
  const restaurantsWithDistance = useMemo(() => {
    // Avoid racey calculations/logs before hydration completes
    if (!isHydrated) {
      const base = allRestaurants;
      return base.map(r => ({ ...r, distance: undefined }));
    }
    // Use allRestaurants for all viewports
    const dataSource = allRestaurants;
    
    if (DEBUG) {
      debugLog('📍 EateryPage: RestaurantsWithDistance Calculation', {
        isMobileView,
        isHydrated,
        isMobile,
        viewportWidth,
        deviceType: viewportWidth > 1024 ? 'desktop' : viewportWidth > 768 ? 'tablet' : 'mobile',
        allRestaurantsLength: allRestaurants.length,
        restaurantsLength: restaurants.length,
        dataSourceLength: dataSource.length,
        dataSourceUsed: 'allRestaurants',
        hasUserLocation: !!userLocation,
        permissionStatus
      });
    }
    
    if (DEBUG) {
      debugLog('📍 EateryPage: Recalculating restaurant sorting', {
        hasUserLocation: !!userLocation,
        permissionStatus,
        restaurantCount: dataSource.length,
        isMobile,
        dataSource: 'allRestaurants'
      });
    }

    // If no location or permission not granted, return original order
    if (!userLocation || permissionStatus !== 'granted') {
      if (DEBUG) { debugLog('📍 EateryPage: No location available, returning original order'); }
      return dataSource.map(restaurant => ({
        ...restaurant,
        distance: undefined
      }));
    }

    if (DEBUG) { debugLog('📍 EateryPage: Calculating distances and sorting by distance'); }

    return dataSource.map(restaurant => {
      let distance: number | undefined;
      
      // Calculate distance if restaurant has coordinates
      if (restaurant.latitude && restaurant.longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          restaurant.latitude,
          restaurant.longitude,
          'miles'
        );
      }
      
      return {
        ...restaurant,
        distance
      };
    }).sort((a, b) => {
      // Sort by distance if both have distances
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      // Put restaurants with distances first
      if (a.distance !== undefined && b.distance === undefined) {
        return -1;
      }
      if (a.distance === undefined && b.distance !== undefined) {
        return 1;
      }
      // Keep original order for restaurants without coordinates
      return 0;
    });
  }, [restaurants, allRestaurants, isMobile, userLocation, permissionStatus, isHydrated, viewportWidth, calculateDistance, isMobileView]);

  const displayedRestaurants = useMemo<(Restaurant | null)[]>(() => {
    const items: (Restaurant | null)[] = [...restaurantsWithDistance];
    if (isHydrated && isLoadingMore) {
      items.push(
        ...Array.from({ length: Math.min(mobileOptimizedItemsPerPage, 8) }).map(() => null)
      );
    }
    return items;
  }, [
    restaurantsWithDistance,
    isHydrated,
    isLoadingMore,
    mobileOptimizedItemsPerPage,
  ]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Note: hasMore will be reset when new data is loaded
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const handleShowFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  const handleApplyFilters = useCallback((filters: AppliedFilters) => {
          // Check if this is a "Clear All" operation (empty object)
      if (Object.keys(filters).length === 0) {
        // Clear all filters
        clearAllFilters();
      } else {
        // Clean the filters before applying - remove undefined/null/empty values
        const cleaned: Partial<typeof filters> = {};
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && 
              !(typeof v === "string" && v.trim() === "") &&
              !(Array.isArray(v) && v.length === 0)) {
            cleaned[k as keyof typeof filters] = v;
          }
        });
        
        // Remove keys that no longer exist in the new filters
        const keysToRemove = Object.keys(activeFilters).filter(k => !(k in cleaned));
        keysToRemove.forEach(k => {
          clearFilter(k as keyof typeof activeFilters);
        });
        
        // Set updated keys
        Object.entries(cleaned).forEach(([key, value]) => {
          if (value !== undefined) {
            setFilter(key as keyof typeof activeFilters, value);
          }
        });
      }
    
    // Reset to first page when applying filters
    setCurrentPage(1);
    setShowFilters(false);
    // Note: hasMore will be reset when new data is loaded
  }, [setFilter, clearFilter, clearAllFilters, activeFilters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 eatery-page">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        {/* Development API Call Counter */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 sm:px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <span className="text-blue-800">
                🔍 API Calls: {apiCallCountRef.current} | 
                Last Call: {lastApiCallRef.current ? `${lastApiCallRef.current.reason} (${new Date(lastApiCallRef.current.timestamp).toLocaleTimeString()})` : 'None'}
              </span>
              <button
                onClick={() => {
                  apiCallCountRef.current = 0;
                  lastApiCallRef.current = null;
                }}
                className="text-blue-600 hover:text-blue-800 text-xs underline"
              >
                Reset Counter
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <button
            onClick={() => fetchRestaurants(currentPage, searchQuery, activeFilters)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent eatery-page page-with-bottom-nav">
      <div className="sticky top-0 z-50 bg-white">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        {/* Development API Call Counter */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 sm:px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <span className="text-blue-800">
                🔍 API Calls: {apiCallCountRef.current} | 
                Last Call: {lastApiCallRef.current ? `${lastApiCallRef.current.reason} (${new Date(lastApiCallRef.current.timestamp).toLocaleTimeString()})` : 'None'}
              </span>
              <button
                onClick={() => {
                  apiCallCountRef.current = 0;
                  lastApiCallRef.current = null;
                }}
                className="text-blue-600 hover:text-blue-800 text-xs underline"
              >
                Reset Counter
              </button>
            </div>
          </div>
        )}
        
        <ActionButtons 
          onShowFilters={handleShowFilters}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-eatery')}
        />
        
        {/* Category Tabs */}
        <div className="px-4 sm:px-6 py-2 bg-transparent border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
        </div>
      </div>
      
      {/* Location Permission Banner */}
      {permissionStatus === 'prompt' && !locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-blue-800">
                Enable location to see distance from you
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshPermissionStatus}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-blue-100"
                title="Refresh permission status"
              >
                Refresh
              </button>
              <button
                onClick={requestLocation}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-3 py-1 rounded-lg hover:bg-blue-100"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Location Loading Indicator */}
      {locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">Getting your location...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Location Error Banner */}
      {locationError && permissionStatus !== 'granted' && !locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-b border-red-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-800">{locationError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Location-Based Sorting Indicator */}
      {permissionStatus === 'granted' && userLocation && (
        <div className="px-4 sm:px-6 py-2 bg-green-50 border-b border-green-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-green-800 font-medium">
                Restaurants sorted by distance from you
              </span>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : restaurantsWithDistance.length === 0 ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🍽️</div>
          <p className="text-lg text-gray-600 mb-2">No restaurants found</p>
          <p className="text-sm text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a restaurant!'
            }
          </p>
        </div>
      ) : (
        <GenericPageLayout
          items={displayedRestaurants}
          renderItem={(restaurant, index) => {
            if (!restaurant) {
              return (
                <div className="w-full" role="presentation">
                  <div className="skeleton-card">
                    <div className="skeleton-image" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row short" />
                  </div>
                </div>
              );
            }
            return (
              <UnifiedCard
                data={{
                  id: String(restaurant.id),
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge:
                    typeof restaurant.google_rating === 'number'
                      ? restaurant.google_rating.toFixed(1)
                      : String(restaurant.google_rating || ''),
                  subtitle: restaurant.price_range || '',
                  additionalText: restaurant.distance
                    ? formatDistance(restaurant.distance)
                    : '',
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
                  city: restaurant.address,
                  imageTag: restaurant.kosher_category || '',
                }}
                showStarInBadge={true}
                onCardClick={() => {
                  // Create URL-friendly eatery name
                  const eateryName = restaurant.name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .replace(/-+/g, '-') // Replace multiple hyphens with single
                    .trim()
                  
                  router.push(`/eatery/${eateryName}`)
                }}
                priority={index < 4}
                className="w-full h-full"
              />
            );
          }}
          pageTitle="Kosher Eateries"
          enableInfiniteScroll={isHydrated}
          hasNextPage={hasMore}
          isLoadingMore={isLoadingMore}
          gridClassName=""
          minColumnWidth="150px"
          sentinelRef={loadingRef}
          getItemKey={(restaurant, index) => restaurant ? restaurant.id : index}
        />
      )}
      




      {isHydrated && isLoadingMore && (
        <div className="loading-toast" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Loading more…</span>
        </div>
      )}

      {/* Bottom Navigation - rendered at page level to avoid stacking context issues */}
      <BottomNavigation />

      {/* Filter Modal */}
      {/* Modern Filter Modal */}
      <ModernFilterPopup
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
        preloadedFilterOptions={filterOptions}
      />

      {/* Location Prompt Popup */}
      <LocationPromptPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSkip={() => {
          setShowLocationPrompt(false);
        }}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop
        threshold={0.15}
        showAfterRows={2}
        totalRows={allRestaurants.length}
        position="bottom-right"
        bottomOffsetPx={72}
        size="compact"
        appearance="translucent"
      />
    </div>
  );
}
