'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback, startTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import ActionButtons from '@/components/layout/ActionButtons';
import { ShulFilters } from '@/components/shuls/ShulFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';

import { scrollToTop } from '@/lib/utils/scrollUtils';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
import { calculateDistance, formatDistance } from '@/lib/utils/distance';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

import { Filters } from '@/lib/filters/schema';

// Real shul type matching the database schema
interface Shul {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  website?: string;
  email?: string;
  shul_type?: string;
  shul_category?: string;
  denomination?: string;
  business_hours?: string;
  hours_parsed?: boolean;
  timezone?: string;
  has_daily_minyan?: boolean;
  has_shabbat_services?: boolean;
  has_holiday_services?: boolean;
  has_women_section?: boolean;
  has_mechitza?: boolean;
  has_separate_entrance?: boolean;
  distance?: string;
  distance_miles?: number;
  rating?: number;
  review_count?: number;
  star_rating?: number;
  google_rating?: number;
  image_url?: string;
  logo_url?: string;
  has_parking?: boolean;
  has_disabled_access?: boolean;
  has_kiddush_facilities?: boolean;
  has_social_hall?: boolean;
  has_library?: boolean;
  has_hebrew_school?: boolean;
  has_adult_education?: boolean;
  has_youth_programs?: boolean;
  has_senior_programs?: boolean;
  rabbi_name?: string;
  rabbi_phone?: string;
  rabbi_email?: string;
  religious_authority?: string;
  community_affiliation?: string;
  kosher_certification?: string;
  membership_required?: boolean;
  membership_fee?: number;
  fee_currency?: string;
  accepts_visitors?: boolean;
  visitor_policy?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  admin_notes?: string;
  specials?: string;
  listing_type?: string;
}

// Real API function for synagogues with offset-based pagination for infinite scroll
const fetchShuls = async (limit: number, offset: number = 0, params?: string, timeoutMs: number = 15000) => {
  try {
    // Build API URL with parameters
    const apiUrl = new URL('/api/synagogues', window.location.origin);
    apiUrl.searchParams.set('limit', limit.toString());
    apiUrl.searchParams.set('offset', offset.toString());
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      searchParams.forEach((value, key) => {
        if (value && value.trim() !== '') {
          apiUrl.searchParams.set(key, value);
        }
      });
    }
    
    // Add timeout to fetch with more generous timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      shuls: data.synagogues || [],
      total: data.total || 0,
      hasMore: data.hasNext || false,
      limit: data.limit || limit
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - please try again or contact support if the issue persists');
    }
    console.error('Error fetching synagogues:', error);
    throw error;
  }
};

