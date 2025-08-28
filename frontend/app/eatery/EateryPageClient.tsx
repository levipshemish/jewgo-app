'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SafeLoader } from '@/components/ui/SafeLoader';

import { Restaurant } from '@/lib/types/restaurant';
import { Filters, toSearchParams } from '@/lib/filters/schema';

// Main client component
export function EateryPageClient() {
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
    isLoading: locationLoading,
    permissionStatus,
    requestLocation,
    error: locationError
  } = useLocation();

  // Scroll detection for header behavior
  const { isScrolling } = useScrollDetection();

  // Fetch restaurants based on filters and location
  const fetchRestaurants = useCallback(async (filters: Filters, location?: { latitude: number; longitude: number }) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = toSearchParams(filters);
      if (location) {
        searchParams.set('lat', location.latitude.toString());
        searchParams.set('lng', location.longitude.toString());
      }

      const response = await fetch(`/api/restaurants?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        let sortedRestaurants = data.restaurants;
        
        // Sort by distance if location is available
        if (location && data.restaurants.length > 0) {
          sortedRestaurants = sortRestaurantsByDistance(data.restaurants, location);
        }
        
        setRestaurants(sortedRestaurants);
        setTotalPages(data.totalPages || 1);
        setTotalRestaurants(data.totalRestaurants || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch restaurants');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      appLogger.error('Failed to fetch restaurants', { error: errorMessage, filters });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch restaurants when filters or location changes
  useEffect(() => {
    const filters = activeFilters as Filters;
    fetchRestaurants(filters, userLocation || undefined);
  }, [filtersKey, userLocation, fetchRestaurants]);

  // Request location on mount if not already available
  useEffect(() => {
    if (!userLocation && permissionStatus === 'prompt' && !locationLoading) {
      requestLocation();
    }
  }, [userLocation, permissionStatus, locationLoading, requestLocation]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFilter('q', query);
  }, [setFilter]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    scrollToTop();
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filterName: keyof Filters, value: any) => {
    setFilter(filterName, value);
    setCurrentPage(1); // Reset to first page when filters change
  }, [setFilter]);

  // Handle filter clear
  const handleFilterClear = useCallback(() => {
    clearFilter();
    setCurrentPage(1);
  }, [clearFilter]);

  // Infinite scroll setup
  const { loadMore, hasMore, isLoadingMore } = useInfiniteScroll(
    () => {
      if (currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
      }
    },
    currentPage < totalPages
  );

  // Render loading state with SafeLoader
  if (loading && restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header 
          onSearch={handleSearch}
        />
        <SafeLoader 
          timeoutMs={5000}
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading is taking longer than expected</h2>
                <p className="text-gray-600 mb-4">Try refreshing the page or check your connection</p>
                <button 
                  onClick={() => fetchRestaurants(activeFilters as Filters, userLocation || undefined)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          }
        >
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        </SafeLoader>
      </div>
    );
  }

  // Render error state
  if (error && restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header 
          onSearch={handleSearch}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => fetchRestaurants(activeFilters as Filters, userLocation || undefined)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#f4f4f4]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={mobileStyles}
    >
      <Header 
        onSearch={handleSearch}
      />
      
      <main className="flex-1">
        <EateryFilters
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onFilterClear={handleFilterClear}
          userLocation={userLocation}
          locationLoading={locationLoading}
          onRequestLocation={requestLocation}
        />
        
        <div className="container mx-auto px-4 py-6">
          {restaurants.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {restaurants.map((restaurant) => (
                  <UnifiedCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    userLocation={userLocation}
                    isMobile={isMobileDevice}
                  />
                ))}
              </div>
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
              
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No restaurants found</h2>
              <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
              <button 
                onClick={handleFilterClear}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>
      
      <ActionButtons />
      <BottomNavigation />
      
      <LocationPromptPopup
        isOpen={permissionStatus === 'denied' && !userLocation}
        onRequestLocation={requestLocation}
        onClose={() => {}}
      />
    </div>
  );
}
