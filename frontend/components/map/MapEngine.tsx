/**
 * MapEngine - Pure Renderer Component
 * 
 * This component consumes the store and renders the map.
 * NO business state ownership - just connects store to GoogleMap adapter.
 */

'use client';

import React, { memo, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useLivemapStore, sel } from '@/lib/stores/livemap-store';
import GoogleMap from './vendors/GoogleMap';
import Header from '@/components/layout/Header';
import { ModernFilterPopup } from '@/components/filters/ModernFilterPopup';
import RestaurantDetails from './RestaurantDetails';
import { onBoundsChanged, onBoundsChangedImmediate } from '@/services/triggers';
import { loadRestaurantsInBounds } from '@/services/dataManager';
import { runFilter } from '@/services/workerManager';
import type { Bounds } from '@/types/livemap';

const MapEngine = () => {
  // 🔒 Use selectors only - never read raw state
  const ids = useLivemapStore(sel.filteredIds);
  const restaurants = useLivemapStore(sel.restaurantsById);
  const selected = useLivemapStore(sel.selected);
  const userLocation = useLivemapStore(sel.userLocation);
  const center = useLivemapStore((state) => sel.map(state).center);
  const zoom = useLivemapStore((state) => sel.map(state).zoom);
  const filters = useLivemapStore(sel.filters);
  const setFilters = useLivemapStore((state) => state.setFilters);
  
  // Filter modal state
  const [showFilters, setShowFilters] = useState(false);
  const select = useLivemapStore((state) => state.select);
  
  // Search handler
  const handleSearch = useCallback((query: string) => {
    setFilters({ ...filters, query });
  }, [filters, setFilters]);
  
  // Filter handlers
  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  // Convert IDs to restaurant objects for rendering
  const filteredRestaurants = useMemo(() => {
    if (!restaurants || !Array.isArray(restaurants)) {
      return [];
    }
    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));
    return ids
      .map((id) => restaurantMap.get(id))
      .filter((restaurant): restaurant is NonNullable<typeof restaurant> => 
        restaurant !== undefined
      );
  }, [ids, restaurants]);

  // Handle bounds changes - trigger data loading and filtering
  const handleBoundsChange = (bounds: Bounds) => {
    onBoundsChanged(bounds);
  };

  // Track if map has been initialized to prevent multiple calls
  const mapInitializedRef = useRef(false);

  // Initial data load when map is ready
  const handleMapReady = () => {
    // Prevent multiple initialization calls
    if (mapInitializedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🗺️ Map already initialized, skipping...');
      }
      return;
    }
    
    mapInitializedRef.current = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🗺️ Map ready, loading initial data...');
    }
    
        // Load initial data if we have bounds - use immediate loading for faster initial load
        const currentBounds = useLivemapStore.getState().map.bounds;
        if (currentBounds) {
          // Use immediate loading for initial data load (no debounce, no rate limiting)
          loadRestaurantsInBounds(currentBounds).then(() => {
            runFilter(); // Apply current filters to loaded data
          });
        }
  };

  // Handle restaurant selection
  const handleSelect = (restaurantId: string | null) => {
    select(restaurantId);
  };

  // Initialize URL sync once (temporarily disabled to prevent infinite loops)
  useEffect(() => {
    // initializeURLSync();
  }, []);

  // Auto-filter when restaurants change (but avoid infinite loops)
  useEffect(() => {
    const state = useLivemapStore.getState();
    if (state.restaurants.length > 0 && state.filtered.length === 0) {
      // Only run filter if we have restaurants but no filtered results yet
      runFilter();
    }
  }, [restaurants.length]);

  return (
    <div className="relative w-full h-full">
      {/* Header with integrated search and filter button */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <Header
          onSearch={handleSearch}
          placeholder="Search restaurants, agencies, or dietary preferences..."
          showFilters={true}
          onShowFilters={() => setShowFilters(true)}
          showBackButton={true}
          onBack={() => window.history.back()}
        />
        </div>


        <GoogleMap
        center={center}
        zoom={zoom}
        restaurants={filteredRestaurants}
        selectedId={selected?.id ?? null}
        userLocation={userLocation}
        onBoundsChange={handleBoundsChange}
        onSelect={handleSelect}
        onMapReady={handleMapReady}
        className="w-full h-full"
      />
      
              {/* Get Directions Button - Lower Right Corner */}
              {selected && selected.pos && (
                <div className="absolute top-28 right-4 z-20">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selected.pos.lat},${selected.pos.lng}`;
                      window.open(url, '_blank');
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    title={`Get directions to ${selected.name}`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Get Directions</span>
                  </button>
                </div>
              )}

              {/* Get My Location Button - Bottom Left Corner */}
              <div className="absolute bottom-4 left-4 z-20">
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      useLivemapStore.setState((state) => ({
                        loading: { ...state.loading, location: 'pending' },
                        error: null
                      }));

                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const newLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                          };
                          
                          useLivemapStore.getState().setMap({
                            center: newLocation,
                            zoom: 15
                          });
                          
                          useLivemapStore.setState((state) => ({
                            userLoc: newLocation,
                            loading: { ...state.loading, location: 'success' },
                            error: null
                          }));
                        },
                        (error) => {
                          console.error('Location error:', error);
                          useLivemapStore.setState((state) => ({
                            loading: { ...state.loading, location: 'error' },
                            error: `Location error: ${error.message}`
                          }));
                        },
                        {
                          enableHighAccuracy: true,
                          timeout: 10000,
                          maximumAge: 300000
                        }
                      );
                    } else {
                      useLivemapStore.setState((state) => ({
                        loading: { ...state.loading, location: 'error' },
                        error: 'Geolocation not supported by browser'
                      }));
                    }
                  }}
                  className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 border border-gray-200"
                  title="Get my location"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">My Location</span>
                </button>
              </div>
      
      <RestaurantDetails />
      
      {/* Filter Modal */}
      <ModernFilterPopup
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={filters}
        userLocation={userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : null}
        locationLoading={false}
        onRequestLocation={() => {
          // Handle location request if needed
        }}
      />
    </div>
  );
};

export default memo(MapEngine);
