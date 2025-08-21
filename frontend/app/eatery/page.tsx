'use client';

import React, { useState, useEffect, Fragment, useRef, useMemo, useTransition, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedRestaurantCard from '@/components/restaurant/UnifiedRestaurantCard';
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
  const [showFilters, setShowFilters] = useState(!isMobile); // Auto-hide filters on mobile
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
      
      // Apply distance sorting if location is enabled
      let sortedRestaurants = response.restaurants;
      if (userLocation && filters.nearMe) {
        console.log('Applying distance sorting');
        sortedRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
        console.log('Sorted restaurants:', sortedRestaurants.length);
      } else {
        console.log('Skipping distance sorting - no location or nearMe filter');
      }
      
      setRestaurants(sortedRestaurants);
      setCurrentPage(1);
      
      // Update hasMore state for infinite scroll
      const hasMoreContent = response.restaurants.length >= mobileOptimizedItemsPerPage;
      console.log('Setting hasMore:', hasMoreContent, 'for mobile:', isMobile);
      setHasMore(hasMoreContent);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setError('An error occurred while fetching restaurants');
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
      
      // Apply distance sorting to new restaurants if location is enabled
      let sortedNewRestaurants = response.restaurants;
      if (userLocation && activeFilters.nearMe) {
        console.log('Applying distance sorting to new restaurants');
        sortedNewRestaurants = sortRestaurantsByDistance(response.restaurants, userLocation);
      }
      
      setRestaurants(prev => [...prev, ...sortedNewRestaurants]);
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
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
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
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Error: {error}</p>
          <button
            onClick={() => fetchRestaurantsData()}
            style={mobileStyles.touchButton}
          >
            Retry
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
      
      {/* Mobile-optimized filters */}
      <div style={mobileOptimizedStyles.filtersContainer}>
        <AdvancedFilters
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onToggleFilter={handleToggleFilter}
          onClearAll={handleClearAllFilters}
          userLocation={userLocation}
          locationLoading={locationLoading}
          onRequestLocation={requestLocation}
        />
        
        {/* Mobile filter toggle button */}
        {isMobile && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...mobileStyles.touchButton,
              position: 'fixed',
              bottom: '80px',
              right: '16px',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              zIndex: 1001,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {showFilters ? '✕' : '⚙️'}
          </button>
        )}
      </div>

      {/* Restaurant grid with mobile optimization */}
      <div style={mobileOptimizedStyles.restaurantGrid}>
        {restaurants.map((restaurant) => (
          <UnifiedRestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
          />
        ))}
      </div>

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

      {/* Mobile-optimized action buttons */}
      <ActionButtons 
        onShowFilters={() => setShowFilters(!showFilters)}
        onShowMap={() => router.push('/live-map')}
        onAddEatery={() => router.push('/add-eatery')}
      />

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
