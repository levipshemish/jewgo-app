'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback, startTransition } from 'react';
import { appLogger } from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import { MikvahFilters } from '@/components/mikvah/MikvahFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { scrollToTop } from '@/lib/utils/scrollUtils';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';

import { Filters } from '@/lib/filters/schema';

// Mock mikvah type for now - will be replaced with actual API
interface Mikvah {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone_number?: string;
  website?: string;
  email?: string;
  mikvah_type?: string;
  mikvah_category?: string;
  business_hours?: string;
  requires_appointment?: boolean;
  appointment_phone?: string;
  appointment_website?: string;
  walk_in_available?: boolean;
  advance_booking_days?: number;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  reviewcount?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_changing_rooms?: boolean;
  has_shower_facilities?: boolean;
  has_towels_provided?: boolean;
  has_soap_provided?: boolean;
  has_hair_dryers?: boolean;
  has_private_entrance?: boolean;
  has_disabled_access?: boolean;
  has_parking?: boolean;
  rabbinical_supervision?: string;
  kosher_certification?: string;
  community_affiliation?: string;
  religious_authority?: string;
  fee_amount?: number;
  fee_currency?: string;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  accepts_checks?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
}

// Mock API function for mikvah - will be replaced with actual API
const fetchMikvah = async (limit: number, _params?: string, timeoutMs: number = 5000) => {
  // Simulate network delay for testing timeout functionality
  if (timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000)); // Random delay up to 1s
  }
  
  // For now, return mock data
  const mockMikvah: Mikvah[] = [
    {
      id: 1,
      name: "Community Mikvah Center",
      description: "Beautiful and well-maintained mikvah facility for the community",
      city: "Miami",
      mikvah_type: "women's",
      mikvah_category: "community",
      rating: 4.8,
      reviewcount: 203,
      distance: "1.2 mi",
      image_url: "/api/placeholder/300/200",
      requires_appointment: true,
      appointment_phone: "305-555-0123",
      walk_in_available: false,
      has_changing_rooms: true,
      has_shower_facilities: true,
      has_towels_provided: true,
      has_soap_provided: true,
      has_hair_dryers: true,
      has_parking: true,
      rabbinical_supervision: "Rabbi Cohen",
      kosher_certification: "OU",
      fee_amount: 25.00,
      accepts_cash: true,
      accepts_checks: true,
      is_active: true,
      is_verified: true
    },
    {
      id: 2,
      name: "Private Mikvah Suite",
      description: "Luxury private mikvah with premium amenities",
      city: "Miami",
      mikvah_type: "women's",
      mikvah_category: "private",
      rating: 4.9,
      reviewcount: 156,
      distance: "2.8 mi",
      image_url: "/api/placeholder/300/200",
      requires_appointment: true,
      appointment_phone: "305-555-0456",
      walk_in_available: false,
      advance_booking_days: 7,
      has_changing_rooms: true,
      has_shower_facilities: true,
      has_towels_provided: true,
      has_soap_provided: true,
      has_hair_dryers: true,
      has_private_entrance: true,
      has_parking: true,
      rabbinical_supervision: "Rabbi Goldstein",
      kosher_certification: "OU",
      fee_amount: 50.00,
      accepts_credit_cards: true,
      accepts_cash: true,
      is_active: true,
      is_verified: true
    },
    {
      id: 3,
      name: "Hotel Mikvah",
      description: "Convenient mikvah located within the hotel complex",
      city: "Miami",
      mikvah_type: "women's",
      mikvah_category: "hotel",
      rating: 4.3,
      reviewcount: 89,
      distance: "3.5 mi",
      image_url: "/api/placeholder/300/200",
      requires_appointment: false,
      walk_in_available: true,
      has_changing_rooms: true,
      has_shower_facilities: true,
      has_towels_provided: false,
      has_soap_provided: false,
      has_hair_dryers: true,
      has_parking: true,
      rabbinical_supervision: "Hotel Rabbi",
      kosher_certification: "OU",
      fee_amount: 35.00,
      accepts_credit_cards: true,
      accepts_cash: true,
      is_active: true,
      is_verified: true
    },
    {
      id: 4,
      name: "Men's Mikvah",
      description: "Traditional men's mikvah for daily use",
      city: "Miami",
      mikvah_type: "men's",
      mikvah_category: "community",
      rating: 4.5,
      reviewcount: 67,
      distance: "1.8 mi",
      image_url: "/api/placeholder/300/200",
      requires_appointment: false,
      walk_in_available: true,
      has_changing_rooms: true,
      has_shower_facilities: true,
      has_towels_provided: false,
      has_soap_provided: false,
      has_parking: false,
      rabbinical_supervision: "Rabbi Schwartz",
      kosher_certification: "OU",
      fee_amount: 15.00,
      accepts_cash: true,
      is_active: true,
      is_verified: true
    }
  ];

  return {
    mikvah: mockMikvah,
    total: mockMikvah.length,
    page: 1,
    limit
  };
};

