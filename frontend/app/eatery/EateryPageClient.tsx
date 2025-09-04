'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import UnifiedCard from '@/components/ui/UnifiedCard';
import ActionButtons from '@/components/layout/ActionButtons';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { ModernFilterPopup } from '@/components/filters/ModernFilterPopup';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { useMobileOptimization } from '@/lib/mobile-optimization';
import { calculateDistance, formatDistance } from '@/lib/utils/distance';
import BottomNavigation from '@/components/navigation/ui/BottomNavigation';
import CategoryTabs from '@/components/navigation/ui/CategoryTabs';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';
import BackToTopButton from '@/components/common/BackToTopButton';
import { ENABLE_EATERY_INFINITE_SCROLL, IS_REPLACE_STATE_THROTTLE_MS } from '@/lib/config/infiniteScroll.constants';

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
  data: {
    restaurants: Restaurant[];
    total: number;
    filterOptions: {
      agencies: string[];
      kosherCategories: string[];
      listingTypes: string[];
      priceRanges: string[];
      cities: string[];
      states: string[];
    };
  };
  pagination: {
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
  };
}

export default function EateryPageClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  // Track loading and error states locally since useInfiniteScroll doesn't provide them
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastReplaceAt, setLastReplaceAt] = useState(0);
  
  // Mobile optimization hook
  const { viewportWidth } = useMobileOptimization();
  
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
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hasShownLocationPrompt') === 'true';
    }
    return false;
  });

  // FIXED: Freeze itemsPerPage per session to prevent pagination desync
  const [fixedItemsPerPage, setFixedItemsPerPage] = useState<number | null>(null);
  
  // Calculate items per page based on viewport - always 4 rows
  const itemsPerPage = useMemo(() => {
    let columnsPerRow = 1;

    if (viewportWidth >= 1441) {
      columnsPerRow = 8; // Large desktop: 8 × 4 = 32 items
    } else if (viewportWidth >= 1025) {
      columnsPerRow = 6; // Desktop: 6 × 4 = 24 items
    } else if (viewportWidth >= 769) {
      columnsPerRow = 4; // Large tablet: 4 × 4 = 16 items
    } else if (viewportWidth >= 641) {
      columnsPerRow = 3; // Small tablet: 3 × 4 = 12 items
    } else if (viewportWidth >= 360) {
      columnsPerRow = 2; // Standard mobile: 2 × 4 = 8 items
    } // otherwise remain at 1 column for very small screens: 1 × 4 = 4 items

    return columnsPerRow * 4; // Always exactly 4 rows
  }, [viewportWidth]);

  // FIXED: Freeze itemsPerPage once set to prevent pagination desync
  useEffect(() => {
    if (fixedItemsPerPage == null && itemsPerPage) {
      setFixedItemsPerPage(itemsPerPage);
    }
  }, [itemsPerPage, fixedItemsPerPage]);

  // Infinite scroll fetch function — trust hook's signal, no local AbortController
  const fetchMore = useCallback(async ({ signal, offset, limit }: { signal: AbortSignal; offset: number; limit: number }) => {
    try {
      // Set loading state for initial load
      if (offset === 0) {
        setLoading(true);
        setError(null);
      }
      
      const params = new URLSearchParams();
      const actualLimit = fixedItemsPerPage ?? limit;
      params.set('limit', String(actualLimit));
      params.set('offset', String(offset));
      
      if (searchQuery && searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      
      // FIXED: Proper array parameter handling for filters
      if (activeFilters) {
        for (const [key, value] of Object.entries(activeFilters)) {
          if (value == null) continue;
          if (typeof value === 'string' && !value.trim()) continue;
          if (Array.isArray(value)) {
            if (value.length === 0) continue;
            for (const v of value) params.append(key, String(v));
          } else {
            params.set(key, String(value));
          }
        }
      }

      // FIXED: Add distance sorting when location is available
      if (userLocation && permissionStatus === 'granted') {
        params.set('sortBy', 'distance');
        params.set('userLat', userLocation.latitude.toString());
        params.set('userLng', userLocation.longitude.toString());
      }

      const response = await fetch(`/api/restaurants-with-filters?${params.toString()}`, { signal });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        // Update total restaurants on first load
        if (offset === 0) {
          setTotalRestaurants(data.data.total);
          setRestaurants(data.data.restaurants);
        } else {
          // Append new restaurants, avoiding duplicates
          setRestaurants(prev => {
            const existingIds = new Set(prev.map(r => String(r.id)));
            const newRestaurants = data.data.restaurants.filter(r => !existingIds.has(String(r.id)));
            return [...prev, ...newRestaurants];
          });
        }
        
        // Clear loading and error states on success
        if (offset === 0) {
          setLoading(false);
          setError(null);
        }
        
        return { 
          appended: data.data.restaurants.length,
          hasMore: offset + data.data.restaurants.length < data.data.total
        };
      } else {
        throw new Error('Failed to fetch restaurants');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.error('Error fetching restaurants:', err);
      
      // Set error state for initial load
      if (offset === 0) {
        setError(err?.message || 'Failed to fetch restaurants');
        setLoading(false);
      }
      
      throw err;
    }
  }, [searchQuery, activeFilters, userLocation, permissionStatus, fixedItemsPerPage]);

  // Infinite scroll hook
  const { state, actions } = useInfiniteScroll(fetchMore, {
    limit: fixedItemsPerPage ?? itemsPerPage,
    reinitOnPageShow: true,
    isBot: false, // TODO: wire UA detection
    onAttempt: ({ offset, epoch }) => {
      // Analytics tracking could go here
      console.log('Infinite scroll attempt:', { offset, epoch });
    },
    onSuccess: ({ appended, offset, durationMs, epoch }) => {
      // Analytics tracking could go here
      console.log('Infinite scroll success:', { appended, offset, durationMs, epoch });
      
      // URL offset persistence (throttled)
      const now = performance.now();
      if (now - lastReplaceAt >= IS_REPLACE_STATE_THROTTLE_MS) {
        if (typeof window !== 'undefined') {
          const u = new URL(window.location.href);
          u.searchParams.set('offset', String(offset + appended));
          // carry sort key for durable navigation
          if (userLocation && permissionStatus === 'granted') {
            u.searchParams.set('sortBy', 'distance');
          }
          history.replaceState(null, '', u.toString());
          setLastReplaceAt(now);
        }
      }
    },
    onAbort: ({ cause, epoch }) => {
      // Analytics tracking could go here
      console.log('Infinite scroll abort:', { cause, epoch });
    },
  });

  // Stabilize actions usage inside effects/callbacks to avoid render loops
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  // FIXED: No more client-side resorting of paginated results
  const restaurantsWithDistance = useMemo(() => {
    if (!userLocation || permissionStatus !== 'granted') {
      return restaurants.map((restaurant) => ({
        ...restaurant,
        distance: undefined
      }));
    }

    return restaurants.map((restaurant) => {
      let distance: number | undefined;
      const hasLat = restaurant.latitude !== undefined && restaurant.latitude !== null;
      const hasLng = restaurant.longitude !== undefined && restaurant.longitude !== null;
      if (hasLat && hasLng) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          Number(restaurant.latitude),
          Number(restaurant.longitude)
        );
      }
      return {
        ...restaurant,
        distance
      };
    });
    // FIXED: Removed client-side sorting - backend handles this when sortBy=distance
  }, [restaurants, userLocation, permissionStatus]);

  // Initial data fetch/reset on query or filters change
  useEffect(() => {
    if (ENABLE_EATERY_INFINITE_SCROLL) {
      // Proactively clear to avoid stale counts/flash
      setRestaurants([]);
      setTotalRestaurants(0);
      setLoading(true);
      setError(null);
      actionsRef.current.resetForFilters();
    }
  }, [searchQuery, activeFilters]);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!hasShownLocationPrompt && !userLocation && !locationLoading) {
        const actualPermissionStatus = await checkPermissionStatus();
        
        if (actualPermissionStatus === 'prompt') {
          setShowLocationPrompt(true);
          setHasShownLocationPrompt(true);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('hasShownLocationPrompt', 'true');
          }
        }
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [hasShownLocationPrompt, userLocation, locationLoading, checkPermissionStatus]);

  // Close location prompt when user gets location
  useEffect(() => {
    if (showLocationPrompt && userLocation) {
      setShowLocationPrompt(false);
    }
  }, [showLocationPrompt, userLocation]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (ENABLE_EATERY_INFINITE_SCROLL) {
      actionsRef.current.resetForFilters();
    }
  }, []);

  // FIXED: Safe toggle without stale state closure
  const handleShowFilters = useCallback(() => {
    setShowFilters(v => !v);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
  }, []);

  const handleApplyFilters = useCallback((filters: AppliedFilters) => {
    if (Object.keys(filters).length === 0) {
      clearAllFilters();
    } else {
      const cleaned: Partial<typeof filters> = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && 
            !(typeof v === "string" && v.trim() === "") &&
            !(Array.isArray(v) && v.length === 0)) {
          cleaned[k as keyof typeof filters] = v;
        }
      });
      
      // FIXED: Batch filter updates to reduce re-renders
      const keysToRemove = Object.keys(activeFilters).filter(k => !(k in cleaned));
      keysToRemove.forEach(k => {
        clearFilter(k as keyof typeof activeFilters);
      });
      
      Object.entries(cleaned).forEach(([key, value]) => {
        if (value !== undefined) {
          setFilter(key as keyof typeof activeFilters, value);
        }
      });
    }
    
    if (ENABLE_EATERY_INFINITE_SCROLL) {
      actionsRef.current.resetForFilters();
    }
    setShowFilters(false);
  }, [setFilter, clearFilter, clearAllFilters, activeFilters]);

  // FIXED: Rating normalization function
  const toFixedRating = (val: number | string | undefined) => {
    const n = typeof val === 'number' ? val : Number.parseFloat(String(val ?? ''));
    return Number.isFinite(n) ? n.toFixed(1) : '';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 eatery-page">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Restaurants</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (ENABLE_EATERY_INFINITE_SCROLL) {
                actions.resetForFilters();
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 eatery-page">
      {/* Sticky Navigation Container */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <CategoryTabs 
          activeTab="eatery"
          onTabChange={() => {}}
        />
        
        <ActionButtons 
          onShowFilters={handleShowFilters}
          onShowMap={() => {}}
          onAddEatery={() => {}}
        />
      </div>

      {/* Location Status Banner */}
      {userLocation && permissionStatus === 'granted' && (
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
      )}
      
      {loading && restaurants.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : restaurantsWithDistance.length === 0 ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🍽️</div>
          <p className="text-lg text-gray-600 mb-2">No restaurants found</p>
          <p className="text-sm text-gray-500">
            {searchQuery || Object.keys(activeFilters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a restaurant!'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Eatery grid with reduced spacing - always 4 rows */}
          <div 
            className="restaurant-grid px-2 sm:px-4 lg:px-6"
            role="grid"
            aria-label="Restaurant listings"
            aria-busy={loading}
          >
            {restaurantsWithDistance.map((restaurant: any) => (
              <div 
                key={String(restaurant.id)}
                className="w-full" 
                role="gridcell"
              >
                <UnifiedCard
                  data={{
                    id: String(restaurant.id),
                    imageUrl: restaurant.image_url,
                    title: restaurant.name,
                    badge: toFixedRating(restaurant.google_rating),
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
                  onCardClick={() => {
                    const eateryName = restaurant.name
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, '')
                      .replace(/\s+/g, '-')
                      .replace(/-+/g, '-')
                      .trim();
                    // FIXED: Stable routing with ID to prevent collisions
                    router.push(`/eatery/${eateryName}-${restaurant.id}`);
                  }}
                  priority={false}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>

          {/* Infinite Scroll Sentinel */}
          {ENABLE_EATERY_INFINITE_SCROLL && (
            <LoadMoreSentinel
              ref={actions.attachSentinel}
              hasMore={state.hasMore}
              isLoading={loading}
              onRetry={state.showManualLoad ? actions.manualLoad : undefined}
              aria-label="Load more restaurants"
            />
          )}

          {/* Manual Load More Button (fallback) */}
          {ENABLE_EATERY_INFINITE_SCROLL && state.showManualLoad && (
            <div className="flex justify-center py-6">
              <button
                onClick={actions.manualLoad}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {loading ? 'Loading...' : 'Load More Restaurants'}
              </button>
            </div>
          )}

          {/* Status Information */}
          <div className="text-center text-sm text-gray-600 py-4" aria-live="polite">
            Showing {restaurants.length} of {totalRestaurants} restaurants
            {ENABLE_EATERY_INFINITE_SCROLL && state.hasMore && (
              <span className="ml-2">• Scroll to load more</span>
            )}
          </div>
        </>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation size="compact" showLabels="active-only" />

      {/* Filter Modal */}
      <ModernFilterPopup
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
        preloadedFilterOptions={null}
      />

      {/* Location Prompt Popup */}
      <LocationPromptPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSkip={() => {
          setShowLocationPrompt(false);
        }}
      />

      {/* Back to Top Button */}
      {ENABLE_EATERY_INFINITE_SCROLL && <BackToTopButton />}
    </div>
  );
}
