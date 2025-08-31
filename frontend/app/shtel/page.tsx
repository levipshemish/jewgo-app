'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import ShtelFilters, { ShtelFilters as ShtelFiltersType } from '@/components/shtel/ShtelFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop } from '@/lib/utils/scrollUtils';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
import { appLogger } from '@/lib/utils/logger';

import { MarketplaceListing } from '@/lib/types/marketplace';
import { Filters, toSearchParams } from '@/lib/filters/schema';

// Loading component for Suspense fallback
function ShtelPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Utility function to format distance for display
const formatDistance = (distance: number) => {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)}ft`;
  } else if (distance < 1) {
    return `${distance.toFixed(1)}mi`;
  } else {
    return `${distance.toFixed(1)}mi`;
  }
};

// Main component that uses useSearchParams
function ShtelPageContent() {
  const router = useRouter();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalListings, setTotalListings] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('shtel');
  const [hasMore, setHasMore] = useState(true);
  
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
    () => router.push('/eatery'), // Swipe left to eatery
    () => router.push('/marketplace'), // Swipe right to marketplace
    () => scrollToTop(), // Swipe up to scroll to top
    () => window.scrollTo(0, document.body.scrollHeight) // Swipe down to bottom
  );
  
  // WebSocket for real-time updates (currently disabled)
  const { isConnected, sendMessage } = useWebSocket();
  
  // URL-backed filter state
  const {
    activeFilters,
    setFilter
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
    requestLocation
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(false);
  const [isSettingLocationFilters, _setIsSettingLocationFilters] = useState(false);
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Responsive grid items per page (centralized)
  const mobileOptimizedItemsPerPage = useMemo(() => {
    const { itemsPerPageFromViewport } = require('@/lib/config/pagination');
    return itemsPerPageFromViewport(viewportWidth, (isMobile || isMobileDevice));
  }, [isMobile, isMobileDevice, viewportWidth]);

  // Memoize listing transformation to prevent unnecessary re-renders
  const transformListingToCardData = useCallback((listing: MarketplaceListing) => {
    appLogger.debug('Transforming marketplace listing', { listingId: listing.id });
    
    // Format price from cents to dollars
    const formatPrice = (priceCents: number) => {
      if (priceCents === 0) {
        return 'Free'; // For Gemach items
      }
      return `$${(priceCents / 100).toFixed(0)}`;
    };

    // Format condition for display
    const formatCondition = (condition: string) => {
      switch (condition) {
        case 'new': return 'New';
        case 'used_like_new': return 'Like New';
        case 'used_good': return 'Good';
        case 'used_fair': return 'Fair';
        default: return condition;
      }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return '1d';
      }
      if (diffDays < 7) {
        return `${diffDays}d`;
      }
      if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}w`;
      }
      if (diffDays < 365) {
        return `${Math.floor(diffDays / 30)}m`;
      }
      return `${Math.floor(diffDays / 365)}y`;
    };

    let distanceText: string | undefined;

    if (userLocation && listing.lat && listing.lng) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        listing.lat,
        listing.lng
      );
      distanceText = formatDistance(distance);
    }

    return {
      id: listing.id,
      imageUrl: listing.thumbnail || listing.images?.[0] || null,
      imageTag: formatCondition(listing.condition),
      title: listing.title,
      badge: formatDate(listing.created_at),
      subtitle: formatPrice(listing.price_cents),
      additionalText: distanceText, // Only show if location is enabled
      showHeart: true,
      isLiked: false, // This will be handled by the component internally
      kosherCategory: listing.category_name,
      priceRange: listing.price_cents === 0 ? 'Free' : formatPrice(listing.price_cents),
      city: listing.city,
      distance: distanceText,
    };
  }, [userLocation]);

  // Sort listings by distance when location is available
  const sortedListings = useMemo(() => {
    if (!userLocation) {
      return listings;
    }

    return [...listings].sort((a, b) => {
      // If either listing doesn't have coordinates, keep original order
      if (!a.lat || !a.lng || !b.lat || !b.lng) {
        return 0;
      }

      const distanceA = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.lat,
        a.lng
      );

      const distanceB = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.lat,
        b.lng
      );

      return distanceA - distanceB;
    });
  }, [listings, userLocation]);

  // Infinite scroll with proper mobile detection
  const { hasMore: _infiniteScrollHasMore, isLoadingMore, loadingRef, setHasMore: setInfiniteScrollHasMore } = useInfiniteScroll(
    () => fetchMoreListings(),
    { 
      threshold: (isMobile || isMobileDevice) ? 0.2 : 0.3, 
      rootMargin: (isMobile || isMobileDevice) ? '100px' : '200px',
      disabled: !(isMobile || isMobileDevice) // Only enable infinite scroll on mobile
    }
  );

  // Mobile-optimized state
  const { isScrolling: _isScrolling } = useScrollDetection({ debounceMs: 100 });

  // Memoize filter change handlers to prevent unnecessary re-renders
  const _handleFilterChange = useCallback((newFilters: Partial<Filters>) => {
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

  // Fetch shtel listings with mobile optimization and distance sorting
  const fetchShtełListingsData = useCallback(async (filters?: Filters) => {
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
      params.set('community_focus', 'true'); // Add community focus flag

      // Call the shtel-specific API endpoint
      const response = await fetch(`/api/shtel-listings?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch shtel listings');
      }

      // Apply distance calculation to new listings if location is available
      let processedListings = data.data?.listings || [];
      if (userLocation) {
        processedListings = processedListings.map((listing: MarketplaceListing) => {
          if (listing.lat && listing.lng) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              listing.lat,
              listing.lng
            );
            return { ...listing, distance: formatDistance(distance) };
          }
          return listing;
        }).sort((a: any, b: any) => {
          if (!a.distance || !b.distance) {
            return 0;
          }
          const aNum = parseFloat(a.distance.replace(/[^\d.]/g, ''));
          const bNum = parseFloat(b.distance.replace(/[^\d.]/g, ''));
          return aNum - bNum;
        });
      }
      
      setListings(processedListings);
      setCurrentPage(1);
      
      // Update pagination state
      const total = data.data?.total || processedListings.length;
      setTotalListings(total);
      const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      // Update hasMore state for infinite scroll (mobile only)
      const hasMoreContent = processedListings.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
      setInfiniteScrollHasMore(hasMoreContent);
    } catch (err) {
      appLogger.error('Shtel fetch error', { error: String(err) });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load shtel listings. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, mobileOptimizedItemsPerPage, isSettingLocationFilters, userLocation, activeFilters, setInfiniteScrollHasMore]);

  const fetchMoreListings = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      const _nextPage = currentPage + 1;
      // Implementation for loading more listings
      // This would call the API with pagination parameters
    } catch (err) {
      appLogger.error('Error fetching more listings', { error: String(err) });
    }
  }, [isLoadingMore, hasMore, currentPage]);

  // Handle location-based data fetching after filters are set
  useEffect(() => {
    // Only fetch data if we're not currently setting location filters and we have a location
    if (!isSettingLocationFilters && userLocation) {
      // Small delay to ensure filters have been applied
      const timeout = setTimeout(() => {
        fetchShtełListingsData();
      }, 150);
      
      return () => clearTimeout(timeout);
    }
  }, [userLocation, isSettingLocationFilters, fetchShtełListingsData]);

  // Initial data load
  useEffect(() => {
    fetchShtełListingsData();
  }, [filtersKey, fetchShtełListingsData]);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Trigger data fetch with new search query
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
    const timeout = setTimeout(() => {
      fetchShtełListingsData();
    }, 300); // Debounce search
    setFetchTimeout(timeout);
  }, [fetchShtełListingsData, fetchTimeout]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Handle navigation to different pages based on the selected tab
    switch (tab) {
      case 'mikvah':
        router.push('/mikvah');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'marketplace':
        router.push('/marketplace');
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      case 'shtel':
        // Already on shtel page, just update the tab
        break;
      default:
        break;
    }
  };

  const [showFilters, setShowFilters] = useState(false);
  const [shtelFilters, setShtelFilters] = useState<ShtelFiltersType>({});

  const handleShowFilters = () => {
    setShowFilters(true);
  };

  const handleFiltersChange = (filters: ShtelFiltersType) => {
    setShtelFilters(filters);
    // Apply filters to the search
    fetchShtełListingsData();
  };

  const handleShowMap = () => {
    router.push('/live-map?type=shtel');
  };

  const handleAddListing = () => {
    router.push('/shtel/add');
  };

  // Consistent responsive styles
  const responsiveStyles = useMemo(() => {
    const isMobileView = isMobile || isMobileDevice;
    return {
      container: {
        minHeight: isMobileView ? viewportHeight : 'auto',
      },
      loadMoreButton: {
        ...mobileStyles.touchButton,
        width: isMobileView ? '100%' : 'auto',
        margin: isMobileView ? '16px 8px' : '16px',
      }
    };
  }, [isMobile, isMobileDevice, viewportHeight, viewportWidth, isLowPowerMode, isSlowConnection]);

  if (error) {
    return (
      <div style={responsiveStyles.container}>
        <Header />
        
        {/* Navigation Tabs - Always visible */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
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
              fetchShtełListingsData();
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
      className="min-h-screen bg-[#f4f4f4] shtel-page pb-20"
      style={responsiveStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Shtel community marketplace listings"
    >
      <div className="sticky top-0 z-50 bg-white">
        <Header
          onSearch={handleSearch}
          placeholder="Search community listings..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />

        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        <ActionButtons
          onShowFilters={handleShowFilters}
          onShowMap={handleShowMap}
          onAddEatery={handleAddListing}
          addButtonText="Add Listing"
        />
      </div>

      {/* Location Permission Banner */}
      {!userLocation && !locationLoading && (
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
            >
              Enable
            </button>
          </div>
        </div>
      )}
      
      {/* Location-Based Sorting Indicator */}
      {userLocation && (
        <div className="px-4 sm:px-6 py-2 bg-green-50 border-b border-green-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-green-800 font-medium">
                Community listings sorted by distance from you
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Shtel listings grid */}
      {sortedListings.length === 0 && !loading ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🏛️</div>
          <p className="text-lg text-gray-600 mb-2">No community listings found</p>
          <p className="text-sm text-gray-500">
            {searchQuery || Object.values(activeFilters).some(f => f) 
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a listing to the community!'
            }
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid"
          role="grid"
          aria-label="Shtel community listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {sortedListings.map((listing, index) => (
            <div 
              key={listing.id} 
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
                  ...transformListingToCardData(listing),
                  imageUrl: transformListingToCardData(listing).imageUrl || undefined,
                }}
                variant="default"
                priority={index < 4} // Add priority to first 4 images for LCP optimization
                onCardClick={() => router.push(`/shtel/product/${listing.id}`)}
                className="w-full h-full"
                showStarInBadge={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading states with consistent spacing */}
      {loading && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading community listings...</p>
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
        <div className="mt-8 mb-24" role="navigation" aria-label="Pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              // Implementation for page change
            }}
            isLoading={loading}
            className="mb-4"
          />
          <div className="text-center text-sm text-gray-600">
            Showing {sortedListings.length} of {totalListings} listings
          </div>
        </div>
      )}

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation />

      {/* Shtetl Filters */}
      <ShtelFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        currentFilters={shtelFilters}
        onFiltersChange={handleFiltersChange}
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

export default function ShtelPage() {
  return (
    <Suspense fallback={<ShtelPageLoading />}>
      <ShtelPageContent />
    </Suspense>
  );
}
