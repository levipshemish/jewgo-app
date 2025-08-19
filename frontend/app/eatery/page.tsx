'use client';

import React, { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import { EateryCard } from '@/components/eatery/ui';
import ActionButtons from '@/components/layout/ActionButtons';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop, isMobileDevice } from '@/lib/utils/scrollUtils';

import { Restaurant } from '@/lib/types/restaurant';

export default function EateryExplorePage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('eatery');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 4; // Show 4 rows of cards per page
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
  
  // Location state for filters
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Calculate items per page based on current screen size and grid columns
  const getItemsPerPage = () => {
    // Get the current window width to determine grid columns
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      
          // Match the grid breakpoints from the CSS
    if (width >= 1536) {
      return 6 * rowsPerPage; // 2xl: grid-cols-6
    }
    if (width >= 1280) {
      return 5 * rowsPerPage; // xl: grid-cols-5
    }
    if (width >= 1024) {
      return 4 * rowsPerPage; // lg: grid-cols-4
    }
    if (width >= 640) {
      return 3 * rowsPerPage;  // sm: grid-cols-3
    }
    return 2 * rowsPerPage; // default: grid-cols-2
    }
    
    // Fallback for SSR or when window is not available
    return 8; // 2 columns * 4 rows = 8 cards
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

  // Get user location
  const _getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLoading(false);
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setLocationLoading(false);
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

  // Removed automatic location request to comply with browser geolocation policy
  // Location will only be requested when user explicitly clicks location button
  // useEffect(() => {
  //   getUserLocation();
  // }, []);

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
      <div className="px-2 sm:px-6 lg:px-8 py-2 sm:py-6 lg:py-8 pb-20 sm:pb-24 md:pb-28 lg:pb-28 xl:pb-32 2xl:pb-36">
        <div className="max-w-7xl mx-auto">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 lg:py-24">
              <div className="text-gray-400 text-6xl lg:text-8xl mb-4 lg:mb-6">🍽️</div>
              <div className="text-gray-500 text-lg lg:text-xl mb-3 font-medium">
                {searchQuery ? 'No restaurants found' : 'No restaurants available'}
              </div>
              <div className="text-gray-400 text-sm lg:text-base">
                {searchQuery ? 'Try adjusting your search' : 'Please check back later'}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 restaurant-grid" style={{ gridTemplateRows: `repeat(${rowsPerPage}, minmax(0, 1fr))` }}>
                {(infiniteScrollEnabled ? displayedRestaurants : paginatedRestaurants).map((restaurant) => (
                  <div key={restaurant.id} className="relative">
                    <EateryCard
                      restaurant={restaurant}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              
              {/* Debug info and status - moved to bottom */}
              <div className="text-sm text-gray-500 mt-6 text-center">
                {infiniteScrollEnabled ? (
                  <>
                    Showing {displayedRestaurants.length} of {filteredRestaurants.length} items
                    {hasActiveFilters && ` - ${getFilterCount()} active filter(s)`}
                    {isMobile && <span className="block text-xs text-blue-600 mt-1">Scroll to load more</span>}
                  </>
                ) : (
                  <>
                    Showing {paginatedRestaurants.length} items (Page {currentPage} of {totalPages}) - {rowsPerPage} rows per page
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
                <div className="pagination-container flex justify-center items-center mt-8 mb-4 sm:mb-6 md:mb-8 lg:mb-8 xl:mb-10 bg-white py-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-1 sm:space-x-2 max-w-full overflow-x-auto px-4">
                    {/* Previous Button */}
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="pagination-button disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      style={{
                        minHeight: '44px', minWidth: '44px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">←</span>
                    </button>
                  
                  {totalPages > 1 ? (
                    // Simplified pagination that's always visible
                    (() => {
                      const pages: (number | string)[] = [];
                      const current = currentPage;
                      const total = totalPages;
                      
                      // Always show first page
                      pages.push(1);
                      
                      if (total <= 7) {
                        // Show all pages if total is small
                        for (let i = 2; i <= total; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Smart pagination with ellipsis
                        if (current <= 3) {
                          // Near the beginning
                          for (let i = 2; i <= Math.min(4, total - 1); i++) {
                            pages.push(i);
                          }
                          if (total > 4) {
                            pages.push('...');
                            pages.push(total);
                          }
                        } else if (current >= total - 2) {
                          // Near the end
                          if (total > 4) {
                            pages.push('...');
                          }
                          for (let i = Math.max(2, total - 3); i < total; i++) {
                            pages.push(i);
                          }
                          pages.push(total);
                        } else {
                          // In the middle
                          pages.push('...');
                          for (let i = current - 1; i <= current + 1; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(total);
                        }
                      }
                      
                      return pages.map((page, index) => (
                        <React.Fragment key={index}>
                          {page === '...' ? (
                            <span className="px-2 py-2 text-gray-400">...</span>
                          ) : (
                            <button
                              onClick={() => handlePageChange(page as number)}
                              className={`pagination-button ${currentPage === page ? 'active' : ''} min-w-[2.5rem]`}
                              style={{
                                minHeight: '44px',
                                minWidth: '44px',
                                touchAction: 'manipulation',
                                WebkitTapHighlightColor: 'transparent'
                              }}
                            >
                              {page}
                            </button>
                          )}
                        </React.Fragment>
                      ));
                    })()
                  ) : (
                    // Show single page indicator when there's only one page
                    <span className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl whitespace-nowrap shadow-sm">
                      <span className="hidden sm:inline">Page 1 of 1</span>
                      <span className="sm:hidden">1/1</span>
                    </span>
                  )}
                  
                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="pagination-button disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    style={{
                      minHeight: '44px', minWidth: '44px', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">→</span>
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
