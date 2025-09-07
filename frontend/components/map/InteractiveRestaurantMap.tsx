'use client';

/// <reference types="@types/google.maps" />
import React from 'react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { loadMaps } from '@/lib/maps/loader';
import { Restaurant } from '@/lib/types/restaurant';
import { performanceMonitor } from '@/lib/utils/performanceOptimization';
import { safeFilter } from '@/lib/utils/validation';

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
}: InteractiveRestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const selectedRestaurantIdRef = useRef<string | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    isLoadingMarkers: false,
    markerError: null,
    restaurantsWithCoords: [],
    visibleCount: null,
  });

  // Create notification helper
  const createNotification = useCallback((type: 'success' | 'error' | 'info', message: string): Notification => ({
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
        if (!mapId) {
          console.warn('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID not set. Advanced Markers will not be available.');
        }

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

        // Note: user location marker is managed by a separate effect

        // Initialize directions service
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 4,
            strokeOpacity: 0.8,
          },
        });
        directionsRendererRef.current.setMap(map);

        // Update map state
        setMapState(prev => ({
          ...prev,
          restaurantsWithCoords,
          visibleCount: restaurantsWithCoords.length,
        }));

      } catch (error) {
        if (!isMounted) {
          return;
        }
        
        console.error('Failed to initialize map:', error);
        setMapState(prev => ({
          ...prev,
          markerError: 'Failed to load map',
        }));
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      // Cleanup map instances
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
        userLocationMarkerRef.current = null;
      }
      directionsServiceRef.current = null;
    };
  }, [mapCenter, restaurantsWithCoords]);

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

  // Get directions to restaurant
  const getDirections = useCallback(async (restaurant: Restaurant) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current || !userLocation) {
      setNotification(createNotification('error', 'Unable to get directions. Please check your location and try again.'));
      return;
    }

    try {
      const request: google.maps.DirectionsRequest = {
        origin: userLocation,
        destination: { lat: restaurant.latitude!, lng: restaurant.longitude! },
        travelMode: google.maps.TravelMode.DRIVING,
      };

      const result = await directionsServiceRef.current.route(request);
      
      if (result.routes && result.routes.length > 0) {
        directionsRendererRef.current!.setDirections(result);
        setNotification(createNotification('success', `Directions to ${restaurant.name} loaded successfully!`));
      } else {
        setNotification(createNotification('error', 'Unable to calculate directions. Please try again.'));
      }
    } catch (error) {
      console.error('Directions error:', error);
      setNotification(createNotification('error', 'Unable to calculate directions. Please try again.'));
    }
  }, [userLocation, createNotification]);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setNotification(createNotification('error', 'Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNotification(createNotification('success', 'Location obtained successfully!'));
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setZoom(15);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setNotification(createNotification('error', 'Unable to get your location. Please check your location settings.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [createNotification]);

  // Clear directions
  const clearDirections = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ 
        routes: [],
        geocoded_waypoints: [],
        request: {} as google.maps.DirectionsRequest
      });
    }
  }, []);

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

      {/* Restaurant Actions */}
      {selectedRestaurantId && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => {
              const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
              if (restaurant) {
                getDirections(restaurant);
              }
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors"
          >
            Get Directions
          </button>
        </div>
      )}

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
