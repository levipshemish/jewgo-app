'use client';

import React, { useState, useEffect, Fragment, useRef } from 'react';
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

import { Restaurant } from '@/lib/types/restaurant';

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
    return `${(distance * 10).toFixed(1)}mi`; // Show as 0.2mi, 0.5mi, etc.
  } else {
    return `${distance.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
  }
};

export default function EateryExplorePage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('eatery');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8); // Default fallback
  
  // Infinite scroll state
  const [isMobile, setIsMobile] = useState(false);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState(false);
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [infiniteScrollPage, setInfiniteScrollPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [infiniteScrollLoading, setInfiniteScrollLoading] = useState(false);
  
  // Filter state
  const {
    activeFilters,
    hasActiveFilters,
    setFilter,
    clearAllFilters,
    getFilterCount
  } = useAdvancedFilters();
  
  // Location state for distance calculation
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

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

  // Get user location for distance calculation
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLoading(false);
        setLocationPermissionGranted(true);
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setLocationLoading(false);
        setLocationPermissionGranted(false);
        let errorMessage = 'Unable to get your location';
        
        if (error && typeof error === 'object' && 'code' in error) {
          const errorCode = (error as GeolocationPositionError).code;
          switch (errorCode) {
            case (error as GeolocationPositionError).PERMISSION_DENIED:
              errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
              break;
            case (error as GeolocationPositionError).POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please try again.';
              break;
            case (error as GeolocationPositionError).TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
        }
        
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Request location permission on component mount
  useEffect(() => {
    getUserLocation();
  }, []);

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

  // Load restaurants with filters
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters for filtering
        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        if (activeFilters.agency && activeFilters.agency !== 'all') {
          params.append('certifying_agency', activeFilters.agency);
        }
        if (activeFilters.dietary && activeFilters.dietary !== 'all') {
          params.append('kosher_category', activeFilters.dietary);
        }
        if (activeFilters.category && activeFilters.category !== 'all') {
          params.append('listing_type', activeFilters.category);
        }
        
        const data = await fetchRestaurants(200, params.toString());
        setRestaurants(data.restaurants || []);
      } catch (_err) {
        // console.error('Error loading restaurants:', err);
        setError('Failed to load restaurants. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, [searchQuery, activeFilters]);

  // Use restaurants directly since filtering is now done on the backend
  const filteredRestaurants = restaurants;

  // Pagination logic
  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRestaurants = filteredRestaurants.slice(startIndex, endIndex);

  // Debug information
  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
    setInfiniteScrollPage(1);
    setDisplayedRestaurants([]);
  }, [searchQuery, activeFilters]);

  // Update displayed restaurants for infinite scroll
  useEffect(() => {
    if (infiniteScrollEnabled) {
      const startIndex = 0;
      const endIndex = infiniteScrollPage * itemsPerPage;
      const newDisplayedRestaurants = filteredRestaurants.slice(startIndex, endIndex);
      setDisplayedRestaurants(newDisplayedRestaurants);
      setHasMore(endIndex < filteredRestaurants.length);
    }
  }, [filteredRestaurants, infiniteScrollPage, itemsPerPage, infiniteScrollEnabled]);

  // Infinite scroll load more function
  const handleLoadMore = () => {
    if (!infiniteScrollLoading && hasMore) {
      setInfiniteScrollLoading(true);
      setTimeout(() => {
        setInfiniteScrollPage(prev => prev + 1);
        setInfiniteScrollLoading(false);
      }, 300); // Small delay for smooth UX
    }
  };

  // Infinite scroll hook
  const { loadingRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    loading: infiniteScrollLoading,
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
    
    if (locationPermissionGranted && userLocation && restaurant.latitude && restaurant.longitude) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      );
      distanceText = formatDistance(distance);
    }

    // Debug rating data
    console.log(`Restaurant ${restaurant.name}:`, {
      google_rating: restaurant.google_rating,
      rating: restaurant.rating,
      star_rating: restaurant.star_rating,
      quality_rating: restaurant.quality_rating
    });

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
      {!locationPermissionGranted && !locationLoading && (
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
              onClick={getUserLocation}
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
      {locationError && !locationPermissionGranted && !locationLoading && (
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
              onClick={getUserLocation}
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
      <div className="px-4 py-4">
        <div className="max-w-7xl lg:max-w-none mx-auto">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16">
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
                {(infiniteScrollEnabled ? displayedRestaurants : paginatedRestaurants).map((restaurant) => (
                  <div key={restaurant.id}>
                    <UnifiedCard
                      data={transformRestaurantToCardData(restaurant)}
                      variant="default"
                      onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                      onLikeToggle={(id, isLiked) => {
                        // Handle like toggle - you can add your like logic here
                        console.log(`Restaurant ${id} ${isLiked ? 'liked' : 'unliked'}`);
                      }}
                      onTagClick={(tagLink, event) => {
                        event.preventDefault();
                        // Handle tag click - you can add navigation logic here
                        console.log('Tag clicked:', tagLink);
                      }}
                      className="w-full"
                      showStarInBadge={true}
                    />
                  </div>
                ))}
              </div>
              
              {/* Debug info and status */}
              <div className="text-sm text-gray-500 mt-6 text-center">
                {infiniteScrollEnabled ? (
                  <>
                    Showing {displayedRestaurants.length} of {filteredRestaurants.length} items
                    {hasActiveFilters && ` - ${getFilterCount()} active filter(s)`}
                    {isMobile && <span className="block text-xs text-blue-600 mt-1">Scroll to load more</span>}
                  </>
                ) : (
                  <>
                    Showing {paginatedRestaurants.length} items (Page {currentPage} of {totalPages})
                    {hasActiveFilters && ` - ${getFilterCount()} active filter(s)`}
                  </>
                )}
              </div>

              {/* Infinite Scroll Loading Indicator */}
              {infiniteScrollEnabled && (
                <div ref={loadingRef} className="flex justify-center items-center py-8">
                  {infiniteScrollLoading && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Loading more...</span>
                    </div>
                  )}
                  {!hasMore && displayedRestaurants.length > 0 && (
                    <div className="text-center py-4">
                      <span className="text-gray-500 text-sm">You&apos;ve reached the end</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Smart Pagination Controls - Hidden on mobile when infinite scroll is enabled */}
              {(!infiniteScrollEnabled || !isMobile) && (
                <div className="flex justify-center items-center mt-8">
                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                  
                    {/* Page Numbers */}
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
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
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
      {infiniteScrollEnabled && isMobile && displayedRestaurants.length > 8 && (
        <button
          onClick={() => {
            if (topRef.current) {
              topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              scrollToTop('smooth');
            }
          }}
          className="fixed bottom-20 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Back to top"
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
