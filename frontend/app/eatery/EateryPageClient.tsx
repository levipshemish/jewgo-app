'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { useLocation } from '@/lib/contexts/LocationContext';
// Wrapped locally for thinner client
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { useMobileOptimization } from '@/lib/mobile-optimization';
import { calculateDistance } from '@/lib/utils/distance';
import { eaterySlug } from '@/lib/utils/slug';
import BottomNavigation from '@/components/navigation/ui/BottomNavigation';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import BackToTopButton from '@/components/common/BackToTopButton';
import { ENABLE_EATERY_INFINITE_SCROLL, IS_REPLACE_STATE_THROTTLE_MS } from '@/lib/config/infiniteScroll.constants';
import HeaderBlock from './components/HeaderBlock';
import LocationBanner from './components/LocationBanner';
import RestaurantGrid from './components/RestaurantGrid';
import InfiniteScrollControls from './components/InfiniteScrollControls';
import StatusInfo from './components/StatusInfo';
import ErrorState from './components/ErrorState';
import EateryFilterModal from './components/EateryFilterModal';
import EateryLocationPrompt from './components/EateryLocationPrompt';
import type { LightRestaurant, ApiResponse } from './types';

// Lightweight shared types for the Eatery page live in ./types

export default function EateryPageClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<LightRestaurant[]>([]);
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
      <ErrorState 
        message={error}
        onSearch={handleSearch}
        onShowFilters={handleShowFilters}
        onRetry={() => {
          setError(null);
          if (ENABLE_EATERY_INFINITE_SCROLL) {
            actionsRef.current.resetForFilters();
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 eatery-page">
      <HeaderBlock onSearch={handleSearch} onShowFilters={handleShowFilters} />

      {/* Location Status Banner */}
      <LocationBanner show={!!(userLocation && permissionStatus === 'granted')} />
      
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
          <RestaurantGrid 
            items={restaurantsWithDistance}
            loading={loading}
            toFixedRating={toFixedRating}
            onCardClick={(restaurant) => {
              router.push(`/eatery/${eaterySlug(restaurant.name, restaurant.id)}`);
            }}
          />

          <InfiniteScrollControls 
            enable={ENABLE_EATERY_INFINITE_SCROLL}
            hasMore={state.hasMore}
            loading={loading}
            showManualLoad={state.showManualLoad}
            attachSentinel={actions.attachSentinel}
            onManualLoad={actions.manualLoad}
          />

          <StatusInfo 
            shown={restaurants.length}
            total={totalRestaurants}
            showMoreHint={ENABLE_EATERY_INFINITE_SCROLL && state.hasMore}
          />
        </>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation size="compact" showLabels="active-only" />

      {/* Filter Modal */}
      <EateryFilterModal
        isOpen={showFilters}
        onClose={handleCloseFilters}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
        userLocation={userLocation}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
      />

      {/* Location Prompt Popup */}
      <EateryLocationPrompt
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSkip={() => setShowLocationPrompt(false)}
      />

      {/* Back to Top Button */}
      {ENABLE_EATERY_INFINITE_SCROLL && <BackToTopButton />}
    </div>
  );
}
