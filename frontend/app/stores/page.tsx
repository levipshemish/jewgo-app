'use client';

import React, { useState, useEffect, Fragment, useMemo, Suspense, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import { StoreFilters } from '@/components/stores/StoreFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop } from '@/lib/utils/scrollUtils';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';

import { Filters } from '@/lib/filters/schema';

// Mock store type for now - will be replaced with actual API
interface Store {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone_number?: string;
  website?: string;
  email?: string;
  store_type?: string;
  store_category?: string;
  business_hours?: string;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  review_count?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_parking?: boolean;
  has_delivery?: boolean;
  has_pickup?: boolean;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  kosher_certification?: string;
  kosher_category?: string;
  is_cholov_yisroel?: boolean;
  is_pas_yisroel?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
}

// Mock API function for stores - will be replaced with actual API
const fetchStores = async (limit: number, params?: string) => {
  // For now, return mock data
  const mockStores: Store[] = [
    {
      id: 1,
      name: "Kosher Market Plus",
      description: "Your one-stop shop for all kosher groceries",
      city: "Miami",
      storetype: "grocery",
      storecategory: "kosher",
      rating: 4.5,
      reviewcount: 127,
      distance: "2.3 mi",
      imageurl: "/api/placeholder/300/200",
      koshercategory: "Glatt Kosher",
      hasparking: true,
      hasdelivery: true,
      accepts_creditcards: true,
      acceptscash: true,
      isactive: true,
      isverified: true
    },
    {
      id: 2,
      name: "Jewish Book Center",
      description: "Specialized bookstore with religious texts and literature",
      city: "Miami",
      storetype: "bookstore",
      storecategory: "specialty",
      rating: 4.2,
      reviewcount: 89,
      distance: "1.8 mi",
      imageurl: "/api/placeholder/300/200",
      koshercategory: "General",
      hasparking: false,
      hasdelivery: false,
      accepts_creditcards: true,
      acceptscash: true,
      isactive: true,
      isverified: true
    },
    {
      id: 3,
      name: "Judaica World",
      description: "Complete selection of Judaica items and gifts",
      city: "Miami",
      storetype: "judaica",
      storecategory: "specialty",
      rating: 4.7,
      reviewcount: 156,
      distance: "3.1 mi",
      imageurl: "/api/placeholder/300/200",
      koshercategory: "General",
      hasparking: true,
      hasdelivery: true,
      accepts_creditcards: true,
      acceptscash: true,
      isactive: true,
      isverified: true
    },
    {
      id: 4,
      name: "Kosher Deli Express",
      description: "Fresh kosher deli meats and prepared foods",
      city: "Miami",
      storetype: "deli",
      storecategory: "kosher",
      rating: 4.3,
      reviewcount: 94,
      distance: "2.7 mi",
      imageurl: "/api/placeholder/300/200",
      koshercategory: "Glatt Kosher",
      hasparking: false,
      hasdelivery: true,
      accepts_creditcards: true,
      acceptscash: true,
      isactive: true,
      isverified: true
    }
  ];

  return {
    stores: mockStores,
    total: mockStores.length,
    page: 1,
    limit
  };
};

// Loading component for Suspense fallback
function StoresPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component that uses useSearchParams
function StoresPageContent() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStores, setTotalStores] = useState(0);
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

  // Standard 4-rows pagination - always show exactly 4 rows
  const mobileOptimizedItemsPerPage = useMemo(() => {
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
  }, [isMobile, isMobileDevice, viewportWidth]);

  // Memoize store transformation to prevent unnecessary re-renders
  const transformStoreToCardData = useCallback((store: Store) => {
    // Enhanced rating logic with better fallbacks
    const rating = store.rating || store.star_rating || store.google_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    
    // Enhanced distance logic - ensure we have a valid distance string
    const distanceText = store.distance && store.distance.trim() !== '' ? store.distance : '';
    
    // Store type as subtitle
    const storeType = store.store_type && store.store_type.trim() !== '' ? store.store_type : '';
    
    return {
      id: String(store.id),
      imageUrl: store.image_url,
      imageTag: store.kosher_category,
      title: store.name,
      badge: ratingText, // Use the enhanced rating text
      subtitle: storeType,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: store.kosher_category,
      rating,
      reviewCount: store.review_count,
      city: store.city,
      distance: store.distance,
      isCholovYisroel: store.is_cholov_yisroel,
      isPasYisroel: store.is_pas_yisroel,
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

  const handleToggleFilter = useCallback((filterType: keyof Filters) => {
    toggleFilter(filterType);
  }, [toggleFilter]);

  const handleClearAllFilters = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  // Handle search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Trigger data fetch with search query
    startTransition(() => {
      fetchStoresData();
    });
  }, [setSearchQuery, setCurrentPage]);

  // Infinite scroll with proper mobile detection
  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    () => fetchMoreStores(),
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
      
      // Add search query if present
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }
      
      // Add current filters
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      params.append('page', page.toString());
      params.append('limit', mobileOptimizedItemsPerPage.toString());
      params.append('mobile_optimized', 'true');

      const response = await fetchStores(mobileOptimizedItemsPerPage, params.toString());
      
      setStores(response.stores);
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

  // Fetch stores with mobile optimization
  const fetchStoresData = async (filters: Filters = activeFilters) => {
    try {
      setLoading(true);
      setError(null);

      // Mobile-optimized parameters
      const params = new URLSearchParams();
      
      // Add search query if present
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }

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

      const response = await fetchStores(mobileOptimizedItemsPerPage, params.toString());
      
      setStores(response.stores);
      setCurrentPage(1);
      
      // Update pagination state
      const total = response.total || response.stores.length;
      setTotalStores(total);
      const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      // Update hasMore state for infinite scroll (mobile only)
      const hasMoreContent = response.stores.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
    } catch (err) {
      console.error('Error fetching stores:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load stores. Please try again later.');
      }
      setStores([]); // Clear any existing stores
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreStores = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      const nextPage = currentPage + 1;
      const params = new URLSearchParams();
      
      // Add search query if present
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }
      
      // Add current filters
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      params.append('page', nextPage.toString());
      params.append('limit', mobileOptimizedItemsPerPage.toString());
      params.append('mobile_optimized', 'true');

      const response = await fetchStores(mobileOptimizedItemsPerPage, params.toString());
      
      setStores(prev => [...prev, ...response.stores]);
      setCurrentPage(nextPage);
      
      // Update hasMore state
      const hasMoreContent = response.stores.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
    } catch (err) {
      console.error('Error fetching more stores:', err);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (isConnected) {
      // Subscribe to store updates
      sendMessage({
        type: 'subscribe',
        data: { roomid: 'store_updates' }
      });
    }
  }, [isConnected, sendMessage]);

  // Initial data fetch
  useEffect(() => {
    fetchStoresData();
  }, []);

  // Mobile-optimized filter changes
  useEffect(() => {
    if (hasActiveFilters) {
      startTransition(() => {
        fetchStoresData();
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
          placeholder="Search stores..."
          showFilters={true}
          onShowFilters={() => setShowFilters(!showFilters)}
        />
        
        {/* Navigation Tabs - Always visible */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
          <CategoryTabs activeTab="stores" />
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
              fetchStoresData();
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
      aria-label="Store listings"
    >
      <Header 
        onSearch={handleSearch}
        placeholder="Search stores..."
        showFilters={true}
        onShowFilters={() => setShowFilters(!showFilters)}
      />
      
      {/* Navigation Tabs - Always visible */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
        <CategoryTabs activeTab="stores" />
      </div>
      
      {/* Action buttons */}
                <ActionButtons 
            onShowFilters={() => setShowFilters(!showFilters)}
            onShowMap={() => router.push('/live-map')}
            onAddEatery={() => router.push('/add-store')}
            addButtonText="Add Store"
          />
      
      {/* Store Filters */}
      <StoreFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFilterChange}
        currentFilters={activeFilters}
      />

      {/* Store grid with consistent responsive spacing */}
      {stores.length === 0 && !loading ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🛒</div>
          <p className="text-lg text-gray-600 mb-2">No stores found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid px-4 sm:px-6 lg:px-8"
          role="grid"
          aria-label="Store listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {stores.map((store, index) => (
            <div 
              key={store.id} 
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
                data={transformStoreToCardData(store)}
                variant="default"
                showStarInBadge={true}
                priority={index < 4} // Add priority to first 4 images for LCP optimization
                onCardClick={() => router.push(`/store/${store.id}`)}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading states with consistent spacing */}
      {loading && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading stores...</p>
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
            onPageChange={handlePageChange}
            isLoading={loading}
            className="mb-4"
          />
          <div className="text-center text-sm text-gray-600">
            Showing {stores.length} of {totalStores} stores
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

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation />

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

export default function StoresPage() {
  return (
    <Suspense fallback={<StoresPageLoading />}>
      <StoresPageContent />
    </Suspense>
  );
}