// Loading component for Suspense fallback
function ShulsPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Main component that uses useSearchParams
function ShulsPageContent() {
  const router = useRouter();
  const [shuls, setShuls] = useState<Shul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile optimization hooks
  const { isMobile, viewportHeight, viewportWidth } = useMobileOptimization();
  const { isLowPowerMode, isSlowConnection } = useMobilePerformance();
  
  // Debug logging - only in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Use refs to track what we've already logged to prevent duplicate logging
  const hasLoggedMobileOpt = useRef(false);
  const hasLoggedFilters = useRef(false);
  const hasLoggedItemsPerPage = useRef(false);
  
  // Use ref to prevent duplicate initial data fetches
  const hasInitialFetch = useRef(false);
  
  // Performance optimizations based on device capabilities
  const shouldReduceAnimations = isLowPowerMode || isSlowConnection;
  const shouldLazyLoad = isSlowConnection;
  const fetchTimeoutMs = isSlowConnection ? 20000 : 15000; // More generous timeout for all connections
  
  // Ensure mobile detection is working correctly
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  // Log mobile optimization values only once on mount
  useEffect(() => {
    if (isDevelopment && !hasLoggedMobileOpt.current) {
      console.log('Mobile optimization values:', { isMobile, viewportHeight, viewportWidth, isLowPowerMode, isSlowConnection });
      hasLoggedMobileOpt.current = true;
    }
  }, [isDevelopment, isMobile, viewportHeight, viewportWidth, isLowPowerMode, isSlowConnection]);
  
  // Mobile detection useEffect
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
  const { /* onTouchStart, onTouchMove, onTouchEnd */ } = useMobileGestures(
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
    clearAllFilters: _clearAllFilters
  } = useAdvancedFilters();
  
  // Log active filters only when they change
  useEffect(() => {
    if (isDevelopment && !hasLoggedFilters.current) {
      console.log('activeFilters:', activeFilters);
      console.log('hasActiveFilters:', hasActiveFilters);
      hasLoggedFilters.current = true;
    }
  }, [isDevelopment, activeFilters, hasActiveFilters]);
  
  // Location state from context
  const { userLocation, isLoading: locationLoading, requestLocation: _requestLocation } = useLocation();

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
  
  // Log mobile optimization calculation only when it changes
  useEffect(() => {
    if (isDevelopment && !hasLoggedItemsPerPage.current) {
      console.log('mobileOptimizedItemsPerPage calculated:', mobileOptimizedItemsPerPage);
      hasLoggedItemsPerPage.current = true;
    }
  }, [isDevelopment, mobileOptimizedItemsPerPage]);
  
  // Memoize shul transformation to prevent unnecessary re-renders
  const transformShulToCardData = useCallback((shul: Shul) => {
      // Enhanced rating logic with better fallbacks and type safety
  const rating = shul.rating || shul.star_rating || shul.google_rating;
  const ratingText = rating && typeof rating === 'number' ? rating.toFixed(1) : undefined;
    
    // Distance logic — compute from user location if available; fall back to API string
    let distanceText = '';
    if (userLocation && (shul.latitude !== null) && (shul.longitude !== null)) {
      // Accept numbers or numeric strings from API
      const latNum = typeof shul.latitude === 'number' ? shul.latitude : parseFloat(String(shul.latitude));
      const lngNum = typeof shul.longitude === 'number' ? shul.longitude : parseFloat(String(shul.longitude));
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        const km = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          latNum,
          lngNum
        );
        distanceText = formatDistance(km);
      }
    } else if (shul.distance && typeof shul.distance === 'string' && shul.distance.trim() !== '') {
      distanceText = shul.distance;
    }
    
    // Shul type as subtitle - use denomination if shul_type is not available
    const shulType = (shul.shul_type && typeof shul.shul_type === 'string' && shul.shul_type.trim() !== '') 
      ? shul.shul_type 
      : (shul.denomination && typeof shul.denomination === 'string' && shul.denomination.trim() !== '' ? shul.denomination : '');
    
    // Create a meaningful description
    const denomination = shul.denomination && typeof shul.denomination === 'string' ? shul.denomination : 'Jewish';
    const city = shul.city && typeof shul.city === 'string' ? shul.city : 'Florida';
    const description = shul.description && typeof shul.description === 'string' ? shul.description : `${denomination} synagogue in ${city}`;
    
    return {
      id: String(shul.id),
      imageUrl: (shul.image_url && typeof shul.image_url === 'string') ? shul.image_url : (shul.logo_url && typeof shul.logo_url === 'string') ? shul.logo_url : '/api/placeholder/300/200',
      imageTag: (shul.denomination && typeof shul.denomination === 'string') ? shul.denomination : (shul.shul_type && typeof shul.shul_type === 'string') ? shul.shul_type : 'Synagogue',
      title: shul.name && typeof shul.name === 'string' ? shul.name : 'Unnamed Synagogue',
      badge: ratingText, // Use the enhanced rating text
      subtitle: shulType,
      additionalText: distanceText,
      showHeart: true,
      isLiked: false, // Will be set by the component based on favorites state
      kosherCategory: (shul.denomination && typeof shul.denomination === 'string') ? shul.denomination : (shul.shul_type && typeof shul.shul_type === 'string') ? shul.shul_type : 'Jewish',
      rating: typeof rating === 'number' ? rating : undefined,
      reviewCount: typeof shul.review_count === 'number' ? shul.review_count : 0,
      city: shul.city && typeof shul.city === 'string' ? shul.city : '',
      distance: shul.distance && typeof shul.distance === 'string' ? shul.distance : '',
      description,
    };
  }, [userLocation]);

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

  // Infinite scroll load function
  const loadMoreShuls = useCallback(async ({ signal, offset, limit }: { signal: AbortSignal; offset: number; limit: number }) => {
    try {
      // Build parameters for API call
      const params = new URLSearchParams();
      
      // Add search query if present
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }

      // Add filter parameters
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      // Mobile-specific optimizations
      params.append('mobile_optimized', 'true');
      
      if (isLowPowerMode) {
        params.append('low_power_mode', 'true');
      }
      
      if (isSlowConnection) {
        params.append('slow_connection', 'true');
      }

      if (isDevelopment) {
        console.log('loadMoreShuls: Calling fetchShuls with:', { limit, offset, params: params.toString(), timeout: fetchTimeoutMs });
      }
      const response = await fetchShuls(limit, offset, params.toString(), fetchTimeoutMs);
      
      // Check if request was aborted
      if (signal.aborted) {
        throw new Error('Request aborted');
      }
      
      if (isDevelopment) {
        console.log('loadMoreShuls: API response:', { 
          shulsCount: response.shuls.length, 
          hasMore: response.hasMore, 
          total: response.total,
          limit: response.limit 
        });
      }
      
      return {
        appended: response.shuls.length,
        hasMore: response.hasMore
      };
      
    } catch (err) {
      console.error('Error loading more shuls:', err);
      throw err;
    }
  }, [activeFilters, searchQuery, isLowPowerMode, isSlowConnection, fetchTimeoutMs]);

  // Initialize infinite scroll
  const {
    state: { offset, hasMore, showManualLoad, epoch, consecutiveFailures, backoffUntil },
    actions: { manualLoad, resetForFilters, attachSentinel }
  } = useInfiniteScroll(loadMoreShuls, {
    limit: mobileOptimizedItemsPerPage,
    initialOffset: 0,
    reinitOnPageShow: true,
    onAttempt: ({ offset, epoch }) => {
      if (isDevelopment) {
        console.log(`Loading more shuls at offset ${offset} (epoch ${epoch})`);
      }
      if (offset === 0) {
        setLoading(true);
      }
    },
    onSuccess: ({ appended, offset, epoch, durationMs }) => {
      if (isDevelopment) {
        console.log(`Successfully loaded ${appended} shuls at offset ${offset} (epoch ${epoch}) in ${durationMs}ms`);
      }
      if (offset === 0) {
        setLoading(false);
      }
    },
    onFailure: ({ error, consecutiveFailures, epoch }) => {
      console.error(`Failed to load shuls at epoch ${epoch}: ${error} (consecutive failures: ${consecutiveFailures})`);
      if (offset === 0) {
        setLoading(false);
        setError(error);
      }
    },
    onAbort: ({ cause, epoch }) => {
      if (isDevelopment) {
        console.log(`Shul loading aborted at epoch ${epoch}: ${cause}`);
      }
      if (offset === 0) {
        setLoading(false);
      }
    }
  });

  // Debug logging for infinite scroll state
  useEffect(() => {
    if (isDevelopment) {
      console.log('Infinite scroll state update:', { offset, hasMore, showManualLoad, epoch, consecutiveFailures });
    }
  }, [offset, hasMore, showManualLoad, epoch, consecutiveFailures]);

  // Fetch initial shuls data
  const fetchInitialShulsData = useCallback(async (filters: Filters = activeFilters, retryCount = 0) => {
    if (isDevelopment) {
      console.log('fetchInitialShulsData called with filters:', filters, 'retry count:', retryCount);
    }
    try {
      setLoading(true);
      setError(null);

      // Reset infinite scroll state
      resetForFilters();

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

      if (isDevelopment) {
        console.log('fetchInitialShulsData: Calling fetchShuls with:', { limit: mobileOptimizedItemsPerPage, params: params.toString(), timeout: fetchTimeoutMs });
      }
      const response = await fetchShuls(mobileOptimizedItemsPerPage, 0, params.toString(), fetchTimeoutMs);
      
      setShuls(response.shuls);
      setLoading(false);

    } catch (err) {
      console.error('Error loading more shuls:', err);
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [activeFilters, searchQuery, isLowPowerMode, isSlowConnection, fetchTimeoutMs, mobileOptimizedItemsPerPage, resetForFilters]);

  // Pull-to-refresh for mobile
  const { isRefreshing, pullToRefreshProps } = usePullToRefresh(
    async () => {
      // Reset infinite scroll and refresh data
      resetForFilters();
      setShuls([]);
      await fetchInitialShulsData();
    },
    { enabled: isMobile || isMobileDevice }
  );

  // Handle search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Reset infinite scroll and fetch new data
    resetForFilters();
    setShuls([]);
    startTransition(() => {
      fetchInitialShulsData();
    });
  }, [setSearchQuery, resetForFilters, fetchInitialShulsData]);

  // Mobile-optimized state
  const [showFilters, setShowFilters] = useState(false); // Filters start hidden
  const { isScrolling } = useScrollDetection({ debounceMs: 100 });

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
      // Subscribe to shul updates
      sendMessage({
        type: 'subscribe',
        data: { room_id: 'shul_updates' }
      });
    }
  }, [isConnected, sendMessage]);

  // Initial data fetch useEffect
  useEffect(() => {
    if (!hasInitialFetch.current) {
      console.log('Initial data fetch useEffect triggered');
      hasInitialFetch.current = true;
      fetchInitialShulsData();
    }
  }, [fetchInitialShulsData]);

  // Mobile-optimized filter changes - only run when filters actually change
  useEffect(() => {
    if (hasActiveFilters) {
      // Debounce filter changes to prevent rapid API calls
      const timeoutId = setTimeout(() => {
        startTransition(() => {
          fetchInitialShulsData();
        });
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveFilters]); // Only depend on hasActiveFilters, not the entire activeFilters object

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
          placeholder="Search synagogues..."
          showFilters={true}
          onShowFilters={() => setShowFilters(!showFilters)}
        />
        
        {/* Navigation Tabs - Always visible */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
          <CategoryTabs activeTab="shuls" />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                fetchInitialShulsData();
              }}
              className="px-6 py-3 bg-[#4ade80] text-white rounded-lg hover:bg-[#22c55e] transition-colors font-medium"
            >
              Try Again
            </button>
            {error.includes('timed out') && (
              <button
                onClick={() => {
                  setError(null);
                  fetchInitialShulsData(activeFilters, 0);
                }}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Retry with Longer Timeout
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#f4f4f4] shuls-page page-with-bottom-nav"
      style={{
        ...responsiveStyles.container,
        scrollBehavior: 'smooth'
      }}
      {...pullToRefreshProps}
      role="main"
      aria-label="Shul listings"
    >
      {/* Pull-to-refresh indicator */}
      {(isMobile || isMobileDevice) && isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[#4ade80] text-white text-center py-2 text-sm font-medium">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Refreshing synagogues...</span>
          </div>
        </div>
      )}
      
      <div className="sticky top-0 z-50 bg-white">
        <Header 
          onSearch={handleSearch}
          placeholder="Search synagogues..."
          showFilters={true}
          onShowFilters={() => setShowFilters(!showFilters)}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="shuls" />
        </div>
        
        <ActionButtons 
          onShowFilters={() => setShowFilters(!showFilters)}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-shul')}
          addButtonText="Add Shul"
        />
      </div>
      
      {/* Shul Filters */}
      <ShulFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFilterChange}
        currentFilters={activeFilters}
      />

      {/* Shul grid with consistent responsive spacing */}
      {shuls.length === 0 && !loading ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🕍</div>
          <p className="text-lg text-gray-600 mb-2">No synagogues found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid px-4 sm:px-6 lg:px-8"
          role="grid"
          aria-label="Synagogue listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {shuls.map((shul, index) => (
            <div 
              key={shul.id} 
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
                data={transformShulToCardData(shul)}
                variant="default"
                showStarInBadge={true}
                priority={index < 4 && !shouldReduceAnimations} // Reduce priority when in low power mode
                onCardClick={() => router.push(`/shul/${shul.id}`)}
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
          <p>Loading synagogues{shouldLazyLoad ? ' (optimized for slow connection)' : ''}...</p>
          {isRetrying && (
            <p className="text-sm text-amber-600 mt-2">
              Request taking longer than expected, retrying...
            </p>
          )}
        </div>
      )}

      {/* Infinite scroll sentinel and load more button */}
      {hasMore && (
        <div className="mt-8 infinite-scroll-container" role="navigation" aria-label="Load more synagogues">
          {/* Intersection observer sentinel for automatic loading */}
          <div 
            ref={attachSentinel}
            className="h-4 w-full infinite-scroll-sentinel"
            aria-hidden="true"
          />
          
          {/* Manual load more button (shown when automatic loading fails) */}
          {showManualLoad && (
            <div className="text-center">
              <button
                onClick={manualLoad}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  loading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#4ade80] text-white hover:bg-[#22c55e] active:scale-95'
                }`}
                style={responsiveStyles.loadMoreButton}
              >
                {loading ? 'Loading...' : 'Load More Synagogues'}
              </button>
              
              {consecutiveFailures > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Previous attempts failed. Please try again.
                </p>
              )}
              
              {backoffUntil && Date.now() < backoffUntil && (
                <p className="text-sm text-gray-500 mt-2">
                  Please wait before trying again...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile floating action buttons */}
      {(isMobile || isMobileDevice) && (
        <div className="fixed bottom-20 right-4 z-40 space-y-3">
          {/* Scroll to top button */}
          <button
            onClick={() => scrollToTop()}
            className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95"
            aria-label="Scroll to top"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          
          {/* Refresh button */}
          <button
            onClick={async () => {
              resetForFilters();
              setShuls([]);
              await fetchInitialShulsData();
            }}
            className="w-12 h-12 bg-[#4ade80] rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95"
            aria-label="Refresh synagogues"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation size="compact" showLabels="active-only" />

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

export default function ShulsPage() {
  return (
    <Suspense fallback={<ShulsPageLoading />}>
      <ShulsPageContent />
    </Suspense>
  );
}
