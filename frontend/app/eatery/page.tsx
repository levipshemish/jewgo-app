'use client';

// Force dynamic rendering to avoid SSR issues with URL parameters
export const dynamic = 'force-dynamic';

/// <reference types="node" />
import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import { EateryFilters } from '@/components/eatery/EateryFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop } from '@/lib/utils/scrollUtils';
import { sortRestaurantsByDistance } from '@/lib/utils/distance';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
import { appLogger } from '@/lib/utils/logger';

import { Restaurant } from '@/lib/types/restaurant';
import { Filters, toSearchParams } from '@/lib/filters/schema';

// Loading component for Suspense fallback
function EateryPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component
function EateryPageContent() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true); // initial load only
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile optimization hooks
  const { isMobile, viewportHeight, viewportWidth } = useMobileOptimization();
  const { isLowPowerMode, isSlowConnection } = useMobilePerformance();
  
  // Ensure mobile detection is working correctly
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  // Mobile gesture support
  const { onTouchStart, onTouchMove, onTouchEnd } = useMobileGestures(
    () => router.push('/marketplace'), // Swipe left to marketplace
    () => router.push('/favorites'),   // Swipe right to favorites
    () => scrollToTop(),               // Swipe up to scroll to top
    () => window.scrollTo(0, document.body.scrollHeight) // Swipe down to bottom
  );
  
  // WebSocket for real-time updates (currently disabled)
  const { isConnected, sendMessage } = useWebSocket();
  
  // URL-backed filter state
  const {
    activeFilters,
    setFilter,
    clearFilter
  } = useAdvancedFilters();

  // Create a stable key for filters to prevent effect loops due to object identity
  const filtersKey = useMemo(() => {
    const entries = Object.entries(activeFilters)
      .filter(([, value]) => value !== undefined && value !== '' && value !== null)
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
  }, [activeFilters]);
  
  // Location state from context
  const {
    userLocation,
    isLoading: locationLoading
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(false);
  const [isSettingLocationFilters, setIsSettingLocationFilters] = useState(false);
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout | null>(null);
  // const fetchRestaurantsDataRef = useRef<typeof fetchRestaurantsData | null>(null); // Removed - not needed

  // Standard 4-rows pagination - always show exactly 4 rows
  const mobileOptimizedItemsPerPage = useMemo(() => {
    // TEMPORARY FIX: Hardcode to 20 to match API response
    return 20;
    
    // Calculate items per page to ensure exactly 4 rows on every screen size
    if (isMobile || isMobileDevice) {
      return 8; // 4 rows × 2 columns = 8 items
    } else {
      // For desktop, calculate based on viewport width to ensure 4 rows
      let columnsPerRow = 3; // Default fallback
      
      if (viewportWidth >= 1441) {
        columnsPerRow = 6; // Large desktop: 6 columns × 4 rows = 24 items
      } else if (viewportWidth >= 1025) {
        columnsPerRow = 5; // Desktop: 5 columns × 4 rows = 20 items
      } else if (viewportWidth >= 769) {
        columnsPerRow = 4; // Tablet: 4 columns × 4 rows = 16 items
      } else if (viewportWidth >= 641) {
        columnsPerRow = 3; // Small tablet: 3 columns × 4 rows = 12 items
      }
      
      const result = columnsPerRow * 4; // Always 4 rows
      
      appLogger.debug('Mobile optimization', {
        isMobile,
        isMobileDevice,
        viewportWidth,
        columnsPerRow,
        result
      });
      
      return result;
    }
  }, [isMobile, isMobileDevice, viewportWidth]);

  // Memoize restaurant transformation to prevent unnecessary re-renders
  const transformRestaurantToCardData = useCallback((restaurant: Restaurant) => {
    // Enhanced rating logic with better fallbacks
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating || restaurant.quality_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    
    // Enhanced distance logic - ensure we have a valid distance string
    const distanceText = restaurant.distance && restaurant.distance.trim() !== '' ? restaurant.distance : '';
    
    // Enhanced price range logic - ensure we have a valid price range
    const priceRange = restaurant.price_range && restaurant.price_range.trim() !== '' ? restaurant.price_range : '';
    
    return {
      id: restaurant.id,
      imageUrl: restaurant.image_url,
      imageTag: restaurant.kosher_category,
      title: restaurant.name,
      badge: ratingText, // Use the enhanced rating text
      subtitle: priceRange,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: restaurant.kosher_category,
      priceRange: restaurant.price_range,
      minAvgMealCost: restaurant.min_avg_meal_cost,
      maxAvgMealCost: restaurant.max_avg_meal_cost,
      rating,
      reviewCount: restaurant.review_count,
      city: restaurant.city,
      distance: restaurant.distance,
      isCholovYisroel: restaurant.is_cholov_yisroel,
      isPasYisroel: restaurant.is_pas_yisroel,
    };
  }, []); // Empty dependency array to prevent recreation

  // Memoize filter change handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
    // Apply all the new filters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (key in activeFilters || value !== undefined) {
        setFilter(key as keyof Filters, value);
      }
    });
    
    // Send real-time filter update via WebSocket (currently disabled)
    if (isConnected) {
      sendMessage({
        type: 'filter_update',
        data: {
          filters: newFilters,
          location: userLocation
        }
      });
    }
  }, [setFilter, isConnected, sendMessage, userLocation, activeFilters]);

  // Handle search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Trigger data fetch with search query
    fetchRestaurantsData();
  }, [setSearchQuery, setCurrentPage]);

  // Precompute stable card data to avoid re-creating objects every render
  const cardDataList = useMemo(() => {
    return restaurants.map((r) => transformRestaurantToCardData(r));
  }, [restaurants, transformRestaurantToCardData]);

  // Infinite scroll with proper mobile detection
  const { hasMore, isLoadingMore, loadingRef, setHasMore, setIsLoadingMore } = useInfiniteScroll(
    () => fetchMoreRestaurants(),
    { 
      threshold: (isMobile || isMobileDevice) ? 0.2 : 0.3, 
      rootMargin: (isMobile || isMobileDevice) ? '100px' : '200px',
      disabled: !(isMobile || isMobileDevice) // Only enable infinite scroll on mobile
    }
  );

  // Mobile-optimized state
  const [showFilters, setShowFilters] = useState(false); // Filters start hidden
  const { isScrolling } = useScrollDetection({ debounceMs: 100 });



  // Handle page changes for desktop pagination
  const handlePageChange = async (page: number) => {
    if (page === currentPage || loading) {
      return;
    }

    try {
      setLoading(true);
      // Build params from filters for consistency
      const params = toSearchParams({ ...activeFilters, page, limit: mobileOptimizedItemsPerPage });
      if (searchQuery && searchQuery.trim() !== '') {
        params.set('search', searchQuery.trim());
      }
      params.set('mobile_optimized', 'true');

      // Validate the query string to prevent malformed URLs
      const queryString = params.toString();
      if (queryString && !/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(queryString)) {
        throw new Error('Invalid characters in query parameters');
      }

      // Additional safety check to prevent URLs that could be interpreted as JavaScript
      if (queryString && (
        queryString.includes('<script') || 
        queryString.includes('javascript:') ||
        queryString.includes('data:text/html') ||
        queryString.includes('vbscript:')
      )) {
        throw new Error('Potentially dangerous URL content detected');
      }

      // Call the working API endpoint directly
      const response = await fetch(`/api/restaurants-with-images?${queryString}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch restaurants');
      }

      // Ensure data.data is always an array to prevent "e.map is not a function" error
      let processedRestaurants = [];
      if (data.data && Array.isArray(data.data)) {
        processedRestaurants = data.data;
      } else if (data.restaurants && Array.isArray(data.restaurants)) {
        processedRestaurants = data.restaurants;
      } else if (Array.isArray(data)) {
        processedRestaurants = data;
      } else {
        // If no valid array found, use empty array
        processedRestaurants = [];
        appLogger.warn('API returned non-array data in handlePageChange', { data });
      }

      // Apply distance calculation to new restaurants if location is available
      if (userLocation) {
        processedRestaurants = sortRestaurantsByDistance(processedRestaurants, userLocation);
      }
      
      setRestaurants(processedRestaurants);
      setCurrentPage(page);
      // Keep URL filter state in sync with current page
      setFilter('page', page as any);
    } catch (loadError) {
      appLogger.error('Eatery page load error', { error: String(loadError) });
    } finally {
      setLoading(false);
    }
  };







  // Handle location changes and update filters
  useEffect(() => {
    if (userLocation) {
      // Set flag to prevent API calls during automatic location filter setting
      setIsSettingLocationFilters(true);
      
      // Update filters with location
      setFilter('lat', userLocation.latitude);
      setFilter('lng', userLocation.longitude);
      setFilter('nearMe', true);
      setFilter('maxDistanceMi', 25); // Set default distance filter when location is available
      
      // Send location update via WebSocket
      if (isConnected) {
        sendMessage({
          type: 'location_update',
          data: { latitude: userLocation.latitude, longitude: userLocation.longitude }
        });
      }
      
      // Reset flag after a short delay to allow filter updates to complete
      setTimeout(() => {
        setIsSettingLocationFilters(false);
      }, 100);
    } else {
      // Set flag to prevent API calls during automatic location filter clearing
      setIsSettingLocationFilters(true);
      
      // Clear distance-related filters when no location is available
      clearFilter('lat');
      clearFilter('lng');
      clearFilter('nearMe');
      clearFilter('maxDistanceMi');
      
      // Reset flag after a short delay to allow filter updates to complete
      setTimeout(() => {
        setIsSettingLocationFilters(false);
      }, 100);
    }
  }, [userLocation, setFilter, clearFilter, isConnected, sendMessage]);

  // Clear distance when Near Me is turned off
  useEffect(() => {
    if (!activeFilters.nearMe) {
      clearFilter('maxDistanceMi');
    }
  }, [activeFilters.nearMe, clearFilter]);

  // Fetch restaurants with mobile optimization and distance sorting
  const fetchRestaurantsData = useCallback(async (filters?: Filters) => {
    // Prevent API calls when automatically setting location filters
    if (isSettingLocationFilters) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const currentFilters = filters || activeFilters;
      const params = toSearchParams({ ...currentFilters, page: 1, limit: mobileOptimizedItemsPerPage });
      if (searchQuery && searchQuery.trim() !== '') {
        params.set('search', searchQuery.trim());
      }
      params.set('mobile_optimized', 'true');

      // Validate the query string to prevent malformed URLs
      const queryString = params.toString();
      if (queryString && !/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(queryString)) {
        throw new Error('Invalid characters in query parameters');
      }

      // Additional safety check to prevent URLs that could be interpreted as JavaScript
      if (queryString && (
        queryString.includes('<script') || 
        queryString.includes('javascript:') ||
        queryString.includes('data:text/html') ||
        queryString.includes('vbscript:')
      )) {
        throw new Error('Potentially dangerous URL content detected');
      }

      // Call the working API endpoint directly
      const response = await fetch(`/api/restaurants-with-images?${queryString}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch restaurants');
      }

      // Ensure data.data is always an array to prevent "e.map is not a function" error
      let processedRestaurants = [];
      if (data.data && Array.isArray(data.data)) {
        processedRestaurants = data.data;
      } else if (data.restaurants && Array.isArray(data.restaurants)) {
        processedRestaurants = data.restaurants;
      } else if (Array.isArray(data)) {
        processedRestaurants = data;
      } else {
        // If no valid array found, use empty array
        processedRestaurants = [];
        appLogger.warn('API returned non-array data in fetchRestaurantsData', { data });
      }

      // Apply distance calculation to new restaurants if location is available
      if (userLocation) {
        processedRestaurants = sortRestaurantsByDistance(processedRestaurants, userLocation);
      }
      
      setRestaurants(processedRestaurants);
      setCurrentPage(1);
      
      // Update pagination state
      const total = data.total || data.count || processedRestaurants.length;
      setTotalRestaurants(total);
      const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      // Update hasMore state for infinite scroll (mobile only)
      const hasMoreContent = processedRestaurants.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
    } catch (fetchError) {
      appLogger.error('Eatery fetch error', { error: String(fetchError) });
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError('Unable to load restaurants. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, mobileOptimizedItemsPerPage, isSettingLocationFilters, userLocation, activeFilters]);

  // Handle location-based data fetching after filters are set
  useEffect(() => {
    // Only fetch data if we're not currently setting location filters and we have a location
    if (!isSettingLocationFilters && userLocation) {
      // Small delay to ensure filters have been applied
      const timeout = setTimeout(() => {
        fetchRestaurantsData();
      }, 150);
      
      return () => clearTimeout(timeout);
    }
  }, [userLocation, isSettingLocationFilters, fetchRestaurantsData]);

  // Remove the shouldFetchData pattern entirely
  // useEffect(() => {
  //   if (shouldFetchData && typeof fetchRestaurantsData === 'function') {
  //     fetchRestaurantsData();
  //     setShouldFetchData(false);
  //   }
  // }, [shouldFetchData, fetchRestaurantsData]);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
    // Only show prompt if we haven't shown it before and user doesn't have location
    if (!hasShownLocationPrompt && !userLocation && !locationLoading) {
      setShowLocationPrompt(true);
      setHasShownLocationPrompt(true);
    }
  }, [hasShownLocationPrompt, userLocation, locationLoading]);

  // Close location prompt when user gets location
  useEffect(() => {
    if (showLocationPrompt && userLocation) {
      setShowLocationPrompt(false);
    }
  }, [showLocationPrompt, userLocation]);

  // Store the function in ref to avoid circular dependencies
  // Remove this effect to eliminate circular dependency
  // useEffect(() => {
  //   fetchRestaurantsDataRef.current = fetchRestaurantsData;
  // }, [fetchRestaurantsData]);

  // Separate function for fetching data with current page (for filter changes)
  const fetchDataWithCurrentPage = useCallback(async () => {
    if (currentPage === 1) {
      // If we're on page 1, use the regular fetchRestaurantsData
      if (typeof fetchRestaurantsData === 'function') {
        await fetchRestaurantsData(activeFilters);
      }
    } else {
      // If we're on a different page, fetch that specific page
      await handlePageChange(currentPage);
    }
  }, [currentPage, activeFilters, fetchRestaurantsData]);

  // Remove the complex fetchMoreRestaurants function - we don't need it with proper pagination

  // Add back the simple fetchMoreRestaurants function for mobile infinite scroll
  const fetchMoreRestaurants = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const params = toSearchParams({ ...activeFilters, page: nextPage, limit: mobileOptimizedItemsPerPage });
      if (searchQuery && searchQuery.trim() !== '') {
        params.set('search', searchQuery.trim());
      }
      params.set('mobile_optimized', 'true');

      // Validate the query string to prevent malformed URLs
      const queryString = params.toString();
      if (queryString && !/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(queryString)) {
        throw new Error('Invalid characters in query parameters');
      }

      // Additional safety check to prevent URLs that could be interpreted as JavaScript
      if (queryString && (
        queryString.includes('<script') || 
        queryString.includes('javascript:') ||
        queryString.includes('data:text/html') ||
        queryString.includes('vbscript:')
      )) {
        throw new Error('Potentially dangerous URL content detected');
      }

      appLogger.debug('Fetching more restaurants', {
        nextPage,
        url: `/api/restaurants-with-images?${queryString}`,
        mobileOptimizedItemsPerPage
      });

      // Call the working API endpoint directly
      const response = await fetch(`/api/restaurants-with-images?${queryString}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch restaurants');
      }

      // Ensure data.data is always an array to prevent "e.map is not a function" error
      let processedNewRestaurants = [];
      if (data.data && Array.isArray(data.data)) {
        processedNewRestaurants = data.data;
      } else if (data.restaurants && Array.isArray(data.restaurants)) {
        processedNewRestaurants = data.restaurants;
      } else if (Array.isArray(data)) {
        processedNewRestaurants = data;
      } else {
        // If no valid array found, use empty array
        processedNewRestaurants = [];
        appLogger.warn('API returned non-array data for more restaurants', { data });
      }

      // Apply distance calculation to new restaurants if location is available
      if (userLocation) {
        processedNewRestaurants = sortRestaurantsByDistance(processedNewRestaurants, userLocation);
      }
      
      setRestaurants(prev => [...prev, ...processedNewRestaurants]);
      setCurrentPage(nextPage);
      
      // Update hasMore state based on response
      const hasMoreContent = processedNewRestaurants.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
    } catch (fetchMoreError) {
      appLogger.error('Eatery fetch more error', { error: String(fetchMoreError) });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (isConnected) {
      // Subscribe to restaurant updates
      sendMessage({
        type: 'subscribe',
        data: { room_id: 'restaurant_updates' }
      });
      
      // Subscribe to open now updates
      sendMessage({
        type: 'subscribe',
        data: { room_id: 'open_now_updates' }
      });
    }
  }, [isConnected, sendMessage]);

  // Handle real-time updates (currently disabled)
  useEffect(() => {
    if (isConnected) {
      // WebSocket functionality is currently disabled
      // TODO: Re-enable when backend supports WebSocket
    }
  }, [isConnected]);

  // Initial data fetch
  useEffect(() => {
    // Only fetch if we haven't already fetched
    if (restaurants.length === 0) {
      fetchRestaurantsData();
    }
  }, [fetchRestaurantsData]); // Only depend on fetchRestaurantsData, not restaurants.length

  // Handle filter changes while preserving current page
  useEffect(() => {
    // Skip API calls when automatically setting location filters
    if (isSettingLocationFilters) {
      return;
    }
    
    // Ensure fetchDataWithCurrentPage is available
    if (typeof fetchDataWithCurrentPage !== 'function') {
      return;
    }
    
    // Clear any existing timeout
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
    
    // Debounce the API call to prevent rapid successive calls
    const timeout = setTimeout(() => {
      fetchDataWithCurrentPage();
    }, 300); // 300ms debounce
    
    setFetchTimeout(timeout);
    
    // Cleanup timeout on unmount
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [filtersKey, fetchDataWithCurrentPage, isSettingLocationFilters]); // Removed fetchTimeout from dependencies

  // Mobile-optimized filter changes
  // Remove redundant filter-change effect; fetchRestaurantsData already depends on filtersKey

  // Mobile-specific effects
  useEffect(() => {
    // Auto-hide filters on mobile when scrolling
    if ((isMobile || isMobileDevice) && isScrolling) {
      setShowFilters(false);
    }
  }, [isMobile, isMobileDevice, isScrolling]);

  // Consistent responsive styles
  const responsiveStyles = useMemo(() => {
    const isMobileView = isMobile || isMobileDevice;
    const styles = {
      container: {
        minHeight: isMobileView ? viewportHeight : 'auto',
        // Use consistent padding across all screen sizes
      },
      filtersContainer: {
        position: isMobileView ? 'fixed' as const : 'relative' as const,
        top: isMobileView ? 'auto' : '0',
        bottom: isMobileView ? '0' : 'auto',
        left: isMobileView ? '0' : 'auto',
        right: isMobileView ? '0' : 'auto',
        zIndex: isMobileView ? 50 : 'auto',
        backgroundColor: isMobileView ? 'white' : 'transparent',
        borderTop: isMobileView ? '1px solid #e5e7eb' : 'none',
        borderRadius: isMobileView ? '16px 16px 0 0' : '0',
        boxShadow: isMobileView ? '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        maxHeight: isMobileView ? '80vh' : 'auto',
        overflowY: isMobileView ? 'auto' as const : 'visible' as const,
      },
      loadMoreButton: {
        ...mobileStyles.touchButton,
        width: isMobileView ? '100%' : 'auto',
        margin: isMobileView ? '16px 8px' : '16px',
      }
    };

    return styles;
  }, [isMobile, isMobileDevice, viewportHeight, viewportWidth, isLowPowerMode, isSlowConnection]);

  if (error) {
    return (
      <div style={responsiveStyles.container}>
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={() => setShowFilters(!showFilters)}
        />
        
        {/* Navigation Tabs - Always visible */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
          <CategoryTabs activeTab="eatery" />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (typeof fetchRestaurantsData === 'function') {
                fetchRestaurantsData();
              }
            }}
            className="px-6 py-3 bg-[#4ade80] text-white rounded-lg hover:bg-[#22c55e] transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#f4f4f4] pb-20"
      style={responsiveStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Restaurant listings"
    >
      <Header 
        onSearch={handleSearch}
        placeholder="Search restaurants..."
        showFilters={true}
        onShowFilters={() => setShowFilters(!showFilters)}
      />
      
      {/* Navigation Tabs - Always visible */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
        <CategoryTabs activeTab="eatery" />
      </div>
      
      {/* Action buttons */}
      <ActionButtons 
        onShowFilters={() => setShowFilters(!showFilters)}
        onShowMap={() => router.push('/live-map')}
        onAddEatery={() => router.push('/add-eatery')}
      />
      
      {/* Eatery Filters */}
      <EateryFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFilterChange}
        currentFilters={activeFilters}
      />

      {/* Restaurant grid with consistent responsive spacing */}
      {restaurants.length === 0 && !loading ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🍽️</div>
          <p className="text-lg text-gray-600 mb-2">No restaurants found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid px-4 sm:px-6 lg:px-8"
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
          {restaurants.map((restaurant, index) => (
            <div 
              key={restaurant.id} 
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
                data={cardDataList[index]}
                variant="default"
                showStarInBadge={true}
                isScrolling={isScrolling}
                priority={index < 4} // Add priority to first 4 images for LCP optimization
                onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading states: only show on true initial load */}
      {loading && restaurants.length === 0 && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading restaurants...</p>
        </div>
      )}

      {/* Infinite scroll loading indicator - only show on mobile; avoid layout shift */}
      {(isMobile || isMobileDevice) && isLoadingMore && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading more...</p>
        </div>
      )}

      {/* Desktop pagination - only show on desktop */}
      {(() => {
        const shouldShowPagination = !(isMobile || isMobileDevice) && totalPages > 1;
        return shouldShowPagination ? (
          <div className="mt-8 mb-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={loading}
              className="mb-4"
            />
            <div className="text-center text-sm text-gray-600">
              Showing {restaurants.length} of {totalRestaurants} restaurants
            </div>
          </div>
        ) : null;
      })()}

      {/* Mobile infinite scroll trigger - only on mobile */}
      {isMobile && hasMore && (
        <div 
          ref={loadingRef}
          style={{ 
            height: '20px', 
            width: '100%',
            margin: '20px 0'
          }}
        />
      )}

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation />

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

export default function EateryPage() {
  return (
    <Suspense fallback={<EateryPageLoading />}>
      <EateryPageContent />
    </Suspense>
  );
}
