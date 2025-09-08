'use client';

/// <reference types="@types/google.maps" />
import React from 'react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { loadMaps } from '@/lib/maps/loader';
import { Restaurant } from '@/lib/types/restaurant';
import { performanceMonitor } from '@/lib/utils/performanceOptimization';
import { safeFilter } from '@/lib/utils/validation';
import { useMapAccessibility, announceLoadingState as _announceLoadingState } from '@/lib/hooks/useMapAccessibility';

import { useMarkerManagement } from './hooks/useMarkerManagement';


// Optional globals for clustering when available at runtime
declare global {
  interface Window {
    MarkerClusterer?: any;
    SuperClusterAlgorithm?: any;
  }
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface MapState {
  isLoadingMarkers: boolean;
  markerError: string | null;
  restaurantsWithCoords: Restaurant[];
  visibleCount: number | null;
}

interface InteractiveRestaurantMapProps {
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
  selectedRestaurantId?: number | null;
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  mapCenter?: { lat: number; lng: number };
  className?: string;
  showRatingBubbles?: boolean;
  onMapStateUpdate?: (state: MapState) => void;
  onBoundsChanged?: (bounds: google.maps.LatLngBounds) => void;
}

export function InteractiveRestaurantMap({
  restaurants,
  userLocation,
  selectedRestaurantId,
  onRestaurantSelect,
  mapCenter,
  className = '',
  showRatingBubbles = false,
  onMapStateUpdate,
  onBoundsChanged,
}: InteractiveRestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  // Removed directions-related refs since we now open Google Maps directly
  const selectedRestaurantIdRef = useRef<string | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState<number>(-1);
  const [mapState, setMapState] = useState<MapState>({
    isLoadingMarkers: false,
    markerError: null,
    restaurantsWithCoords: [],
    visibleCount: null,
  });

  // Create notification helper
  const _createNotification = useCallback((type: 'success' | 'error' | 'info', message: string): Notification => ({
    type,
    message,
  }), []);

  // Create user location marker
  const createUserLocationMarker = useCallback((map: google.maps.Map, location: { lat: number; lng: number }) => {
    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
    }

    // Create new user location marker
    userLocationMarkerRef.current = new google.maps.Marker({
      position: location,
      map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
      zIndex: 1000, // Ensure it's above other markers
    });
  }, []);

  // Filter restaurants with coordinates
  const restaurantsWithCoords = useMemo((): Restaurant[] => {
    return safeFilter(restaurants, (restaurant: Restaurant) => {
      return Boolean(restaurant.latitude && restaurant.longitude &&
        typeof restaurant.latitude === 'number' && typeof restaurant.longitude === 'number');
    });
  }, [restaurants]);

  // Accessibility features
  const {
    announceMapUpdate: _announceMapUpdate,
    announceRestaurantSelection,
    handleKeyboardNavigation,
    setUpAriaLabels,
    cleanupAccessibility: _cleanupAccessibility,
  } = useMapAccessibility({
    enabled: true,
    announceMapUpdates: true,
    enableKeyboardNavigation: true,
  });

  // Initialize map
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        await loadMaps();
        
        if (!isMounted || !mapRef.current) {
          return;
        }

        // Check if Map ID is available for Advanced Markers
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

        // Determine zoom level - use 13 for 5-mile radius when centering on user location
        const zoomLevel = mapCenter ? 13 : 12;
        
        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter || { lat: 25.7617, lng: -80.1918 }, // Miami default
          zoom: zoomLevel,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapId, // Required for Advanced Markers
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: true,
          gestureHandling: 'cooperative',
        });

        if (!isMounted) {
          return;
        }

        mapInstanceRef.current = map;

        // Set up accessibility features
        if (mapRef.current) {
          setUpAriaLabels(mapRef.current);
          
          // Add keyboard navigation
          const handleKeyDown = (event: KeyboardEvent) => {
            handleKeyboardNavigation(
              event,
              restaurantsWithCoords,
              keyboardSelectedIndex,
              (newIndex) => {
                setKeyboardSelectedIndex(newIndex);
                if (newIndex >= 0 && newIndex < restaurantsWithCoords.length) {
                  const restaurant = restaurantsWithCoords[newIndex];
                  onRestaurantSelect?.(restaurant);
                  announceRestaurantSelection(restaurant.name || 'Unknown restaurant');
                }
              }
            );
          };

          mapRef.current.addEventListener('keydown', handleKeyDown);
          
          // Store the handler for cleanup
          (map as any)._accessibilityHandler = handleKeyDown;
        }

        // Note: user location marker is managed by a separate effect

        // Removed directions service initialization since we now open Google Maps directly

        // Add bounds change listener for viewport-based loading
        if (onBoundsChanged) {
          map.addListener('bounds_changed', () => {
            const bounds = map.getBounds();
            if (bounds) {
              onBoundsChanged(bounds);
            }
          });
          
          // Store listener for cleanup
          mapInstanceRef.current = map;
        }

        // Update map state
        setMapState(prev => ({
          ...prev,
          restaurantsWithCoords,
          visibleCount: restaurantsWithCoords.length,
        }));

      } catch (_error) {
        if (!isMounted) {
          return;
        }
        
        // Map initialization failed
        setMapState(prev => ({
          ...prev,
          markerError: 'Failed to load map',
        }));
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      // Cleanup accessibility
      const currentMapRef = mapRef.current;
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._accessibilityHandler) {
        currentMapRef?.removeEventListener('keydown', (mapInstanceRef.current as any)._accessibilityHandler);
      }
      _cleanupAccessibility();
      
      // Cleanup map instances
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
        userLocationMarkerRef.current = null;
      }
    };
  }, [mapCenter, onBoundsChanged, restaurantsWithCoords, announceRestaurantSelection, handleKeyboardNavigation, keyboardSelectedIndex, onRestaurantSelect, setUpAriaLabels, _cleanupAccessibility]); // Include all dependencies

  // Update user location marker when user location changes
  useEffect(() => {
    if (mapInstanceRef.current && userLocation) {
      createUserLocationMarker(mapInstanceRef.current, userLocation);
    }
  }, [userLocation, createUserLocationMarker]);

  // Use marker management hook with proper SSR handling
  const {
    markersRef: _markersRef,
    markersMapRef: _markersMapRef,
    clustererRef: _clustererRef,
    getRestaurantKey: _getRestaurantKey,
    cleanupMarkers: _cleanupMarkers,
    createMarker: _createMarker,
    applyClustering: _applyClustering
  } = useMarkerManagement({
    map: mapInstanceRef.current,
    restaurants: restaurantsWithCoords,
    onRestaurantSelect,
    selectedRestaurantId,
    showRatingBubbles,
  });

  // Update selected restaurant
  useEffect(() => {
    selectedRestaurantIdRef.current = selectedRestaurantId?.toString() || null;
  }, [selectedRestaurantId]);

  // Removed getDirections function since we now open Google Maps directly

  // Removed getUserLocation function since it's not used in this component

  // Removed clearDirections function since we no longer use Google Maps Directions API

  // Announce map updates for accessibility
  useEffect(() => {
    _announceMapUpdate(restaurantsWithCoords.length);
  }, [restaurantsWithCoords.length, _announceMapUpdate]);

  // Announce loading states
  useEffect(() => {
    if (mapState.isLoadingMarkers) {
      announceLoadingState('loading', 'restaurant markers');
    } else if (mapState.markerError) {
      announceLoadingState('error', 'restaurant markers');
    } else {
      announceLoadingState('loaded', 'restaurant markers');
    }
  }, [mapState.isLoadingMarkers, mapState.markerError]);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      performanceMonitor.measure('map_render', () => endTime - startTime);
    };
  }, []);

  // Update map state for parent component
  useEffect(() => {
    onMapStateUpdate?.(mapState);
  }, [mapState, onMapStateUpdate]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Controls - Removed emoji icons, using proper MapControls component instead */}

      {/* Restaurant Actions - Removed Get Directions button (moved to top right in UnifiedLiveMapClient) */}

      {/* Map Error Display */}
      {mapState.markerError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 rounded-lg shadow-md bg-red-500 text-white">
          {mapState.markerError}
          <button
            onClick={() => setMapState(prev => ({ ...prev, markerError: null }))}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 rounded-lg shadow-md transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          {notification.message}
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}

export default InteractiveRestaurantMap;
