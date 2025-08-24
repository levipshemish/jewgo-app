'use client';

import React, { useState, useEffect, Fragment, useRef, useMemo, Suspense, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop } from '@/lib/utils/scrollUtils';
import { sortRestaurantsByDistance } from '@/lib/utils/distance';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import { LocationPromptPopup } from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';

import { Restaurant } from '@/lib/types/restaurant';
import { Filters } from '@/lib/filters/schema';

// Loading component for Suspense fallback
function EateryPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component that uses useSearchParams
function EateryPageContent() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  
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
    hasActiveFilters,
    setFilter,
    toggleFilter,
    clearFilter,
    clearAllFilters
  } = useAdvancedFilters();
  
  // Location state from context
  const {
    userLocation,
    isLoading: locationLoading,
    requestLocation
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(false);

  // Performance optimization for mobile
  const mobileOptimizedItemsPerPage = useMemo(() => {
    if (isLowPowerMode) {
      return 4; // Reduce items in low power mode
    }
    if (isSlowConnection) {
      return 6; // Reduce items on slow connection
    }
    
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
      
      return columnsPerRow * 4; // Always 4 rows
    }
  }, [isMobile, isMobileDevice, isLowPowerMode, isSlowConnection, viewportWidth]);

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
  const handleFilterChange = useCallback((filterType: keyof Filters, value: Filters[keyof Filters]) => {
    setFilter(filterType, value);
    
    // Send real-time filter update via WebSocket (currently disabled)
    if (isConnected) {
      sendMessage({
        type: 'filter_update',
        data: {
          filter_type: filterType,
          filter_value: value,
          location: userLocation
        }
      });
    }
  }, [setFilter, isConnected, sendMessage, userLocation]);

  const handleToggleFilter = useCallback((filterType: keyof Filters) => {
    toggleFilter(filterType);
  }, [toggleFilter]);

  const handleClearAllFilters = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  // Infinite scroll with proper mobile detection
  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
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
      const params = new URLSearchParams();
      
      // Add current filters
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      params.append('page', page.toString());
      params.append('limit', mobileOptimizedItemsPerPage.toString());
      params.append('mobile_optimized', 'true');

      const response = await fetchRestaurants(mobileOptimizedItemsPerPage, params.toString());

      // Apply distance calculation to new restaurants if location is available
      let processedRestaurants = response.restaurants;
      if (userLocation) {
        processedRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
      }
      
      setRestaurants(processedRestaurants);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching page:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mobile-optimized location handling with context
  const handleRequestLocation = async () => {
    // Use the context's requestLocation
    requestLocation();
    
    // Update filters when location is available (this will be handled by useEffect below)
    // Send location update via WebSocket when location changes (this will be handled by useEffect below)
  };



  // Handle location changes and update filters
  useEffect(() => {
    if (userLocation) {
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
    } else {
      // Clear distance-related filters when no location is available
      clearFilter('lat');
      clearFilter('lng');
      clearFilter('nearMe');
      clearFilter('maxDistanceMi');
    }
  }, [userLocation, setFilter, clearFilter, isConnected, sendMessage]);

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

  // Fetch restaurants with mobile optimization and distance sorting
  const fetchRestaurantsData = async (filters: Filters = activeFilters) => {
    try {
      setLoading(true);
      setError(null);

      // Mobile-optimized parameters
      const params = new URLSearchParams();
      
      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      // Mobile-specific optimizations
      params.append('limit', mobileOptimizedItemsPerPage.toString());
      params.append('mobile_optimized', 'true');
      
      if (isLowPowerMode) {
        params.append('low_power_mode', 'true');
      }
      
      if (isSlowConnection) {
        params.append('slow_connection', 'true');
      }

      const response = await fetchRestaurants(mobileOptimizedItemsPerPage, params.toString());

      // Apply distance calculation and sorting if location is available
      let processedRestaurants = response.restaurants;
      if (userLocation) {
        processedRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
      }
      
      setRestaurants(processedRestaurants);
      setCurrentPage(1);
      
      // Update pagination state
      const total = response.total || response.restaurants.length;
      setTotalRestaurants(total);
      const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      // Update hasMore state for infinite scroll (mobile only)
      const hasMoreContent = response.restaurants.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load restaurants. Please try again later.');
      }
      setRestaurants([]); // Clear any existing restaurants
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreRestaurants = async () => {
    if (isLoadingMore || !hasMore) {

      return;
    }

    try {
      const nextPage = currentPage + 1;
      const params = new URLSearchParams();
      
      // Add current filters
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      params.append('page', nextPage.toString());
      params.append('limit', mobileOptimizedItemsPerPage.toString());
      params.append('mobile_optimized', 'true');

      const response = await fetchRestaurants(mobileOptimizedItemsPerPage, params.toString());

      // Apply distance calculation to new restaurants if location is available
      let processedNewRestaurants = response.restaurants;
      if (userLocation) {

        processedNewRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
      }
      
      setRestaurants(prev => [...prev, ...processedNewRestaurants]);
      setCurrentPage(nextPage);
      
      // Update hasMore state
      const hasMoreContent = response.restaurants.length >= mobileOptimizedItemsPerPage;

      setHasMore(hasMoreContent);
    } catch (err) {
      console.error('Error fetching more restaurants:', err);
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
    fetchRestaurantsData();
  }, []);

  // Mobile-optimized filter changes
  useEffect(() => {
    if (hasActiveFilters) {
      startTransition(() => {
        fetchRestaurantsData();
      });
    }
  }, [activeFilters]);

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
        <Header />
        
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
              fetchRestaurantsData();
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
      className="min-h-screen bg-[#f4f4f4]"
      style={responsiveStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Restaurant listings"
    >
      <Header />
      
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
      
      {/* Filters Modal/Overlay */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
          
          {/* Filters Panel */}
          <div 
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-50 max-h-[80vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-title"
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 id="filters-title" className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close filters"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Filters */}
              <AdvancedFilters
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onToggleFilter={handleToggleFilter}
                onClearAll={handleClearAllFilters}
                userLocation={userLocation}
                locationLoading={locationLoading}
                onRequestLocation={handleRequestLocation}
              />
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-6 py-2 bg-[#4ade80] text-white rounded-lg hover:bg-[#22c55e] transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
                data={transformRestaurantToCardData(restaurant)}
                variant="default"
                showStarInBadge={true}
                priority={index < 4} // Add priority to first 4 images for LCP optimization
                onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading states with consistent spacing */}
      {loading && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading restaurants...</p>
        </div>
      )}

      {/* Infinite scroll loading indicator - only show on mobile */}
      {(isMobile || isMobileDevice) && isLoadingMore && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading more...</p>
        </div>
      )}

      {/* Infinite scroll trigger element - only on mobile */}
      {(isMobile || isMobileDevice) && hasMore && (
        <div 
          ref={loadingRef}
          className="h-5 w-full my-5"
          aria-hidden="true"
        />
      )}

      {/* Desktop pagination - only show on desktop */}
      {!(isMobile || isMobileDevice) && totalPages > 1 && (
        <div className="mt-8 mb-8" role="navigation" aria-label="Pagination">
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
      )}

      {/* Mobile infinite scroll trigger - only on mobile */}
      {(isMobile || isMobileDevice) && hasMore && (
        <div 
          ref={loadingRef}
          className="h-5 w-full my-5"
          aria-hidden="true"
        />
      )}

      {/* Mobile bottom navigation - ensure it's always visible on mobile */}
      {(isMobile || isMobileDevice) && (
        <BottomNavigation />
      )}

      {/* Location Prompt Popup */}
      <LocationPromptPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onLocationGranted={() => {
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