// Loading component for Suspense fallback
function MikvahPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component that uses useSearchParams
function MikvahPageContent() {
  const router = useRouter();
  const [mikvah, setMikvah] = useState<Mikvah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMikvah, setTotalMikvah] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile optimization hooks
  const { isMobile, viewportHeight, viewportWidth } = useMobileOptimization();
  const { isLowPowerMode, isSlowConnection } = useMobilePerformance();
  
  // Performance optimizations based on device capabilities
  const shouldReduceAnimations = isLowPowerMode || isSlowConnection;
  const shouldLazyLoad = isSlowConnection;
  const fetchTimeoutMs = isSlowConnection ? 10000 : 5000; // Longer timeout for slow connections
  
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

  // Responsive grid with maximum 4 rows and up to 8 columns
  const mobileOptimizedItemsPerPage = useMemo(() => {
    // Calculate items per page to ensure exactly 4 rows on every screen size
    if (isMobile || isMobileDevice) {
      return 8; // 4 rows × 2 columns = 8 items
    } else {
      // For desktop, calculate based on viewport width to ensure 4 rows
      let columnsPerRow = 3; // Default fallback
      
      if (viewportWidth >= 1441) {
        columnsPerRow = 8; // Large desktop: 8 columns × 4 rows = 32 items
      } else if (viewportWidth >= 1025) {
        columnsPerRow = 6; // Desktop: 6 columns × 4 rows = 24 items
      } else if (viewportWidth >= 769) {
        columnsPerRow = 4; // Large tablet: 4 columns × 4 rows = 16 items
      } else if (viewportWidth >= 641) {
        columnsPerRow = 3; // Small tablet: 3 columns × 4 rows = 12 items
      }
      
      return columnsPerRow * 4; // Always 4 rows
    }
  }, [isMobile, isMobileDevice, viewportWidth]);

  // Memoize mikvah transformation to prevent unnecessary re-renders
  const transformMikvahToCardData = useCallback((mikvahItem: Mikvah) => {
    // Enhanced rating logic with better fallbacks
    const rating = mikvahItem.rating || mikvahItem.star_rating || mikvahItem.google_rating;
    const ratingText = rating ? rating.toFixed(1) : undefined;
    
    // Enhanced distance logic - ensure we have a valid distance string
    const distanceText = mikvahItem.distance && mikvahItem.distance.trim() !== '' ? mikvahItem.distance : '';
    
    // Mikvah type as subtitle
    const mikvahType = mikvahItem.mikvah_type && mikvahItem.mikvah_type.trim() !== '' ? mikvahItem.mikvah_type : '';
    
    return {
      id: String(mikvahItem.id),
      imageUrl: mikvahItem.image_url,
      imageTag: mikvahItem.kosher_certification,
      title: mikvahItem.name,
      badge: ratingText, // Use the enhanced rating text
      subtitle: mikvahType,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: mikvahItem.kosher_certification,
      rating,
      reviewCount: mikvahItem.reviewcount,
      city: mikvahItem.city,
      distance: mikvahItem.distance,
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

  const _handleToggleFilter = useCallback((filterType: keyof Filters) => {
    const currentValue = activeFilters[filterType];
    if (currentValue) {
      clearFilter(filterType);
    } else {
      setFilter(filterType, true as any);
    }
  }, [activeFilters, clearFilter, setFilter]);

  const _handleClearAllFilters = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  

  // Handle search functionality
  // Fetch mikvah with mobile optimization
  const fetchMikvahData = useCallback(async (filters: Filters = activeFilters) => {
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

      const response = await fetchMikvah(mobileOptimizedItemsPerPage, params.toString(), fetchTimeoutMs);
      
      setMikvah(response.mikvah);
      setCurrentPage(1);
      
      // Update pagination state
      const total = response.total || response.mikvah.length;
      setTotalMikvah(total);
      const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      // Update hasMore state for infinite scroll (mobile only)
      const hasMoreContent = response.mikvah.length >= mobileOptimizedItemsPerPage;
      setHasMore(hasMoreContent);
    } catch (err) {
      appLogger.error('Mikvah fetch error', { error: String(err) });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load mikvah facilities. Please try again later.');
      }
      setMikvah([]); // Clear any existing mikvah
    } finally {
      setLoading(false);
    }
  }, [activeFilters, searchQuery, mobileOptimizedItemsPerPage, isLowPowerMode, isSlowConnection, fetchTimeoutMs]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Trigger data fetch with search query
    startTransition(() => {
      fetchMikvahData();
    });
  }, [setSearchQuery, setCurrentPage, fetchMikvahData]);

  // Infinite scroll with proper mobile detection
  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    () => {
      // Define fetchMoreMikvah inline to avoid dependency issues
      const fetchMoreMikvah = async () => {
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

          const response = await fetchMikvah(mobileOptimizedItemsPerPage, params.toString(), fetchTimeoutMs);
          
          setMikvah(prev => [...prev, ...response.mikvah]);
          setCurrentPage(nextPage);
          
          // Update hasMore state
          const hasMoreContent = response.mikvah.length >= mobileOptimizedItemsPerPage;
          setHasMore(hasMoreContent);
        } catch (err) {
          appLogger.error('Mikvah fetch more error', { error: String(err) });
        }
      };
      
      return fetchMoreMikvah();
    },
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

      const response = await fetchMikvah(mobileOptimizedItemsPerPage, params.toString());
      
      setMikvah(response.mikvah);
      setCurrentPage(page);
    } catch (err) {
      appLogger.error('Mikvah page load error', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  // Mobile-optimized location handling with context
  const _handleRequestLocation = async () => {
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





  // Subscribe to real-time updates
  useEffect(() => {
    if (isConnected) {
      // Subscribe to mikvah updates
      sendMessage({
        type: 'subscribe',
        data: { room_id: 'mikvah_updates' }
      });
    }
  }, [isConnected, sendMessage]);

  // Initial data fetch
  useEffect(() => {
    fetchMikvahData();
  }, [fetchMikvahData]);

  // Mobile-optimized filter changes
  useEffect(() => {
    if (hasActiveFilters) {
      startTransition(() => {
        fetchMikvahData();
      });
    }
  }, [activeFilters, hasActiveFilters, fetchMikvahData]);

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
  }, [isMobile, isMobileDevice, viewportHeight]);

  if (error) {
    return (
      <div style={responsiveStyles.container}>
        <Header 
          onSearch={handleSearch}
          placeholder="Search mikvah facilities..."
          showFilters={true}
          onShowFilters={() => setShowFilters(!showFilters)}
        />
        
        {/* Navigation Tabs - Always visible */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
          <CategoryTabs activeTab="mikvah" />
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
              fetchMikvahData();
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
      className="min-h-screen bg-[#f4f4f4] pb-20 mikvah-page"
      style={responsiveStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Mikvah facility listings"
    >
      <div className="sticky top-0 z-50 bg-white">
        <Header 
          onSearch={handleSearch}
          placeholder="Search mikvah facilities..."
          showFilters={true}
          onShowFilters={() => setShowFilters(!showFilters)}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="mikvah" />
        </div>
        
        <ActionButtons 
          onShowFilters={() => setShowFilters(!showFilters)}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-mikvah')}
          addButtonText="Add Mikvah"
        />
      </div>
      
      {/* Mikvah Filters */}
      <MikvahFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFilterChange}
        currentFilters={activeFilters}
      />

      {/* Mikvah grid with consistent responsive spacing */}
      {mikvah.length === 0 && !loading ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🕊️</div>
          <p className="text-lg text-gray-600 mb-2">No mikvah facilities found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid px-4 sm:px-6 lg:px-8"
          role="grid"
          aria-label="Mikvah facility listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {mikvah.map((mikvahFacility, index) => (
            <div 
              key={mikvahFacility.id} 
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
                data={transformMikvahToCardData(mikvahFacility)}
                variant="default"
                showStarInBadge={true}
                priority={index < 4 && !shouldReduceAnimations} // Reduce priority when in low power mode
                onCardClick={() => router.push(`/mikvah/${mikvahFacility.id}`)}
                className="w-full h-full"
                isScrolling={shouldReduceAnimations} // Disable animations when in low power mode
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading states with consistent spacing */}
      {loading && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading mikvah facilities{shouldLazyLoad ? ' (optimized for slow connection)' : ''}...</p>
        </div>
      )}

      {/* Infinite scroll loading indicator - only show on mobile */}
      {(isMobile || isMobileDevice) && isLoadingMore && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading more{shouldLazyLoad ? ' (optimized for slow connection)' : ''}...</p>
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
            Showing {mikvah.length} of {totalMikvah} mikvah facilities
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
        onSkip={() => {
          setShowLocationPrompt(false);
        }}
      />
    </div>
  );
}

export default function MikvahPage() {
  return (
    <Suspense fallback={<MikvahPageLoading />}>
      <MikvahPageContent />
    </Suspense>
  );
}
