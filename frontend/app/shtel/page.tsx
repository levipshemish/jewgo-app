'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import ShtelFilters, { ShtelFilterValues as ShtelFiltersType } from '@/components/shtel/ShtelFilters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';

import { scrollToTop } from '@/lib/utils/scrollUtils';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
import { appLogger } from '@/lib/utils/logger';
import { useDistanceCalculation } from '@/lib/hooks/useDistanceCalculation';
import { requestDeduplicator as _requestDeduplicator } from '@/lib/utils/requestDedupe';
import { usePerformanceMonitor } from '@/lib/hooks/usePerformanceMonitor';
import { ShtelListSkeleton } from '@/components/shtel/ShtelSkeleton';
import { useBackgroundPrefetch } from '@/lib/hooks/useBackgroundPrefetch';
import { cacheInvalidator } from '@/lib/utils/cacheInvalidation';

import { MarketplaceListing } from '@/lib/types/marketplace';
import { Filters, toSearchParams } from '@/lib/filters/schema';
import { fetchMarketplaceListings } from '@/lib/api/marketplace';

// Loading component for Suspense fallback
function ShtelPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

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
  const [_hasMore, setHasMore] = useState(true);
  
  // Performance monitoring
  const { trackApiCall, metrics: _performanceMetrics } = usePerformanceMonitor({
    enabled: process.env.NODE_ENV === 'development',
    logToConsole: true,
    componentName: 'ShtelPage'
  });
  
  // Background prefetching for better performance
  const { prefetch, getStats: _prefetchStats } = useBackgroundPrefetch({
    enabled: true,
    delay: 2000, // Start prefetching after 2 seconds
    priority: 'low'
  });
  
  // In-flight request tracking to prevent duplicates
  const _inFlightRequests = useRef(new Map<string, boolean>());
  
  // Mobile optimization hooks
  const { isMobile, viewportHeight, viewportWidth } = useMobileOptimization();
  const { isLowPowerMode, isSlowConnection } = useMobilePerformance();
  
  // Centralized distance calculation hook
  const { calculateDistance, formatDistance } = useDistanceCalculation();
  
  // Performance optimizations based on device capabilities
  const shouldReduceAnimations = isLowPowerMode || isSlowConnection;
  const _shouldLazyLoad = isSlowConnection;
  const fetchTimeoutMs = isSlowConnection ? 10000 : 5000; // Longer timeout for slow connections
  
  // Optimize mobile detection to prevent unnecessary re-renders
  const [_isMobileDevice, setIsMobileDevice] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const mobileCheck = typeof window !== 'undefined' && window.innerWidth <= 768;
      setIsMobileDevice(prev => {
        if (prev !== mobileCheck) {
          return mobileCheck;
        }
        return prev; // Prevent unnecessary state updates
      });
    };
    
    checkMobile();
    
    // Debounce resize events to prevent excessive updates
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimeout);
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
  const _filtersKey = useMemo(() => {
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

  // Responsive grid with maximum 4 rows and up to 8 columns
  const mobileOptimizedItemsPerPage = useMemo(() => {
    // Calculate items per page to ensure exactly 4 rows on every screen size
    if (isMobile || _isMobileDevice) {
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
      
      const result = columnsPerRow * 4; // Always 4 rows
      
      appLogger.debug('Mobile optimization', {
        isMobile,
        _isMobileDevice,
        viewportWidth,
        columnsPerRow,
        result
      });
      
      return result;
    }
  }, [isMobile, _isMobileDevice, viewportWidth]);

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
  }, [userLocation, calculateDistance, formatDistance]);

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
  }, [listings, userLocation, calculateDistance]);



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
  const fetchShtełListingsData = useCallback(async (page: number = 1, filters: Filters = activeFilters) => {
    // Prevent API calls when automatically setting location filters
    if (isSettingLocationFilters) {
      return;
    }
    
    // Add request deduplication
    const requestKey = JSON.stringify({ filters: filters || activeFilters, searchQuery, userLocation });
    if (_inFlightRequests.current.has(requestKey)) {
      return; // Request already in flight
    }
    
    _inFlightRequests.current.set(requestKey, true);
    
    try {
      setLoading(true);
      setError(null);

      const currentFilters = filters || activeFilters;
      const params = toSearchParams({ ...currentFilters, page, limit: mobileOptimizedItemsPerPage });
      if (searchQuery && searchQuery.trim() !== '') {
        params.set('search', searchQuery.trim());
      }
      params.set('mobile_optimized', 'true');
      params.set('community_focus', 'true'); // Add community focus flag

      // Track API call start
      const apiCallStart = performance.now();
      trackApiCall('/api/shtel-listings');

      // Call the shtel-specific API endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
      
      try {
        const response = await fetch(`/api/shtel-listings?${params.toString()}`, {
          signal: controller.signal,
          // Add caching headers for better performance
          headers: {
            'Cache-Control': 'max-age=300', // 5 minutes
          }
        });
        clearTimeout(timeoutId);
        
        // Track API call completion
        const apiCallDuration = performance.now() - apiCallStart;
        appLogger.debug('Shtel fetch: API call completed', { 
          duration: `${apiCallDuration.toFixed(2)}ms`,
          status: response.status 
        });
        
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
      setCurrentPage(page);
      
      // Update pagination state
      const total = data.data?.total || processedListings.length;
      setTotalListings(total);
      const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      
        const hasMoreContent = processedListings.length >= mobileOptimizedItemsPerPage;
        setHasMore(hasMoreContent);

      } catch (fetchErr) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          appLogger.error('Shtel fetch error', { error: String(fetchErr) });
          if (fetchErr instanceof Error) {
            setError(fetchErr.message);
          } else {
            setError('Unable to load shtel listings. Please try again later.');
          }
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        // Clean up in-flight request
        _inFlightRequests.current.delete(requestKey);
      }
    } catch (err) {
      appLogger.error('Shtel fetch error', { error: String(err) });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load shtel listings. Please try again later.');
      }
    } finally {
      setLoading(false);
      // Clean up in-flight request on error
      _inFlightRequests.current.delete(requestKey);
    }
  }, [
    searchQuery, 
    mobileOptimizedItemsPerPage, 
    isSettingLocationFilters, 
    userLocation, 
    activeFilters, 
 
    calculateDistance, 
    formatDistance, 
    fetchTimeoutMs,
    trackApiCall
  ]);



  // Guard one-time effects under StrictMode
  const didInit = useRef(false);
  const didFetchInitial = useRef(false);

  // Handle location-based data fetching after filters are set
  useEffect(() => {
    if (!isSettingLocationFilters && userLocation && !didFetchInitial.current) {
      didFetchInitial.current = true;
      // Small delay to ensure filters have been applied
      const timeout = setTimeout(() => {
        // Inline the fetch logic to avoid dependency issues
        const loadLocationData = async () => {
          if (isSettingLocationFilters) {
            return;
          }
          
          const requestKey = JSON.stringify({ filters: activeFilters, searchQuery, userLocation });
          if (_inFlightRequests.current.has(requestKey)) {
            return;
          }
          
          _inFlightRequests.current.set(requestKey, true);
          
          try {
            setLoading(true);
            setError(null);

            const currentFilters = activeFilters;
            const params = {
              page: 1,
              limit: mobileOptimizedItemsPerPage,
              search: searchQuery || undefined,
              category: currentFilters.category || undefined,
              subcategory: currentFilters.subcategory || undefined,
              kind: currentFilters.kind || undefined,
              condition: currentFilters.condition || undefined,
              min_price: currentFilters.minPrice ? parseInt(currentFilters.minPrice) * 100 : undefined,
              max_price: currentFilters.maxPrice ? parseInt(currentFilters.maxPrice) * 100 : undefined,
              city: currentFilters.city || undefined,
              region: currentFilters.region || undefined
            };

            const response = await fetchMarketplaceListings(params);
            
            if (response.success && response.data?.listings) {
              setListings(response.data.listings);
              setCurrentPage(1);
              setTotalListings(response.data.total || 0);
              setTotalPages(response.data.totalPages || 1);
            } else {
              setListings([]);
              setCurrentPage(1);
              setTotalListings(0);
              setTotalPages(1);
            }
            
            trackApiCall('shtel_listings', response.data?.listings?.length || 0, Date.now() - Date.now());
          } catch (fetchErr) {
            console.error('Error fetching shtel listings:', fetchErr);
            if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
              setError('Request timed out. Please try again.');
            } else {
              appLogger.error('Shtel fetch error', { error: String(fetchErr) });
              if (fetchErr instanceof Error) {
                setError(fetchErr.message);
              } else {
                setError('Unable to load shtel listings. Please try again later.');
              }
            }
          } finally {
            setLoading(false);
            _inFlightRequests.current.delete(requestKey);
          }
        };
        
        loadLocationData();
      }, 150);
      
      return () => clearTimeout(timeout);
    }
  }, [userLocation, isSettingLocationFilters, activeFilters, searchQuery, mobileOptimizedItemsPerPage, fetchTimeoutMs, trackApiCall]);

  // Initial data load - only once
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      // Inline the fetch logic to avoid dependency issues
      const loadInitialData = async () => {
        if (isSettingLocationFilters) {
          return;
        }
        
        const requestKey = JSON.stringify({ filters: activeFilters, searchQuery, userLocation });
        if (_inFlightRequests.current.has(requestKey)) {
          return;
        }
        
        _inFlightRequests.current.set(requestKey, true);
        
        try {
          setLoading(true);
          setError(null);

          const currentFilters = activeFilters;
          const params = {
            page: 1,
            limit: mobileOptimizedItemsPerPage,
            search: searchQuery || undefined,
            category: currentFilters.category || undefined,
            subcategory: currentFilters.subcategory || undefined,
            kind: currentFilters.kind || undefined,
            condition: currentFilters.condition || undefined,
            min_price: currentFilters.minPrice ? parseInt(currentFilters.minPrice) * 100 : undefined,
            max_price: currentFilters.maxPrice ? parseInt(currentFilters.maxPrice) * 100 : undefined,
            city: currentFilters.city || undefined,
            region: currentFilters.region || undefined
          };

          const response = await fetchMarketplaceListings(params);
          
          if (response.success && response.data?.listings) {
            setListings(response.data.listings);
            setCurrentPage(1);
            setTotalListings(response.data.total || 0);
            setTotalPages(response.data.totalPages || 1);
          } else {
            setListings([]);
            setCurrentPage(1);
            setTotalListings(0);
            setTotalPages(1);
          }
          
          trackApiCall('shtel_listings', response.data?.listings?.length || 0, Date.now() - Date.now());
        } catch (fetchErr) {
          console.error('Error fetching shtel listings:', fetchErr);
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else {
            appLogger.error('Shtel fetch error', { error: String(fetchErr) });
            if (fetchErr instanceof Error) {
              setError(fetchErr.message);
            } else {
              setError('Unable to load shtel listings. Please try again later.');
            }
          }
        } finally {
          setLoading(false);
          _inFlightRequests.current.delete(requestKey);
        }
      };
      
      loadInitialData();
    }
  }, [activeFilters, searchQuery, mobileOptimizedItemsPerPage, trackApiCall, isSettingLocationFilters, userLocation]);

  // Background prefetching for related data
  useEffect(() => {
    if (userLocation && listings.length > 0) {
      // Prefetch related store data
      prefetch('/api/shtel/store', 'low');
      
      // Prefetch popular categories
      prefetch('/api/shtel-listings?category=Judaica&limit=10', 'low');
      prefetch('/api/shtel-listings?category=Religious Books&limit=10', 'low');
      
      // Prefetch nearby listings if we have location
      if (userLocation.latitude && userLocation.longitude) {
        const locationParams = new URLSearchParams({
          lat: userLocation.latitude.toString(),
          lng: userLocation.longitude.toString(),
          radius: '25',
          limit: '20'
        });
        prefetch(`/api/shtel-listings?${locationParams.toString()}`, 'low');
      }
    }
  }, [userLocation, listings.length, prefetch]);

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
      // Inline the fetch logic to avoid dependency issues
      const loadSearchData = async () => {
        if (isSettingLocationFilters) {
          return;
        }
        
        const requestKey = JSON.stringify({ filters: activeFilters, searchQuery, userLocation });
        if (_inFlightRequests.current.has(requestKey)) {
          return;
        }
        
        _inFlightRequests.current.set(requestKey, true);
        
        try {
          setLoading(true);
          setError(null);

          const currentFilters = activeFilters;
          const params = {
            page: 1,
            limit: mobileOptimizedItemsPerPage,
            search: searchQuery || undefined,
            category: currentFilters.category || undefined,
            subcategory: currentFilters.subcategory || undefined,
            kind: currentFilters.kind || undefined,
            condition: currentFilters.condition || undefined,
            min_price: currentFilters.minPrice ? parseInt(currentFilters.minPrice) * 100 : undefined,
            max_price: currentFilters.maxPrice ? parseInt(currentFilters.maxPrice) * 100 : undefined,
            city: currentFilters.city || undefined,
            region: currentFilters.region || undefined
          };

          const response = await fetchMarketplaceListings(params);
          
          if (response.success && response.data?.listings) {
            setListings(response.data.listings);
            setCurrentPage(1);
            setTotalListings(response.data.total || 0);
            setTotalPages(response.data.totalPages || 1);
          } else {
            setListings([]);
            setCurrentPage(1);
            setTotalListings(0);
            setTotalPages(1);
          }
          
          trackApiCall('shtel_listings', response.data?.listings?.length || 0, Date.now() - Date.now());
        } catch (fetchErr) {
          console.error('Error fetching shtel listings:', fetchErr);
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else {
            appLogger.error('Shtel fetch error', { error: String(fetchErr) });
            if (fetchErr instanceof Error) {
              setError(fetchErr.message);
            } else {
              setError('Unable to load shtel listings. Please try again later.');
            }
          }
        } finally {
          setLoading(false);
          _inFlightRequests.current.delete(requestKey);
        }
      };
      
      loadSearchData();
    }, isSlowConnection ? 500 : 300); // Longer debounce for slow connections
    setFetchTimeout(timeout);
  }, [fetchTimeout, isSlowConnection, activeFilters, searchQuery, mobileOptimizedItemsPerPage, trackApiCall, isSettingLocationFilters, userLocation]);

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
    // Invalidate cache when adding new listing
    cacheInvalidator.invalidateListingsCache('create');
    router.push('/shtel/add');
  };

  // Consistent responsive styles
  const responsiveStyles = useMemo(() => {
    const isMobileView = isMobile || _isMobileDevice;
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
  }, [isMobile, _isMobileDevice, viewportHeight]);

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
      className="min-h-screen bg-[#f4f4f4] shtel-page page-with-bottom-nav"
      style={responsiveStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Shtel listings"
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
                priority={index < 4 && !shouldReduceAnimations} // Reduce priority when in low power mode
                onCardClick={() => router.push(`/shtel/product/${listing.id}`)}
                className="w-full h-full"
                showStarInBadge={true}
                isScrolling={shouldReduceAnimations} // Disable animations when in low power mode
              />
            </div>
          ))}
        </div>
      )}

      {/* Loading states with skeleton loading for better UX */}
      {loading && (
        <div className="py-5" role="status" aria-live="polite">
          <ShtelListSkeleton count={mobileOptimizedItemsPerPage} />
        </div>
      )}



      {/* Pagination - show on all devices */}
      {totalPages > 1 && (
        <div className="mt-8 mb-24" role="navigation" aria-label="Pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              if (page === currentPage || loading) return;
              setCurrentPage(page);
              fetchShtełListingsData(page);
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
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
      <BottomNavigation size="compact" showLabels="active-only" />

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
