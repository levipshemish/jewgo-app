'use client';

import React, { useState, useEffect, Fragment, useMemo, Suspense, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { Filters } from '@/lib/filters/schema';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop } from '@/lib/utils/scrollUtils';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import { LocationPromptPopup } from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';

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
  const [stores, setStores] = useState<any[]>([]);
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
  const transformStoreToCardData = useCallback((store: any) => {
    // Enhanced rating logic with better fallbacks
    const rating = store.rating || store.star_rating || store.google_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    
    // Enhanced distance logic - ensure we have a valid distance string
    const distanceText = store.distance && store.distance.trim() !== '' ? store.distance : '';
    
    // Enhanced store type logic
    const storeType = store.store_type && store.store_type.trim() !== '' ? store.store_type : '';
    
    return {
      id: store.id,
      imageUrl: store.image_url,
      imageTag: store.store_type,
      title: store.name,
      badge: ratingText, // Use the enhanced rating text
      subtitle: storeType,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      storeType: store.store_type,
      storeCategory: store.store_category,
      rating,
      reviewCount: store.review_count,
      city: store.city,
      distance: store.distance,
      isCholovYisroel: store.is_cholov_yisroel,
      isPasYisroel: store.is_pas_yisroel,
    };
  }, []); // Empty dependency array to prevent recreation

  // Memoize filter change handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback((filterType: keyof Filters, value: any) => {
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

  // Handle search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // TODO: Trigger data fetch with search query
  }, [setSearchQuery, setCurrentPage]);

  // Infinite scroll with proper mobile detection
  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    () => {
      // TODO: Implement fetch more stores
    },
    { 
      threshold: (isMobile || isMobileDevice) ? 0.2 : 0.3, 
      rootMargin: (isMobile || isMobileDevice) ? '100px' : '200px',
      disabled: !(isMobile || isMobileDevice) // Only enable infinite scroll on mobile
    }
  );

  // Scroll detection for mobile optimization
  const { isScrolling, scrollDirection } = useScrollDetection();

  // Handle location prompt
  useEffect(() => {
    if (!userLocation && !locationLoading && !hasShownLocationPrompt) {
      setShowLocationPrompt(true);
      setHasShownLocationPrompt(true);
    }
  }, [userLocation, locationLoading, hasShownLocationPrompt]);

  // Mock data for now - replace with actual API call
  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call
        const mockStores = [
          {
            id: 1,
            name: "Kosher Market",
            store_type: "Grocery",
            store_category: "Kosher",
            rating: 4.5,
            review_count: 25,
            city: "Miami",
            distance: "0.5 mi",
            image_url: "/api/placeholder/300/200",
            is_cholov_yisroel: true,
            is_pas_yisroel: false,
          },
          {
            id: 2,
            name: "Jewish Bookstore",
            store_type: "Books",
            store_category: "Religious",
            rating: 4.2,
            review_count: 18,
            city: "Miami",
            distance: "1.2 mi",
            image_url: "/api/placeholder/300/200",
            is_cholov_yisroel: false,
            is_pas_yisroel: false,
          },
        ];
        
        setStores(mockStores);
        setTotalStores(mockStores.length);
        setTotalPages(1);
      } catch (err) {
        setError('Failed to load stores');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  // Transform stores to card data
  const storeCards = useMemo(() => {
    return stores.map(transformStoreToCardData);
  }, [stores, transformStoreToCardData]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    scrollToTop();
  }, [setCurrentPage]);

  // Handle add store action
  const handleAddStore = useCallback(() => {
    router.push('/add-store');
  }, [router]);

  // Handle filters action
  const handleFilters = useCallback(() => {
    // TODO: Implement filters modal
    console.log('Open filters for stores');
  }, []);

  // Handle search action
  const handleSearchAction = useCallback(() => {
    // TODO: Implement search modal
    console.log('Open search for stores');
  }, []);

  if (loading) {
    return <StoresPageLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Stores</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-gray-50 ${mobileStyles.container}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <Header 
        title="Stores"
        showSearch={true}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        showFilters={hasActiveFilters}
        onClearFilters={handleClearAllFilters}
      />

      {/* Main Content */}
      <main className={`${mobileStyles.main} pb-20`}>
        {/* Category Tabs */}
        <CategoryTabs 
          activeCategory="stores"
          onCategoryChange={(category) => {
            if (category !== 'stores') {
              router.push(`/${category}`);
            }
          }}
        />

        {/* Stores Grid */}
        <div className="container mx-auto px-4 py-6">
          {storeCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏪</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Stores Found</h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters 
                  ? "Try adjusting your filters to find more stores."
                  : "No stores are available in your area yet."
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Stores Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {storeCards.map((store) => (
                  <UnifiedCard
                    key={store.id}
                    {...store}
                    onClick={() => router.push(`/store/${store.id}`)}
                  />
                ))}
              </div>

              {/* Pagination (Desktop) */}
              {!isMobile && !isMobileDevice && totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}

              {/* Infinite Scroll Loading (Mobile) */}
              {(isMobile || isMobileDevice) && hasMore && (
                <div ref={loadingRef} className="mt-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Action Buttons */}
      <ActionButtons
        onAdd={handleAddStore}
        onFilters={handleFilters}
        onSearch={handleSearchAction}
        addLabel="Add Store"
        filtersLabel="Store Filters"
        searchLabel="Search Stores"
      />

      {/* Bottom Navigation */}
      <BottomNavigation activePage="stores" />

      {/* Location Prompt Popup */}
      <LocationPromptPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onAllow={requestLocation}
      />

      {/* Advanced Filters Modal */}
      <AdvancedFilters
        isOpen={false} // TODO: Implement filters modal state
        onClose={() => {}} // TODO: Implement close handler
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onToggleFilter={handleToggleFilter}
        onClearAllFilters={handleClearAllFilters}
        filterOptions={{
          // TODO: Add store-specific filter options
          store_type: ['Grocery', 'Books', 'Clothing', 'Electronics', 'Other'],
          store_category: ['Kosher', 'General', 'Specialty'],
          rating: ['4+ Stars', '3+ Stars', '2+ Stars'],
          distance: ['Within 1 mile', 'Within 5 miles', 'Within 10 miles'],
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
