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
    console.log('Mobile detection:', { 
      isMobile, 
      isTouch, 
      viewportWidth, 
      viewportHeight,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'N/A'
    });
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
  
  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Performance optimization for mobile
  const mobileOptimizedItemsPerPage = useMemo(() => {
    if (isLowPowerMode) return 4; // Reduce items in low power mode
    if (isSlowConnection) return 6; // Reduce items on slow connection
    return isMobile ? 6 : 8; // Default mobile optimization
  }, [isMobile, isLowPowerMode, isSlowConnection]);

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
    console.log('Infinite scroll setup:', {
      isMobile,
      hasMore,
      isLoadingMore,
      disabled: !isMobile,
      threshold: isMobile ? 0.2 : 0.3,
      rootMargin: isMobile ? '100px' : '200px'
    });
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
    // Format price as dollar signs
    const formatPriceAsDollarSigns = (priceRange?: string) => {
      if (!priceRange) return '$$';
      const matches = priceRange.match(/\$?(\d+)(?:-\$?(\d+))?/);
      if (matches) {
        const min = parseInt(matches[1], 10);
        const max = matches[2] ? parseInt(matches[2], 10) : min;
        const avg = (min + max) / 2;
        if (avg < 15) return '$';
        if (avg < 30) return '$$';
        if (avg < 50) return '$$$';
        return '$$$$';
      }
      return '$$';
    };

    return {
      id: restaurant.id,
      imageUrl: restaurant.image_url,
      imageTag: restaurant.kosher_category,
      title: restaurant.name,
      badge: restaurant.rating ? `${restaurant.rating}` : undefined,
      subtitle: formatPriceAsDollarSigns(restaurant.price_range),
      additionalText: restaurant.distance || restaurant.city || '',
      showHeart: true,
    };
  };

  const handleClearAllFilters = () => {
    clearAllFilters();
  };

  // Mobile-optimized location handling
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: !isLowPowerMode, // Reduce accuracy in low power mode
          timeout: isSlowConnection ? 30000 : 10000, // Longer timeout on slow connection
          maximumAge: 5 * 60 * 1000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      
      // Update filters with location
      setFilter('lat', latitude);
      setFilter('lng', longitude);
      setFilter('nearMe', true);
      setFilter('maxDistanceMi', 25); // Set default distance filter when location is available
      
      // Send location update via WebSocket
      if (isConnected) {
        sendMessage({
          type: 'location_update',
          data: { latitude, longitude }
        });
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get your location. Please check your browser settings.');
    } finally {
      setLocationLoading(false);
    }
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

  // Clear distance filters when no user location
  useEffect(() => {
    if (!userLocation) {
      // Clear distance-related filters when no location is available
      clearFilter('lat');
      clearFilter('lng');
      clearFilter('nearMe');
      clearFilter('maxDistanceMi');
    }
  }, [userLocation, clearFilter]);

  // Fetch restaurants with mobile optimization and distance sorting
  const fetchRestaurantsData = async (filters: Filters = activeFilters) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching restaurants with filters:', filters);
      console.log('User location:', userLocation);
      console.log('Is mobile:', isMobile);

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
      
      console.log('Received restaurants:', response.restaurants.length);
      
      // Apply distance calculation and sorting if location is available
      let processedRestaurants = response.restaurants;
      if (userLocation) {
        console.log('Calculating distances for restaurants');
        processedRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
        console.log('Processed restaurants with distance:', processedRestaurants.length);
      } else {
        console.log('No user location available for distance calculation');
      }
      
      setRestaurants(processedRestaurants);
      setCurrentPage(1);
      
      // Update hasMore state for infinite scroll
      const hasMoreContent = response.restaurants.length >= mobileOptimizedItemsPerPage;
      console.log('Setting hasMore:', hasMoreContent, 'for mobile:', isMobile);
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
      console.log('Skipping fetchMoreRestaurants:', { isLoadingMore, hasMore });
      return;
    }

    console.log('Fetching more restaurants, page:', currentPage + 1);

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
      
      console.log('Received more restaurants:', response.restaurants.length);
      
      // Apply distance calculation to new restaurants if location is available
      let processedNewRestaurants = response.restaurants;
      if (userLocation) {
        console.log('Calculating distances for new restaurants');
        processedNewRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
      }
      
      setRestaurants(prev => [...prev, ...processedNewRestaurants]);
      setCurrentPage(nextPage);
      
      // Update hasMore state
      const hasMoreContent = response.restaurants.length >= mobileOptimizedItemsPerPage;
      console.log('Setting hasMore for more restaurants:', hasMoreContent);
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
    restaurantGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: isMobile ? '12px' : '16px',
      padding: isMobile ? '8px' : '16px',
    },
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
                onRequestLocation={requestLocation}
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
          {restaurants.map((restaurant) => (
            <UnifiedCard
              key={restaurant.id}
              data={transformRestaurantToCardData(restaurant)}
              variant="default"
              showStarInBadge={true}
              onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
              onLikeToggle={(id, isLiked) => {
                console.log(`Restaurant ${id} ${isLiked ? 'liked' : 'unliked'}`);
              }}
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
