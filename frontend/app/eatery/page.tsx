'use client';

import React, { useState, useEffect, Fragment, useRef, useMemo, useTransition } from 'react';
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
import { useLocation } from '@/lib/contexts/LocationContext';
import { toSearchParams, Filters } from '@/lib/filters/schema';

import { Restaurant } from '@/lib/types/restaurant';

export default function EateryExplorePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  
  // State management
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);

  // URL-backed filter state
  const {
    activeFilters,
    hasActiveFilters,
    setFilter,
    toggleFilter,
    clearAllFilters,
    getFilterCount,
    updateFilters
  } = useAdvancedFilters();

  // Location context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
    setPermissionStatus
  } = useLocation();

  // Calculate items per page based on responsive grid columns
  const getItemsPerPage = () => {
    const screenWidth = window.innerWidth;
    
    // Determine columns based on screen size
    let columns = 2; // Default for mobile
    
    if (screenWidth >= 1536) { // 2xl breakpoint
      columns = 8;
    } else if (screenWidth >= 1280) { // xl breakpoint
      columns = 6;
    } else if (screenWidth >= 1024) { // lg breakpoint
      columns = 5;
    } else if (screenWidth >= 768) { // md breakpoint
      columns = 4;
    } else if (screenWidth >= 640) { // sm breakpoint
      columns = 3;
    }
    // Mobile: 2 columns (default)
    
    // Show 4 rows of cards per page
    const rows = 4;
    return columns * rows;
  };

  // Update items per page when window resizes
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(getItemsPerPage());
    };

    // Set initial value
    updateItemsPerPage();

    // Add resize listener
    window.addEventListener('resize', updateItemsPerPage);

    // Cleanup
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // NOTE: Location is only requested when user explicitly clicks the "Enable" button
  // This prevents browser security violations for geolocation requests without user gestures

  // Detect mobile device and enable infinite scroll
  useEffect(() => {
    const checkMobile = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      setInfiniteScrollEnabled(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync location with filters when user location changes
  useEffect(() => {
    if (userLocation && activeFilters.nearMe) {
      updateFilters({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
    }
  }, [userLocation, activeFilters.nearMe, updateFilters]);

  // Load restaurants with filters - using stable serialized filters
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Abort previous request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        
        // Build filters with location data if available
        const filters: Filters = {
          ...activeFilters,
          q: searchQuery || undefined,
        };
        
        // Add location data if nearMe is enabled and we have coordinates
        if (filters.nearMe && userLocation) {
          filters.lat = userLocation.latitude;
          filters.lng = userLocation.longitude;
        }
        
        // Convert to URLSearchParams for API call
        const params = toSearchParams(filters);
        
        startTransition(async () => {
          try {
            const data = await fetchRestaurants(200, params.toString());
            if (!controller.signal.aborted) {
              setRestaurants(data.restaurants || []);
            }
          } catch (err) {
            if (!controller.signal.aborted) {
              console.error('Error loading restaurants:', err);
              setError('Failed to load restaurants. Please try again.');
            }
          } finally {
            if (!controller.signal.aborted) {
              setLoading(false);
            }
          }
        });
      } catch (err) {
        console.error('Error in loadRestaurants:', err);
        setError('Failed to load restaurants. Please try again.');
        setLoading(false);
      }
    };

    loadRestaurants();
  }, [searchQuery, activeFilters, userLocation]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(restaurants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRestaurants = restaurants.slice(startIndex, endIndex);

  // Debug information
  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  // Infinite scroll load more function
  const handleLoadMore = () => {
    if (!isPending && restaurants.length > 0) {
      startTransition(async () => {
        try {
          const controller = new AbortController();
          abortRef.current = controller;

          const filters: Filters = {
            ...activeFilters,
            q: searchQuery || undefined,
          };

          if (filters.nearMe && userLocation) {
            filters.lat = userLocation.latitude;
            filters.lng = userLocation.longitude;
          }

          const params = toSearchParams(filters);
          const data = await fetchRestaurants(200, params.toString());
          if (!controller.signal.aborted) {
            setRestaurants(prev => [...prev, ...(data.restaurants || [])]);
          }
        } catch (err) {
          if (!abortRef.current?.signal.aborted) {
            console.error('Error loading more restaurants:', err);
            setError('Failed to load more restaurants. Please try again.');
          }
        } finally {
          if (!abortRef.current?.signal.aborted) {
            setLoading(false);
          }
        }
      });
    }
  };

  // Infinite scroll hook
  const { loadingRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore: !isPending && restaurants.length > 0,
    loading: isPending,
    threshold: 200
  });

  // Ref for scrolling to top
  const topRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Navigate to different pages based on the selected tab
    switch (tab) {
      case 'mikvahs':
        router.push('/mikvahs');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'specials':
        router.push('/specials');
        break;
      case 'eatery':
        // Already on eatery page, just update the tab
        break;
      case 'stores':
        router.push('/stores');
        break;
      default:
        break;
    }
  };

  const handleShowFilters = () => {
    setShowFilters(true);
  };

  const handleFilterChange = (filterType: 'agency' | 'dietary' | 'category', value: string) => {
    setFilter(filterType, value);
  };

  const handleToggleFilter = (filterType: 'openNow' | 'nearMe', value: boolean) => {
    setFilter(filterType, value);
  };

  const handleDistanceChange = (distance: number) => {
    setFilter('maxDistance', distance);
  };

  const handleClearAllFilters = () => {
    clearAllFilters();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleShowMap = () => {
    router.push('/live-map');
  };

  const handleAddEatery = () => {
    router.push('/add-eatery');
  };

  // Transform restaurant data to UnifiedCard format
  const transformRestaurantToCardData = (restaurant: Restaurant) => {
    // Calculate distance only if location permission is granted and both coordinates are available
    let distanceText: string | undefined;
    
    if (permissionStatus === 'granted' && userLocation && restaurant.latitude && restaurant.longitude) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      );
      distanceText = formatDistance(distance);
      
      // Debug logging for distance display
      if (process.env.NODE_ENV === 'development') {
        console.log(`${restaurant.name}: ${distance.toFixed(3)}mi -> ${distanceText}`);
      }
    }

    // Debug rating data - removed for production
    // console.log(`Restaurant ${restaurant.name}:`, {
    //   google_rating: restaurant.google_rating,
    //   rating: restaurant.rating,
    //   star_rating: restaurant.star_rating,
    //   quality_rating: restaurant.quality_rating
    // });

    // Try multiple rating sources
    let ratingBadge: string | undefined;
    if (restaurant.google_rating) {
      ratingBadge = restaurant.google_rating.toString();
    } else if (restaurant.rating) {
      ratingBadge = restaurant.rating.toString();
    } else if (restaurant.star_rating) {
      ratingBadge = restaurant.star_rating.toString();
    } else if (restaurant.quality_rating) {
      ratingBadge = restaurant.quality_rating.toString();
    }

    return {
      id: restaurant.id,
      imageUrl: restaurant.image_url,
      imageTag: restaurant.kosher_category || restaurant.certifying_agency,
      title: restaurant.name,
      badge: ratingBadge,
      subtitle: restaurant.price_range ? formatPriceRange(restaurant.price_range) : undefined,
      additionalText: distanceText, // Only show distance if location is granted, otherwise blank
      showHeart: true,
      isLiked: false // This will be handled by the component internally
    };
  };

  // Helper function to format price range
  const formatPriceRange = (priceRange: string) => {
    if (!priceRange) {return undefined;}
    const count = (priceRange.match(/\$/g) || []).length;
    return '$'.repeat(count);
  };

  // Enhanced pagination handlers with scroll to top
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Scroll to top when page changes (for desktop pagination)
  useEffect(() => {
    if (!infiniteScrollEnabled) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          scrollToTop('smooth');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentPage, infiniteScrollEnabled]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Top anchor for scrolling */}
      <div ref={topRef} />
      
      {/* Header with Logo and Search */}
      <Header
        onSearch={handleSearch}
        placeholder="Find your Eatery"
        showFilters={true}
        onShowFilters={handleShowFilters}
      />

      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onShowFilters={handleShowFilters}
        onShowMap={handleShowMap}
        onAddEatery={handleAddEatery}
      />
      
      {/* Location Permission Banner */}
      {permissionStatus !== 'granted' && !locationLoading && (
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
            <button
              onClick={requestLocation}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-3 py-1 rounded-lg hover:bg-blue-100"
              style={{
                minHeight: '32px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Enable
            </button>
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
              <span className="text-sm text-red-800">
                {locationError}
              </span>
            </div>
            <button
              onClick={requestLocation}
              className="text-sm text-red-600 hover:text-red-800 transition-colors font-medium px-3 py-1 rounded-lg hover:bg-red-100"
              style={{
                minHeight: '32px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Retry
            </button>
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
      
      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm text-blue-800 font-medium">
                {getFilterCount()} active filter(s)
              </span>
            </div>
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <AdvancedFilters
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onToggleFilter={handleToggleFilter}
                onDistanceChange={handleDistanceChange}
                onClearAll={handleClearAllFilters}
                userLocation={userLocation}
                locationLoading={locationLoading}
              />
              
              <div
                className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              >
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Component for Mobile Click Debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto">
            {/* TestClickComponent was removed */}
          </div>
        </div>
      )}

      {/* Restaurant Grid */}
      <div className="px-4 py-4 pb-24">
        <div className="max-w-7xl lg:max-w-none mx-auto">
          {paginatedRestaurants.length === 0 ? (
            <div className="text-center py-16 pb-24">
              <div className="text-gray-400 text-6xl mb-4">🍽️</div>
              <div className="text-gray-500 text-lg mb-3 font-medium">
                {searchQuery ? 'No restaurants found' : 'No restaurants available'}
              </div>
              <div className="text-gray-400 text-sm">
                {searchQuery ? 'Try adjusting your search' : 'Please check back later'}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {paginatedRestaurants.map((restaurant) => (
                  <div key={restaurant.id}>
                    <UnifiedCard
                      data={transformRestaurantToCardData(restaurant)}
                      variant="default"
                      onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                      onLikeToggle={(id, isLiked) => {
                        // Handle like toggle - you can add your like logic here
                        // console.log(`Restaurant ${id} ${isLiked ? 'liked' : 'unliked'}`);
                      }}
                      onTagClick={(tagLink, event) => {
                        event.preventDefault();
                        // Handle tag click - you can add navigation logic here
                        // console.log('Tag clicked:', tagLink);
                      }}
                      className="w-full"
                      showStarInBadge={true}
                    />
                  </div>
                ))}
              </div>
              
              {/* Debug info and status */}
              <div className="text-sm text-gray-500 mt-6 text-center pb-4">
                Showing {paginatedRestaurants.length} items (Page {currentPage} of {totalPages})
                {hasActiveFilters && ` - ${getFilterCount()} active filter(s)`}
                {permissionStatus === 'granted' && userLocation && (
                  <span className="block text-xs text-green-600 mt-1">📍 Sorted by distance</span>
                )}
              </div>

              {/* Infinite Scroll Loading Indicator */}
              {isPending && (
                <div ref={loadingRef} className="flex justify-center items-center py-8 pb-24">
                  {isPending && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Loading more...</span>
                    </div>
                  )}
                  {!isPending && restaurants.length > 0 && (
                    <div className="text-center py-4">
                      <span className="text-gray-500 text-sm">You&apos;ve reached the end</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Smart Pagination Controls - Hidden on mobile when infinite scroll is enabled */}
              {(!infiniteScrollEnabled || !isMobile) && (
                <div className="flex justify-center items-center mt-8 mb-8">
                  <div className="flex items-center space-x-3">
                    {/* Previous Button */}
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all duration-200 font-medium shadow-soft"
                      style={{
                        minHeight: '44px',
                        minWidth: '44px',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      Previous
                    </button>
                  
                    {/* Page Numbers */}
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-4 py-3 rounded-2xl font-medium transition-all duration-200 shadow-soft ${
                              currentPage === page
                                ? 'bg-[#4ade80] text-white hover:bg-[#22c55e] shadow-medium'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={{
                              minHeight: '44px',
                              minWidth: '44px',
                              touchAction: 'manipulation',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Next Button */}
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all duration-200 font-medium shadow-soft"
                      style={{
                        minHeight: '44px',
                        minWidth: '44px',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Back to Top Button - Only show on mobile with infinite scroll */}
      {infiniteScrollEnabled && isMobile && paginatedRestaurants.length > 8 && (
        <button
          onClick={() => {
            if (topRef.current) {
              topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              scrollToTop('smooth');
            }
          }}
          className="fixed bottom-24 right-4 z-50 bg-[#4ade80] text-white p-3 rounded-2xl shadow-medium hover:bg-[#22c55e] transition-all duration-200"
          aria-label="Back to top"
          style={{
            minHeight: '44px',
            minWidth: '44px',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

// Utility function to calculate distance between two points using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// Utility function to format distance for display
const formatDistance = (distance: number): string => {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)}ft`; // Convert to feet
  } else if (distance < 1) {
    return `${distance.toFixed(1)}mi`; // Show as 0.2mi, 0.5mi, etc.
  } else {
    return `${distance.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
  }
};
