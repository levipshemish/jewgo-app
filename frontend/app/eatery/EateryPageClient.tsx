'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DEBUG, debugLog } from '@/lib/utils/debug';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Pagination } from '@/components/ui/Pagination';
import UnifiedCard from '@/components/ui/UnifiedCard';

import ActionButtons from '@/components/layout/ActionButtons';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { ModernFilterPopup } from '@/components/filters/ModernFilterPopup';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { useMobileOptimization } from '@/lib/mobile-optimization';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';


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

// Removed unused ApiResponse and CombinedApiResponse interfaces

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

  // Safety: ensure page-level scrolling is enabled when this page mounts
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    const prevOverflowX = document.body.style.overflowX;
    const prevOverflowY = document.body.style.overflowY;
    // Re-enable vertical scrolling in case a previous modal/page disabled it
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overflowX = prevOverflowX;
      document.body.style.overflowY = prevOverflowY;
    };
  }, []);
  
  // Stabilized items per page calculation to ensure exactly 4 rows on desktop
  const [stableItemsPerPage, setStableItemsPerPage] = useState(24); // Default to 6 columns × 4 rows
  
  const mobileOptimizedItemsPerPage = useMemo(() => {
    if (!isHydrated) {
      return stableItemsPerPage; // Use stable value during hydration
    }

    // Calculate optimal items per page based on viewport - always 4 rows
    let columnsPerRow = 1;

    if (viewportWidth >= 1441) {
      columnsPerRow = 8; // Large desktop: 8 × 4 = 32 items
    } else if (viewportWidth >= 1025) {
      columnsPerRow = 6; // Desktop: 6 × 4 = 24 items
    } else if (viewportWidth >= 769) {
      columnsPerRow = 4; // Large tablet: 4 × 4 = 16 items
    } else if (viewportWidth >= 641) {
      columnsPerRow = 3; // Small tablet: 3 × 4 = 12 items
    } else if (viewportWidth >= 360) {
      columnsPerRow = 2; // Standard mobile: 2 × 4 = 8 items
    } // otherwise remain at 1 column for very small screens: 1 × 4 = 4 items

    const calculatedItems = columnsPerRow * 4; // Always exactly 4 rows
    
    // Only update stable value if there's a significant change (avoid micro-adjustments)
    if (Math.abs(calculatedItems - stableItemsPerPage) >= 4) {
      setStableItemsPerPage(calculatedItems);
    }
    
    return stableItemsPerPage;
  }, [isHydrated, viewportWidth, stableItemsPerPage]);
  
  // Unified mobile detection for infinite scroll and UI gating
  // Match Shuls behavior: enable infinite scroll on mobile only (≤768px)
  const isMobileView = useMemo(() => {
    const isMobileOnly = viewportWidth <= 768;
    return isHydrated && (isMobile || isMobileOnly);
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

  // Prefetch state for infinite scroll (currently gated/disabled to avoid races)
  const prefetchRef = useRef<{ offset: number; items: Restaurant[]; total: number; timestamp: number } | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  
  // Ref for setHasMore to avoid dependency cycles
  const setHasMoreRef = useRef<((value: boolean) => void) | null>(null);

  // Track the last fetched URL to prevent immediate duplicates
  const lastFetchedUrlRef = useRef<string | null>(null);

  // Calculate distances and sort restaurants when location is available
  const restaurantsWithDistance = useMemo(() => {
    // Use restaurants from the hook directly for infinite scroll
    const dataSource = restaurants;
    
    if (DEBUG) {
      debugLog('📍 EateryPage: RestaurantsWithDistance Calculation', {
        isMobileView,
        isHydrated,
        isMobile,
        viewportWidth,
        deviceType: viewportWidth > 1024 ? 'desktop' : viewportWidth > 768 ? 'tablet' : 'mobile',
        restaurantsLength: restaurants.length,
        dataSourceLength: dataSource.length,
        dataSourceUsed: 'restaurants (hook)',
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
        dataSource: 'restaurants (hook)'
      });
    }

    // If no location or permission not granted, return original order
    if (!userLocation || permissionStatus !== 'granted') {
      if (DEBUG) { debugLog('📍 EateryPage: No location available, returning original order'); }
      return dataSource.map((restaurant: any) => ({
        ...restaurant,
        distance: undefined
      }));
    }

    if (DEBUG) { debugLog('📍 EateryPage: Calculating distances and sorting by distance'); }

    return dataSource.map((restaurant: any) => {
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
    }).sort((a: any, b: any) => {
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
  }, [restaurants, isMobile, userLocation, permissionStatus, isHydrated, viewportWidth, calculateDistance, isMobileView]);

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

  // Track in-flight page to prevent duplicate fetches for the same page
  const inFlightPageRef = useRef<number | null>(null);

  // Use refs to avoid circular dependencies in useCallback
  const hasMoreRef = useRef(false);

  const handleLoadMore = useCallback(async () => {
      
      // Get current values using refs to avoid stale closures
      const currentItems = restaurants.length; // use raw list
      const nextPage = currentPage + 1;

      // Prevent duplicate requests for the same page
      if (inFlightPageRef.current === nextPage) {
        return;
      }

      console.log('🔄 Infinite scroll: Starting fetch', { 
        nextPage, 
        currentItems,
        totalRestaurants,
        hasMore: hasMoreRef.current
      });

      if (DEBUG) { 
        debugLog('Infinite scroll: Starting fetch', { 
          nextPage, 
          currentItems,
          totalRestaurants,
          hasMore: hasMoreRef.current
        }); 
      }

      inFlightPageRef.current = nextPage;
      try {
          // Use fetchCombinedData directly with append=true instead of separate API calls
          // This ensures we get consistent data and proper pagination
          const result = await fetchCombinedData(nextPage, searchQuery, activeFilters, mobileOptimizedItemsPerPage, true);
          // Update page and hasMore like Shuls: based on received count
          const received = result?.received ?? 0;
          const hasMoreContent = received >= mobileOptimizedItemsPerPage;
          if (setHasMoreRef.current) {
            setHasMoreRef.current(hasMoreContent);
          }
          setCurrentPage(nextPage);
          
          // After fetching, prefer server-provided hasMore; then totalPages; else estimate by counts.
          const hasMoreData = hasMoreContent;
          
          console.log('🔄 Infinite scroll: Loaded page', {
            nextPage,
            previousItems: currentItems,
            decidedBy: 'count-estimate',
            totalAvailable: totalRestaurants,
            totalPages,
            hasMore: hasMoreData,
            itemsPerPage: mobileOptimizedItemsPerPage
          });
          
          // Defer hasMore updates to the data-load effect to avoid stale decisions
          
          // Debug logging
          if (DEBUG) { 
            debugLog('Infinite scroll: Loaded page', nextPage, 'previous items:', currentItems, 'total available:', totalRestaurants, 'totalPages:', totalPages, 'hasMore:', hasMoreData); 
          }
          // Prefetch disabled to reduce duplication and races
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Request was aborted, ignore
        }
        // eslint-disable-next-line no-console
        console.error('Error fetching more restaurants:', err);
        // Immediately stop further loads on error to avoid loops
        if (setHasMoreRef.current) {
          setHasMoreRef.current(false);
        }
        // Back off after repeated failures to avoid infinite loading loop
        loadErrorCountRef.current += 1;
        if (DEBUG) { debugLog('Infinite scroll: Error occurred. Failure count =', loadErrorCountRef.current); }
      } finally {
        inFlightPageRef.current = null;
      }
    }, [currentPage, restaurants.length, mobileOptimizedItemsPerPage, totalRestaurants, fetchCombinedData, searchQuery, activeFilters, totalPages]);

  // Get infinite scroll hook after handleLoadMore is defined
  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    handleLoadMore,
    {
      // Match Shuls thresholds/rootMargin for consistent triggering
      threshold: 0.2,
      rootMargin: '200px', // Increased from 100px to match working version
      // Enable only when hydrated, not loading, and on mobile view (≤768px)
      disabled: !isHydrated || loading || !isMobileView
    }
  );

  // Update refs when infinite scroll state changes
  useEffect(() => {
    hasMoreRef.current = hasMore;
    setHasMoreRef.current = setHasMore;
  }, [hasMore, setHasMore]);

  // Add debugging for infinite scroll state changes
  useEffect(() => {
    console.log('🔄 Infinite scroll state changed:', {
      hasMore,
      isLoadingMore,
      isHydrated,
      restaurantsCount: restaurantsWithDistance.length,
      totalRestaurants
    });
  }, [hasMore, isLoadingMore, isHydrated, restaurantsWithDistance.length, totalRestaurants]);

  // Prevent early load triggers before initial data resolves
  useEffect(() => {
    if (setHasMore) {
      setHasMore(false);
      // will be set correctly after first data load effect
    }
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
  }, [currentPage, searchQuery, activeFilters, mobileOptimizedItemsPerPage, fetchCombinedData, isHydrated]);

  // Prefetch effect disabled to prevent race conditions with the sentinel loader

  // Update infinite scroll state when combined hook data loads (Shuls-style)
  useEffect(() => {
    if (restaurants && restaurants.length > 0 && !loading && setHasMore) {
      // Set hasMore based on whether we've loaded all items
      const totalLoadedItems = restaurants.length;
      const hasMoreData = totalLoadedItems >= mobileOptimizedItemsPerPage;
      
      console.log('🔄 Setting initial hasMore state:', {
        totalLoadedItems,
        totalRestaurants,
        hasMoreData
      });
      
      setHasMore(hasMoreData);
      
      if (DEBUG) {
        debugLog('Initial load for infinite scroll:', { 
          items: restaurants.length, 
          total: totalRestaurants, 
          hasMore: hasMoreData 
        });
      }
    }
  }, [restaurants, totalRestaurants, mobileOptimizedItemsPerPage, loading, setHasMore]);

  // Debug logging for totalRestaurants changes
  useEffect(() => {
    if (DEBUG) {
      console.log('🔍 totalRestaurants changed:', { 
        totalRestaurants, 
        restaurantsCount: restaurantsWithDistance.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [totalRestaurants, restaurantsWithDistance.length]);

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

  const displayedRestaurants = useMemo<(Restaurant | null)[]>(() => {
    const items: (Restaurant | null)[] = [...restaurantsWithDistance];
    if (isHydrated && isLoadingMore) {
      items.push(
        ...Array.from({ length: Math.min(mobileOptimizedItemsPerPage, 8) }).map((): null => null)
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
    if (page === currentPage) return;
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

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
    // Ensure viewport-height coverage while reserving space for bottom nav
    <div className="min-h-screen bg-transparent eatery-page page-with-bottom-nav">
      {/* Top Sentinel for Back to Top Button */}
      <div 
        id="top-sentinel" 
        aria-hidden="true" 
        className="absolute top-0 left-0 w-full h-1 pointer-events-none"
      />
      
      <div className="sticky top-0 z-50 bg-white">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
        </div>
        
        <ActionButtons 
          onShowFilters={handleShowFilters}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-eatery')}
        />
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
        <>
          {/* Eatery grid with reduced spacing - always 4 rows */}
          <div 
            className="restaurant-grid px-2 sm:px-4 lg:px-6"
            role="grid"
            aria-label="Restaurant listings"
            style={{ 
              contain: 'layout style paint',
              willChange: 'auto',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              perspective: '1000px'
            }}
          >
            {restaurantsWithDistance.map((restaurant: any, index: number) => (
              <div 
                key={restaurant?.id ?? index}
                className="w-full" 
                role="gridcell"
                style={{
                  contain: 'layout style paint',
                  willChange: 'auto',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
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
                      .replace(/[^a-z0-9\s-]/g, '')
                      .replace(/\s+/g, '-')
                      .replace(/-+/g, '-')
                      .trim();
                    router.push(`/eatery/${eateryName}`);
                  }}
                  priority={index < 4}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>

          {/* Loading states with reduced spacing */}
          {loading && (
            <div className="text-center py-3" role="status" aria-live="polite">
              <p>Loading restaurants...</p>
            </div>
          )}

          {/* Infinite scroll loading indicator - only show on mobile */}
          {isMobileView && isLoadingMore && (
            <div className="text-center py-3" role="status" aria-live="polite">
              <p>Loading more...</p>
            </div>
          )}

          {/* Infinite scroll trigger element - only on mobile */}
          {isMobileView && hasMore && (
            <div 
              ref={loadingRef}
              className="h-3 w-full my-3"
              aria-hidden="true"
            />
          )}

          {/* Desktop pagination - only show on desktop */}
          {!isMobileView && totalPages > 1 && (
            <div className="mt-4 mb-16" role="navigation" aria-label="Pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isLoading={loading}
                className="mb-2"
              />
              <div className="text-center text-sm text-gray-600">
                Showing {restaurants.length} of {totalRestaurants} restaurants
              </div>
            </div>
          )}

        </>
      )}
      
      {/* Loading states with reduced spacing */}
      {loading && (
        <div className="text-center py-3" role="status" aria-live="polite">
          <p>Loading restaurants...</p>
        </div>
      )}

      {/* Infinite scroll loading indicator - only show on mobile */}
      {isMobileView && isLoadingMore && (
        <div className="text-center py-3" role="status" aria-live="polite">
          <p>Loading more...</p>
        </div>
      )}
      




      {isHydrated && isLoadingMore && (
        // Fixed, non-layout-affecting loading toast to prevent bottom jump
        <div
          className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[60] px-3 py-2 rounded-full shadow-md bg-white/95 backdrop-blur border border-gray-200 flex items-center gap-2 text-sm text-gray-700"
          role="status"
          aria-live="polite"
          style={{
            bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 8px)'
          }}
        >
          <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <span>Loading more…</span>
        </div>
      )}

      {/* Bottom Navigation - rendered at page level to avoid stacking context issues */}
      <BottomNavigation size="compact" showLabels="active-only" />

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


    </div>
  );
}
