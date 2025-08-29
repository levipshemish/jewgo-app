'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { GenericPageLayout } from '@/components/layout/GenericPageLayout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { ModernFilterPopup } from '@/components/filters/ModernFilterPopup';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { useMobileOptimization } from '@/lib/mobile-optimization';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { toApiFormat, assembleSafeFilters } from '@/lib/filters/distance-validation';
import styles from './EateryPageClient.module.css';

// One canonical cleaner for filters (use it everywhere)
function cleanFilters<T extends Record<string, any>>(raw: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) {
      continue;
    }
    if (typeof v === "string" && v.trim() === "") {
      continue;
    }
    if (Array.isArray(v) && v.length === 0) {
      continue;
    }
    out[k as keyof T] = v as any;
  }
  return out;
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
    return `${Math.round(distance * 5280)}ft`; // Convert to feet
  } else if (distance < 1) {
    return `${distance.toFixed(1)}mi`; // Show as 0.2mi, 0.5mi, etc.
  } else {
    return `${distance.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
  }
};

interface Restaurant {
  id: string | number;
  name: string;
  address: string;
  phone?: string;
  phone_number?: string;
  website: string;
  cuisine?: string;
  kosher_category?: string;
  rating?: number | string;
  google_rating?: number | string;
  price_range: string;
  image_url: string;
  is_open: boolean;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

interface ApiResponse {
  success: boolean;
  data: Restaurant[];
  total: number;
  error: string | null;
}

export function EateryPageClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AbortController for request cancellation
  const controllerRef = useRef<AbortController | null>(null);
  
  // Mobile optimization hook
  const { isMobile, viewportWidth } = useMobileOptimization();
  
  // Hydration state to prevent SSR/client mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Responsive items per page calculation
  const mobileOptimizedItemsPerPage = useMemo(() => {
    // Calculate items per page to ensure exactly 4 rows on every screen size
    if (isHydrated && isMobile) {
      return 8; // Keep initial payload light on mobile for faster loads
    } else {
      // For desktop, calculate based on viewport width to ensure 4 rows
      let columnsPerRow = 3; // Default fallback
      
      if (isHydrated && viewportWidth >= 1441) {
        columnsPerRow = 8; // Large desktop: 8 columns × 4 rows = 32 items
      } else if (isHydrated && viewportWidth >= 1025) {
        columnsPerRow = 6; // Desktop: 6 columns × 4 rows = 24 items
      } else if (isHydrated && viewportWidth >= 769) {
        columnsPerRow = 4; // Large tablet: 4 columns × 4 rows = 16 items
      } else if (isHydrated && viewportWidth >= 641) {
        columnsPerRow = 3; // Small tablet: 3 columns × 4 rows = 12 items
      }
      
      return columnsPerRow * 4; // Always 4 rows
    }
  }, [isHydrated, isMobile, viewportWidth]);
  
  // Unified mobile detection for infinite scroll and UI gating
  const isMobileView = useMemo(() => {
    return isHydrated && (isMobile || viewportWidth <= 768);
  }, [isHydrated, isMobile, viewportWidth]);

  // Advanced filters hook
  const {
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters
  } = useAdvancedFilters();
  
  // Location state from context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
    checkPermissionStatus,
    refreshPermissionStatus,
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(false);

  // Build query parameters consistently
  const buildQueryParams = useCallback((page: number, query: string, filters?: AppliedFilters) => {
    const params = new URLSearchParams();
    const limit = mobileOptimizedItemsPerPage;
    const offset = Math.max(0, (page - 1) * limit);
    params.set('limit', String(limit));
    params.set('offset', String(offset)); // ✅ backend expects this
    
    if (query && String(query).trim()) {
      params.set('search', String(query).trim());
    }
    
    if (filters) {
      const cleaned = cleanFilters(filters);
      
      // Use safe filter assembly to handle distance field conflicts
      const safeFilters = assembleSafeFilters(cleaned);
      
      // Convert to API format (always use maxDistanceMi)
      const apiFilters = toApiFormat(safeFilters);
      
      if (typeof apiFilters.agency === "string") {
        params.set('certifying_agency', apiFilters.agency);
      }
      if (typeof apiFilters.category === "string") {
        params.set('kosher_category', apiFilters.category);
      }
      if (Array.isArray(apiFilters.priceRange)) {
        const [min, max] = apiFilters.priceRange;
        if (Number.isFinite(min)) {
          params.set('price_min', min.toString());
        }
        if (Number.isFinite(max)) {
          params.set('price_max', max.toString());
        }
      }
      if (typeof apiFilters.ratingMin === "number") {
        params.set('min_rating', apiFilters.ratingMin.toString());
      }
      // Location filters
      if (apiFilters.nearMe && Number.isFinite(apiFilters.lat) && Number.isFinite(apiFilters.lng)) {
        params.set('lat', String(apiFilters.lat!));
        params.set('lng', String(apiFilters.lng!));
        // Always use maxDistanceMi for API compatibility
        if (Number.isFinite(apiFilters.maxDistanceMi)) {
          params.set('max_distance_mi', String(apiFilters.maxDistanceMi!));
        }
      }
      // Dietary filters (multi-select)
      if (Array.isArray(apiFilters.dietary) && apiFilters.dietary.length > 0) {
        apiFilters.dietary.forEach(d => params.append('dietary', d));
      } else if (apiFilters.dietary && typeof apiFilters.dietary === 'string' && String(apiFilters.dietary).trim() !== '') {
        // Handle single string dietary for backward compatibility
        params.set('dietary', String(apiFilters.dietary).trim());
      }
    }
    
    return params;
  }, [mobileOptimizedItemsPerPage]);

  const fetchRestaurants = useCallback(async (page: number = 1, query: string = '', filters?: AppliedFilters) => {
    // Cancel any in-flight request
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = buildQueryParams(page, query, filters);
      const url = `/api/restaurants-with-images?${params.toString()}`;
      
      const response = await fetch(url, { signal: controller.signal });
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setRestaurants(data.data);
        setTotalPages(Math.ceil(data.total / mobileOptimizedItemsPerPage));
        
        // Reset infinite scroll state for mobile
        if (isMobileView) {
          // Ensure no duplicates in initial data
          const uniqueRestaurants = data.data.filter((restaurant, index, self) => 
            index === self.findIndex(r => r.id === restaurant.id)
          );
          setAllRestaurants(uniqueRestaurants); // Start with initial data
          setInfiniteScrollPage(1); // Reset to page 1
          setTotalRestaurants(data.total); // Track total count
          // Set hasMore based on whether there are more items available
          const hasMoreData = data.data.length < data.total;
          setHasMore(hasMoreData);
          
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('Initial load for infinite scroll:', { 
              items: data.data.length, 
              total: data.total, 
              hasMore: hasMoreData 
            });
          }
        }
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Initial load: Page', page, 'items:', data.data.length, 'total pages:', Math.ceil(data.total / mobileOptimizedItemsPerPage));
        }
      } else {
        setError(data.error || 'Failed to fetch restaurants');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was aborted, ignore
      }
      setError('Failed to fetch restaurants');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [buildQueryParams, mobileOptimizedItemsPerPage, isMobile]);

  // Memoized query key to prevent unnecessary refetches
  const queryKey = useMemo(() => {
    const params = buildQueryParams(currentPage, searchQuery, activeFilters);
    return params.toString();
  }, [currentPage, searchQuery, activeFilters, buildQueryParams]);

  // Separate state for infinite scroll to avoid conflicts
  const [infiniteScrollPage, setInfiniteScrollPage] = useState(1);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const prefetchRef = useRef<{ offset: number; items: Restaurant[]; total: number } | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  // Infinite scroll hook - only enabled on mobile  
  const loadErrorCountRef = useRef(0);

  const fetchRestaurantsPage = useCallback(async (offset: number): Promise<ApiResponse> => {
    const page = Math.floor(offset / mobileOptimizedItemsPerPage) + 1;
    const params = buildQueryParams(page, searchQuery, activeFilters);
    params.set('limit', mobileOptimizedItemsPerPage.toString());
    params.set('offset', offset.toString());
    const url = `/api/restaurants-with-images?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data: ApiResponse = await res.json();
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [mobileOptimizedItemsPerPage, buildQueryParams, searchQuery, activeFilters]);

  const schedulePrefetch = useCallback(async () => {
    if (!isMobileView) {
      return;
    }
    const nextOffset = allRestaurants.length;
    // Cancel any in-flight prefetch
    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    try {
      const data = await fetchRestaurantsPage(nextOffset);
      if (data.success && Array.isArray(data.data)) {
        prefetchRef.current = { offset: nextOffset, items: data.data, total: data.total };
      } else {
        prefetchRef.current = null;
      }
    } catch {
      prefetchRef.current = null;
    }
  }, [isMobileView, allRestaurants.length, fetchRestaurantsPage]);

  const { hasMore, isLoadingMore, loadingRef, setHasMore } = useInfiniteScroll(
    async () => {
      
      // Get current values using refs to avoid stale closures
      const currentItems = allRestaurants.length;
      const nextOffset = currentItems;
      const nextPage = Math.floor(nextOffset / mobileOptimizedItemsPerPage) + 1;
      
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Infinite scroll: Starting fetch', { nextOffset, nextPage, currentItems });
      }
      
      try {
        let data: ApiResponse | null = null;
        if (prefetchRef.current && prefetchRef.current.offset === nextOffset && prefetchRef.current.items.length > 0) {
          data = { success: true, data: prefetchRef.current.items, total: prefetchRef.current.total, error: null } as ApiResponse;
          prefetchRef.current = null; // consume prefetch
        } else {
          data = await fetchRestaurantsPage(nextOffset);
        }
        
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Infinite scroll: Response received', { 
            success: data.success, 
            dataLength: data.data?.length || 0, 
            total: data.total,
            hasData: !!data.data 
          });
        }
        
        if (data.success && data.data.length > 0) {
          // Append new restaurants to the accumulated list, ensuring no duplicates
          setAllRestaurants(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const newRestaurants = data.data.filter(r => !existingIds.has(r.id));
            return [...prev, ...newRestaurants];
          });
          setInfiniteScrollPage(nextPage);
          
          // Update total and check if we have more data
          setTotalRestaurants(data.total);
          const newTotalItems = currentItems + data.data.length;
          const hasMoreData = newTotalItems < data.total;
          setHasMore(hasMoreData);
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('Infinite scroll: Loaded page', nextPage, 'items:', data.data.length, 'total loaded:', newTotalItems, 'total available:', data.total, 'hasMore:', hasMoreData);
          }
          // Prime next prefetch
          if (hasMoreData) {
            schedulePrefetch();
          }
        } else {
          // No more data available
          setHasMore(false);
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('Infinite scroll: No more data available (empty response)');
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Request was aborted, ignore
        }
        console.error('Error fetching more restaurants:', err);
        // Back off after repeated failures to avoid infinite loading loop
        loadErrorCountRef.current += 1;
        if (loadErrorCountRef.current >= 2) {
          setHasMore(false);
        }
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('Infinite scroll: Error occurred. Failure count =', loadErrorCountRef.current);
        }
      }
    },
    { 
      threshold: isMobileView ? 0.15 : 0.2,
      rootMargin: isMobileView ? '200px' : '200px',
      disabled: loading || !isMobileView
    }
  );



  useEffect(() => {
    prefetchRef.current = null;
    prefetchAbortRef.current?.abort();
    fetchRestaurants(currentPage, searchQuery, activeFilters);
  }, [queryKey, fetchRestaurants]);



  // Reset hasMore when filters or search change
  useEffect(() => {
    if (isMobileView) {
      setHasMore(true);
      // kick off prefetch after new query change
      schedulePrefetch();
    }
  }, [searchQuery, activeFilters, isMobileView, setHasMore, schedulePrefetch]);



  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
    const checkAndShowLocationPrompt = async () => {
      // Only show prompt if we haven't shown it before and user doesn't have location
      if (!hasShownLocationPrompt && !userLocation && !locationLoading) {
        // Refresh permission status to ensure we have the latest state
        await refreshPermissionStatus();
        
        // Check the actual browser permission status
        const actualPermissionStatus = await checkPermissionStatus();
        
        // Only show prompt if permission is not denied and not granted
        if (actualPermissionStatus === 'prompt') {
          setShowLocationPrompt(true);
          setHasShownLocationPrompt(true);
        }
      }
    };

    checkAndShowLocationPrompt();
  }, [hasShownLocationPrompt, userLocation, locationLoading, checkPermissionStatus, refreshPermissionStatus]);

  // Close location prompt when user gets location
  useEffect(() => {
    if (showLocationPrompt && userLocation) {
      setShowLocationPrompt(false);
    }
  }, [showLocationPrompt, userLocation]);

  // Force re-render when permission status changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('📍 EateryPage: Permission status changed to:', permissionStatus);
    }
    
    // If permission is granted but we don't have location, request it
    if (permissionStatus === 'granted' && !userLocation && !locationLoading) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('📍 EateryPage: Permission granted but no location, requesting location');
      }
      requestLocation();
    }
  }, [permissionStatus, userLocation, locationLoading, requestLocation]);

  // Calculate distances and sort restaurants when location is available
  const restaurantsWithDistance = useMemo(() => {
    // Use the appropriate data source based on device type
    const dataSource = isMobileView ? allRestaurants : restaurants;
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('📍 EateryPage: Recalculating restaurant sorting', {
        hasUserLocation: !!userLocation,
        permissionStatus,
        restaurantCount: dataSource.length,
        isMobile,
        dataSource: isMobile ? 'allRestaurants' : 'restaurants'
      });
    }

    // If no location or permission not granted, return original order
    if (!userLocation || permissionStatus !== 'granted') {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('📍 EateryPage: No location available, returning original order');
      }
      return dataSource.map(restaurant => ({
        ...restaurant,
        distance: undefined
      }));
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('📍 EateryPage: Calculating distances and sorting by distance');
    }

    return dataSource.map(restaurant => {
      let distance: number | undefined;
      
      // Calculate distance if restaurant has coordinates
      if (restaurant.latitude && restaurant.longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          restaurant.latitude,
          restaurant.longitude
        );
      }
      
      return {
        ...restaurant,
        distance
      };
    }).sort((a, b) => {
      // Sort by distance if both have distances
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      // Put restaurants with distances first
      if (a.distance !== undefined && b.distance === undefined) {
        return -1;
      }
      if (a.distance === undefined && b.distance !== undefined) {
        return 1;
      }
      // Keep original order for restaurants without coordinates
      return 0;
    });
  }, [restaurants, allRestaurants, isMobile, userLocation, permissionStatus]);

  const displayedRestaurants = useMemo<(Restaurant | null)[]>(() => {
    const items: (Restaurant | null)[] = [...restaurantsWithDistance];
    if (isHydrated && isMobileView && isLoadingMore) {
      items.push(
        ...Array.from({ length: Math.min(mobileOptimizedItemsPerPage, 8) }).map(() => null)
      );
    }
    return items;
  }, [
    restaurantsWithDistance,
    isHydrated,
    isMobileView,
    isLoadingMore,
    mobileOptimizedItemsPerPage,
  ]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Note: hasMore will be reset when new data is loaded
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const handleShowFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  const handleApplyFilters = useCallback((filters: AppliedFilters) => {
    // Check if this is a "Clear All" operation (empty object)
    if (Object.keys(filters).length === 0) {
      // Clear all filters
      clearAllFilters();
    } else {
      // Clean the filters before applying
      const cleaned = cleanFilters(filters);
      
      // Remove keys that no longer exist in the new filters
      const keysToRemove = Object.keys(activeFilters).filter(k => !(k in cleaned));
      keysToRemove.forEach(k => {
        clearFilter(k as keyof typeof activeFilters);
      });
      
      // Set updated keys
      Object.entries(cleaned).forEach(([key, value]) => {
        if (value !== undefined) {
          setFilter(key as keyof typeof activeFilters, value);
        }
      });
    }
    
    // Reset to first page when applying filters
    setCurrentPage(1);
    setShowFilters(false);
    // Note: hasMore will be reset when new data is loaded
  }, [setFilter, clearFilter, clearAllFilters, activeFilters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 eatery-page">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
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
            onClick={() => fetchRestaurants(currentPage, searchQuery, activeFilters)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-20 eatery-page">
      <div className="sticky top-0 z-50 bg-white">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
        </div>
        
        <ActionButtons 
          onShowFilters={handleShowFilters}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-eatery')}
        />
      </div>
      
      {/* Location Permission Banner */}
      {permissionStatus === 'prompt' && !locationLoading && (
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
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshPermissionStatus}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-blue-100"
                title="Refresh permission status"
              >
                Refresh
              </button>
              <button
                onClick={requestLocation}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-3 py-1 rounded-lg hover:bg-blue-100"
              >
                Enable
              </button>
            </div>
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
              <span className="text-sm text-red-800">{locationError}</span>
            </div>
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
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : restaurantsWithDistance.length === 0 ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🍽️</div>
          <p className="text-lg text-gray-600 mb-2">No restaurants found</p>
          <p className="text-sm text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a restaurant!'
            }
          </p>
        </div>
      ) : (
        <GenericPageLayout
          items={displayedRestaurants}
          renderItem={(restaurant, index) => {
            if (!restaurant) {
              return (
                <div className="w-full" role="presentation">
                  <div className="skeleton-card">
                    <div className="skeleton-image" />
                    <div className="skeleton-row" />
                    <div className="skeleton-row short" />
                  </div>
                </div>
              );
            }
            return (
              <UnifiedCard
                data={{
                  id: String(restaurant.id),
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge:
                    typeof restaurant.google_rating === 'number'
                      ? restaurant.google_rating.toFixed(1)
                      : String(restaurant.google_rating || ''),
                  subtitle: restaurant.price_range || '',
                  additionalText: restaurant.distance
                    ? formatDistance(restaurant.distance)
                    : '',
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.kosher_category || restaurant.cuisine || '',
                  city: restaurant.address,
                  imageTag: restaurant.kosher_category || '',
                }}
                showStarInBadge={true}
                onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                priority={index < 4}
                className="w-full h-full"
              />
            );
          }}
          pageTitle="Kosher Eateries"
          enableInfiniteScroll={isHydrated && isMobileView}
          hasNextPage={hasMore}
          isLoadingMore={isLoadingMore}
          gridClassName={styles.eateryPageGrid}
          minColumnWidth="200px"
          sentinelRef={loadingRef}
          getItemKey={(restaurant, index) => restaurant ? restaurant.id : index}
        />
      )}
      
      {isHydrated && !isMobile && totalPages > 1 && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mt-4 mb-8" role="navigation" aria-label="Pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isLoading={loading}
                className="mb-2"
              />
              <div className="text-center text-sm text-gray-600">
                Showing {restaurantsWithDistance.length} of {restaurants.length * totalPages} restaurants
              </div>
            </div>
          </div>
        </div>
      )}



      {isHydrated && isMobileView && isLoadingMore && (
        <div className="loading-toast" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Loading more…</span>
        </div>
      )}

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation />

      {/* Filter Modal */}
      {/* Modern Filter Modal */}
      <ModernFilterPopup
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
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
