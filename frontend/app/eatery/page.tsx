'use client';

import React, { useState, useEffect, Fragment, useRef, useMemo, useTransition, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import ActionButtons from '@/components/layout/ActionButtons';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop, isMobileDevice } from '@/lib/utils/scrollUtils';
import { sortRestaurantsByDistance } from '@/lib/utils/distance';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';

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
  const [isPending, startTransition] = useTransition();
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('eatery');
  
  // Mobile optimization hooks
  const { isMobile, isTouch, viewportHeight, viewportWidth } = useMobileOptimization();
  const { isLowPowerMode, isSlowConnection } = useMobilePerformance();
  
  // Debug mobile detection
  useEffect(() => {

  }, [isMobile, isTouch, viewportWidth, viewportHeight]);
  
  // Mobile gesture support
  const { onTouchStart, onTouchMove, onTouchEnd } = useMobileGestures(
    () => router.push('/marketplace'), // Swipe left to marketplace
    () => router.push('/favorites'),   // Swipe right to favorites
    () => scrollToTop(),               // Swipe up to scroll to top
    () => window.scrollTo(0, document.body.scrollHeight) // Swipe down to bottom
  );
  
  // WebSocket for real-time updates
  const { isConnected, sendMessage } = useWebSocket();
  
  // URL-backed filter state
  const {
    activeFilters,
    hasActiveFilters,
    setFilter,
    toggleFilter,
    clearFilter,
    clearAllFilters,
    getFilterCount,
    updateFilters
  } = useAdvancedFilters();
  
  // Location state from context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
    setError: setLocationError
  } = useLocation();

  // Performance optimization for mobile
  const mobileOptimizedItemsPerPage = useMemo(() => {
    if (isLowPowerMode) {
      return 4; // Reduce items in low power mode
    }
    if (isSlowConnection) {
      return 6; // Reduce items on slow connection
    }
    
    // Calculate items per page to ensure exactly 4 rows on every screen size
    if (isMobile) {
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
  }, [isMobile, isLowPowerMode, isSlowConnection, viewportWidth]);

  // Infinite scroll with proper mobile detection
  const { loadMore, hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    () => fetchMoreRestaurants(),
    { 
      threshold: isMobile ? 0.2 : 0.3, 
      rootMargin: isMobile ? '100px' : '200px',
      disabled: !isMobile // Only enable infinite scroll on mobile
    }
  );

  // Debug infinite scroll setup
  useEffect(() => {

  }, [isMobile, hasMore, isLoadingMore]);

  // Mobile-optimized state
  const [showFilters, setShowFilters] = useState(false); // Filters start hidden
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle filter changes with mobile optimization
  const handleFilterChange = (filterType: keyof Filters, value: Filters[keyof Filters]) => {
    setFilter(filterType, value);
    
    // Send real-time filter update via WebSocket
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
  };

  const handleToggleFilter = (filterType: keyof Filters) => {
    toggleFilter(filterType);
  };

  const handleDistanceChange = (distance: number) => {
    setFilter('maxDistanceMi', distance);
  };

  // Transform restaurant data to UnifiedCard format
  const transformRestaurantToCardData = (restaurant: Restaurant) => {
    // Enhanced rating logic with better fallbacks
    const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating || restaurant.quality_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    
    // Enhanced distance logic - ensure we have a valid distance string
    const distanceText = restaurant.distance && restaurant.distance.trim() !== '' ? restaurant.distance : '';
    
    // Debug logging for distance
    if (userLocation && restaurant.distance) {
      console.log(`Restaurant: ${restaurant.name}, Distance: "${restaurant.distance}", DistanceText: "${distanceText}"`);
    }
    
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
  };

  const handleClearAllFilters = () => {
    clearAllFilters();
  };

  // Mobile-optimized location handling with context
  const handleRequestLocation = async () => {
    // Use the context's requestLocation
    requestLocation();
    
    // Update filters when location is available (this will be handled by useEffect below)
    // Send location update via WebSocket when location changes (this will be handled by useEffect below)
  };

  // Mobile-optimized scroll handling
  const handleScroll = () => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
        console.log('User location available, calculating distances...');
        console.log('User location:', userLocation);
        console.log('Restaurants before distance calculation:', response.restaurants.length);
        
        processedRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
        
        console.log('Restaurants after distance calculation:', processedRestaurants.length);
        console.log('Sample restaurant with distance:', processedRestaurants[0]?.name, processedRestaurants[0]?.distance);
      } else {
        console.log('No user location available, skipping distance calculation');
      }
      
      setRestaurants(processedRestaurants);
      setCurrentPage(1);
      
      // Update hasMore state for infinite scroll
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

  // Handle real-time updates
  useEffect(() => {
    if (isConnected) {
      // Listen for restaurant status updates
      const handleRestaurantUpdate = (data: any) => {
        setRestaurants(prev => 
          prev.map(restaurant => 
            restaurant.id === data.restaurant_id 
              ? { ...restaurant, status: data.status }
              : restaurant
          )
        );
      };

      // Listen for open now updates
      const handleOpenNowUpdate = (data: any) => {
        setRestaurants(prev => 
          prev.map(restaurant => 
            restaurant.id === data.restaurant_id 
              ? { ...restaurant, is_open: data.is_open }
              : restaurant
          )
        );
      };

      // Add event listeners (implementation depends on your WebSocket hook)
      // websocket.on('restaurant_status_update', handleRestaurantUpdate);
      // websocket.on('open_now_update', handleOpenNowUpdate);
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
    if (isMobile && isScrolling) {
      setShowFilters(false);
    }
  }, [isMobile, isScrolling]);

  // Mobile-optimized styles
  const mobileOptimizedStyles = useMemo(() => ({
    container: {
      minHeight: isMobile ? viewportHeight : 'auto',
      padding: isMobile ? '8px' : '16px',
      // Remove backgroundColor override to let CSS handle it
    },
    filtersContainer: {
      position: isMobile ? 'fixed' as const : 'relative' as const,
      top: isMobile ? '0' : 'auto',
      left: isMobile ? '0' : 'auto',
      right: isMobile ? '0' : 'auto',
      zIndex: isMobile ? 1000 : 'auto',
      backgroundColor: isMobile ? 'white' : 'transparent',
      boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
      transform: isMobile ? (showFilters ? 'translateY(0)' : 'translateY(-100%)') : 'none',
      transition: isMobile ? 'transform 0.3s ease' : 'none',
    },
    // Remove conflicting grid styles - let CSS handle the responsive grid
    loadMoreButton: {
      ...mobileStyles.touchButton,
      width: isMobile ? '100%' : 'auto',
      margin: isMobile ? '16px 8px' : '16px',
    }
  }), [isMobile, viewportHeight, showFilters]);

  if (error) {
    return (
      <div style={mobileOptimizedStyles.container}>
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
      style={mobileOptimizedStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
          />
          
          {/* Filters Panel */}
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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

      {/* Restaurant grid with mobile optimization */}
      {restaurants.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
          <p style={{ fontSize: '18px', color: '#666' }}>No restaurants found</p>
          <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <div className="restaurant-grid">
          {restaurants.map((restaurant, index) => (
            <UnifiedCard
              key={restaurant.id}
              data={transformRestaurantToCardData(restaurant)}
              variant="default"
              showStarInBadge={true}
              onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
              onLikeToggle={(id, isLiked) => {
                // Handle favorite toggle - this will be managed by the UnifiedCard component
                // The component will automatically sync with the favorites manager
              }}
              className="hover:shadow-lg transition-shadow duration-200"
            />
          ))}
        </div>
      )}

      {/* Mobile-optimized loading states */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Loading restaurants...</p>
        </div>
      )}

      {/* Infinite scroll loading indicator - only show on mobile */}
      {isMobile && isLoadingMore && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Loading more...</p>
        </div>
      )}

      {/* Infinite scroll trigger element - only on mobile */}
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

      {/* Desktop pagination - only show on desktop */}
      {!isMobile && hasMore && !loading && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          style={mobileOptimizedStyles.loadMoreButton}
        >
          {isLoadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNavigation />
      )}
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
