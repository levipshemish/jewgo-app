'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { loadMaps } from '@/lib/maps/loader';
import { Restaurant } from '@/lib/types/restaurant';
import { performanceMonitor } from '@/lib/utils/performanceOptimization';
import { safeFilter } from '@/lib/utils/validation';

import { useMarkerManagement } from './hooks/useMarkerManagement';
import { MapPerformanceMonitor } from '../monitoring/MapPerformanceMonitor';

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
  selectedRestaurantId?: string | null;
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

        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter || { lat: 25.7617, lng: -80.1918 }, // Miami default
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
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
      directionsServiceRef.current = null;
    };
  }, [mapCenter, restaurantsWithCoords]);

  // Use marker management hook
  const {
    // markersRef,
    // markersMapRef,
    // clustererRef,
    // getRestaurantKey,
    // cleanupMarkers,
    // createMarker,
    // applyClustering
  } = useMarkerManagement({
    map: mapInstanceRef.current,
    restaurants: restaurantsWithCoords,
    onRestaurantSelect,
    selectedRestaurantId,
    showRatingBubbles,
  });

  // Update selected restaurant
  useEffect(() => {
    selectedRestaurantIdRef.current = selectedRestaurantId || null;
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
        geocoded_waypoints: []
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
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <button
          onClick={getUserLocation}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Get my location"
        >
          📍
        </button>
        
        <button
          onClick={clearDirections}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Clear directions"
        >
          🗑️
        </button>
      </div>

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

      {/* Performance Monitor */}
      {process.env.NODE_ENV === 'development' && (
        <MapPerformanceMonitor />
      )}
    </div>
  );
}

export default InteractiveRestaurantMap;
