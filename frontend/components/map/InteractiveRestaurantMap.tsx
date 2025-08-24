'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { loadMaps } from '@/lib/maps/loader';
import { Restaurant } from '@/lib/types/restaurant';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';
import { throttle, createBatchProcessor, performanceMonitor, safeSetTimeout } from '@/lib/utils/performanceOptimization';
import { safeFilter } from '@/lib/utils/validation';
import { favoritesManager } from '@/lib/utils/favorites';

import { useMarkerManagement } from './hooks/useMarkerManagement';
import { MapPerformanceMonitor } from '../monitoring/MapPerformanceMonitor';

// Optional globals for clustering when available at runtime
declare global {
  interface Window {
    MarkerClusterer?: any;
    SuperClusterAlgorithm?: any;
  }
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface MapState {
  isLoadingMarkers: boolean;
  markerError: string | null;
  restaurantsWithCoords: Restaurant[];
  visibleCount?: number;
}

interface InteractiveRestaurantMapProps {
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurantId: number) => void;
  selectedRestaurantId?: number;
  userLocation?: UserLocation | null;
  mapCenter?: { lat: number; lng: number } | null;
  className?: string;
  showRatingBubbles?: boolean;
  onUserLocationUpdate?: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
  onMapStateUpdate?: (state: MapState) => void;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function InteractiveRestaurantMap({
  restaurants, onRestaurantSelect, selectedRestaurantId, userLocation, mapCenter, className = "h-96", showRatingBubbles = true, onUserLocationUpdate, onMapStateUpdate
}: InteractiveRestaurantMapProps) {
  // Defensive validation: ensure restaurants is always an array
  const safeRestaurants = restaurants || [];
  
  const [mapError, setMapError] = useState<string | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isLoadingMarkers] = useState(false);
  const [markerError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  
  // Add info window cache for performance
  const infoWindowCache = useRef<Map<number, { content: string; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Set up global toggle favorite function for map popups
  useEffect(() => {
    (window as any).toggleMapFavorite = (restaurantId: string, buttonElement: HTMLElement) => {
      const restaurant = restaurants.find(r => r.id.toString() === restaurantId);
      if (!restaurant) return;
      
      const isCurrentlyFavorite = favoritesManager.isFavorite(restaurantId);
      const success = isCurrentlyFavorite 
        ? favoritesManager.removeFavorite(restaurantId)
        : favoritesManager.addFavorite(restaurant);
      
      if (success) {
        // Update button appearance immediately
        const newIsFavorite = !isCurrentlyFavorite;
        const button = buttonElement;
        
        // Update data attribute
        button.setAttribute('data-favorite', newIsFavorite ? 'true' : 'false');
        
        // Update button classes and SVG
        if (newIsFavorite) {
          // Update button styles for favorite state
          button.className = button.className.replace(
            'bg-white/90 hover:bg-white text-gray-600 hover:text-red-500',
            'bg-red-100 text-red-500 hover:bg-red-200'
          );
          button.setAttribute('title', 'Remove from favorites');
          
          // Make heart filled
          const svg = button.querySelector('svg');
          if (svg) {
            svg.classList.add('fill-current');
            svg.setAttribute('fill', 'currentColor');
          }
        } else {
          // Update button styles for non-favorite state
          button.className = button.className.replace(
            'bg-red-100 text-red-500 hover:bg-red-200',
            'bg-white/90 hover:bg-white text-gray-600 hover:text-red-500'
          );
          button.setAttribute('title', 'Add to favorites');
          
          // Make heart outlined
          const svg = button.querySelector('svg');
          if (svg) {
            svg.classList.remove('fill-current');
            svg.setAttribute('fill', 'none');
          }
        }
        
        // Add a little animation effect
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 150);
      }
    };
    
    // Cleanup
    return () => {
      delete (window as any).toggleMapFavorite;
    };
  }, [restaurants]);

  // Filter restaurants with valid coordinates and addresses - memoized for performance
  const restaurantsWithCoords = useMemo(() => {
    const filtered = safeFilter(safeRestaurants, (restaurant: Restaurant) => {
      // Check if restaurant has valid coordinates
      if (!restaurant.latitude || !restaurant.longitude) {return false;}
      const lat = parseFloat(restaurant.latitude.toString());
      const lng = parseFloat(restaurant.longitude.toString());
      return !isNaN(lat) && !isNaN(lng);
    });
    
    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('InteractiveRestaurantMap: Restaurant filtering:', {
        totalRestaurants: safeRestaurants.length,
        restaurantsWithCoords: filtered.length,
        sampleRestaurant: safeRestaurants[0] ? {
          id: safeRestaurants[0].id,
          name: safeRestaurants[0].name,
          hasCoords: !!(safeRestaurants[0].latitude && safeRestaurants[0].longitude),
          latitude: safeRestaurants[0].latitude,
          longitude: safeRestaurants[0].longitude
        } : null,
        filteredSample: filtered[0] ? {
          id: filtered[0].id,
          name: filtered[0].name,
          latitude: filtered[0].latitude,
          longitude: filtered[0].longitude
        } : null
      });
    }
    
    return filtered;
  }, [safeRestaurants]);

  // Use the marker management hook for proper marker handling
  const {
    markersRef,
    markersMapRef,
    clustererRef,
    getRestaurantKey,
    cleanupMarkers,
    createMarker,
    applyClustering
  } = useMarkerManagement({
    restaurants: restaurantsWithCoords,
    selectedRestaurantId,
    userLocation,
    showRatingBubbles,
    enableClustering: true,
    onRestaurantSelect
  });

  // Keep a ref to avoid TS ordering issues in callbacks
  const restaurantsWithCoordsRef = useRef<Restaurant[]>([]);
  useEffect(() => {
    restaurantsWithCoordsRef.current = restaurantsWithCoords;
  }, [restaurantsWithCoords]);

  useEffect(() => {
    selectedRestaurantIdRef.current = selectedRestaurantId;
  }, [selectedRestaurantId]);

  const mapRef = useRef<HTMLDivElement>(null);
  const computeVisibleCount = useCallback(() => {
    try {
      const map = mapInstanceRef.current;
      if (!map || !window.google?.maps) { 
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console

        }
        return; 
      }
      const bounds = map.getBounds?.();
      if (!bounds) { 
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console

        }
        return; 
      }
      let count = 0;
      for (const r of restaurantsWithCoordsRef.current) {
        if (r.latitude === undefined || r.longitude === undefined) { continue; }
        const lat = Number(r.latitude);
        const lng = Number(r.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) { continue; }
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        if (
          lat >= sw.lat() && lat <= ne.lat() &&
          lng >= sw.lng() && lng <= ne.lng()
        ) {
          count += 1;
        }
      }
      // schedule all state writes in a single animation frame
      requestAnimationFrame(() => {
      setVisibleCount(count);
      });
    } catch {
      // ignore
    }
  }, [isLoadingMarkers, markerError]);

  // Store the callback in a ref to avoid dependency issues
  const onMapStateUpdateRef = useRef(onMapStateUpdate);
  onMapStateUpdateRef.current = onMapStateUpdate;

  // Handle parent state updates separately to avoid infinite loops
  useEffect(() => {
    if (onMapStateUpdateRef.current) {
      onMapStateUpdateRef.current({ 
        isLoadingMarkers, 
        markerError, 
        restaurantsWithCoords: restaurantsWithCoordsRef.current, 
        visibleCount 
      });
    }
  }, [isLoadingMarkers, markerError, visibleCount]);

  // Keyboard navigation handler - memoized for performance
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Close any open info windows or popups
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    }
  }, []);

  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const lastRenderKeyRef = useRef<string | null>(null);
  const selectedRestaurantIdRef = useRef<number | undefined>(selectedRestaurantId);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRenderedIdsRef = useRef<Set<number>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isClusteringRef = useRef<boolean>(false);
  // Marker pool disabled to prevent "old marker" content issues
  const markerPoolRef = useRef<Map<string, (google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>>(new Map());

  // Safe error message helper
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const safeErrorMessage = useCallback((err: unknown): string => {
    if (err && typeof err === 'object' && 'message' in (err as any)) {
      return String((err as any).message ?? 'Unknown error');
    }
    return typeof err === 'string' ? err : 'Unknown error';
  }, []);

  // Marker pooling helper for better performance
  const getPooledMarker = useCallback((restaurant: Restaurant, _map: google.maps.Map) => {
    const key = getRestaurantKey(restaurant);
    const pool = markerPoolRef.current.get(key);
    
    if (pool && pool.length > 0) {
      // Remove from pool but don't reuse - create fresh marker to avoid content issues
      pool.pop();
      // Always create new marker with proper content to avoid "old marker" issues
      return null;
    }
    
    return null;
  }, [getRestaurantKey]);

  // Simplified marker cleanup without pooling to avoid content issues
  const returnMarkerToPool = useCallback((marker: google.maps.marker.AdvancedMarkerElement, _key: string) => {
    try {
      // Remove from map and let garbage collection handle cleanup
      (marker as any).map = null;
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // Use imported performance-optimized throttle function

  // Debounce marker updates to improve performance
  const debouncedUpdateMarkers = useCallback(
    throttle((map: google.maps.Map, inView: Restaurant[]) => {
      // Clear existing markers first
      cleanupMarkers();

      // Create markers using the hook's createMarker function
      const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
      
      // Use performance-optimized batch processor
      const processMarker = (restaurant: Restaurant) => {
        const marker = createMarker(restaurant, map);
        if (marker) {
          newMarkers.push(marker);
          markersMapRef.current.set(parseInt(restaurant.id.toString()), marker);
        }
      };
      
      const batchProcessor = createBatchProcessor(inView, processMarker, 5, 16);
      
      // Start batch processing
      if (inView.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('debouncedUpdateMarkers: Processing', inView.length, 'restaurants in view');
        }
        batchProcessor();
      } else {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('debouncedUpdateMarkers: No restaurants in view');
        }
        markersRef.current = newMarkers;
        currentRenderedIdsRef.current = new Set();
        applyClustering(map);
      }
      
      // Update refs and apply clustering after processing
      const finalizeMarkers = () => {
        markersRef.current = newMarkers;
        currentRenderedIdsRef.current = new Set(Array.isArray(inView) ? inView.map(r => parseInt(r.id.toString())) : []);
        applyClustering(map);
      };
      
      // Use performance monitor to track marker creation
      performanceMonitor.measure('Marker Creation', finalizeMarkers);
    }, 300), // Increased throttle to 300ms for better performance
    [cleanupMarkers, createMarker, applyClustering]
  );

  // Cleanup timeouts and marker pool on unmount
  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      
      // Clean up marker pool (simplified)
      markerPoolRef.current.clear();
    };
  }, []);

  // Debug logging for restaurant data
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('InteractiveRestaurantMap: Restaurant filtering:', {
      totalRestaurants: restaurants.length,
      restaurantsWithCoords: restaurantsWithCoords.length,
      sampleRestaurant: restaurantsWithCoords[0] ? {
        id: restaurantsWithCoords[0].id,
        name: restaurantsWithCoords[0].name,
        lat: restaurantsWithCoords[0].latitude,
        lng: restaurantsWithCoords[0].longitude
      } : null,
      filteredSample: restaurantsWithCoords.slice(0, 3).map(r => ({ 
        id: r.id, 
        name: r.name, 
        lat: r.latitude, 
        lng: r.longitude 
      }))
    });
  }

  // Load Google Maps API via unified loader
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMaps();
        if (!cancelled) {
          setApiLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setMapError('Failed to load Google Maps API');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize map (only once)
  useEffect(() => {
    if (!apiLoaded || !mapRef.current || mapError) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console

      }
      return;
    }

    try {
      // Verify Google Maps API is fully loaded
      if (!window.google || !window.google.maps || !window.google.maps.LatLngBounds) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('InteractiveRestaurantMap: Google Maps API not fully loaded:', {
            hasGoogle: !!window.google,
            hasMaps: !!(window.google && window.google.maps),
            hasLatLngBounds: !!(window.google && window.google.maps && window.google.maps.LatLngBounds)
          });
        }
        setMapError('Google Maps API not fully loaded');
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('InteractiveRestaurantMap: Google Maps API loaded. Available libraries:', {
          hasMarkerLibrary: !!(window.google.maps.marker),
          hasAdvancedMarker: !!(window.google.maps.marker?.AdvancedMarkerElement),
          hasRegularMarker: !!(window.google.maps.Marker),
          hasLatLngBounds: !!(window.google.maps.LatLngBounds),
          hasGeometry: !!((window.google.maps as any)?.geometry)
        });
      }

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console

      }

      // Only create map if it doesn't exist
      if (!mapInstanceRef.current) {
        // Calculate initial bounds and center
        const bounds = new window.google.maps.LatLngBounds();
        let center = { lat: 25.7617, lng: -80.1918 }; // Miami default

        // If user location is available, use it as center
        if (userLocation) {
          center = { lat: userLocation.latitude, lng: userLocation.longitude };
          bounds.extend(new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude));
        }

        // Add restaurant locations to bounds
        if (restaurantsWithCoords.length > 0) {
          restaurantsWithCoords.forEach(restaurant => {
            if (restaurant.latitude !== undefined && restaurant.longitude !== undefined) {
              bounds.extend(new window.google.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude)));
            }
          });
        }

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console

        }

        // Create map
        const mapId = process.env['NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID'];
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console

        }

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: userLocation ? 14 : 10, // Very zoomed in view if user location available
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          ...(mapId ? { mapId } : {}),
          // Only apply custom styles if no Map ID is present
          ...(mapId ? {} : {
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'simplified' }]
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'simplified' }]
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#e3f2fd' }]
              },
              {
                featureType: 'poi.park',
                elementType: 'geometry',
                stylers: [{ color: '#e8f5e8' }]
              }
            ]
          }),
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy'
        });

        mapInstanceRef.current = map;

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console

        }

        // Performance-optimized idle handler with debouncing
        map.addListener('idle', () => {
          // Clear any pending timeouts
          if (idleTimeoutRef.current) {
            clearTimeout(idleTimeoutRef.current);
          }
          if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
          }
          
          // Use performance-optimized scheduling with increased debounce
          idleTimeoutRef.current = safeSetTimeout(() => {
            try {
              renderVisibleMarkers();
              computeVisibleCount();
            } catch {}
          }, 250); // Increased to 250ms delay after idle for better performance
        });

        // Create info window
        infoWindowRef.current = new window.google.maps.InfoWindow({
          disableAutoPan: false,
          maxWidth: 400
        });

        // If mapCenter is provided (from URL parameters), center on it
        if (mapCenter) {
          map.setCenter(mapCenter);
          map.setZoom(16); // Zoom in close to the specific location
        } else if (userLocation) {
          // If user location is available, center on it with proper zoom
          map.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
          map.setZoom(14); // Very zoomed in view as default
        } else if (restaurantsWithCoords.length > 0) {
          // Only fit bounds if no user location (fallback to restaurant bounds)
          map.fitBounds(bounds);
        }

        // Force an initial render after map is fully loaded
        const tilesLoadedListener = map.addListener('tilesloaded', () => {
          renderTimeoutRef.current = safeSetTimeout(() => {
            try { 
              renderVisibleMarkers(); 
            } catch {}
          }, 100);
          // Remove the listener after it fires once
          if (tilesLoadedListener) {
            tilesLoadedListener.remove();
          }
        });

      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('InteractiveRestaurantMap: Error initializing map:', error);
      }
      setMapError('Failed to initialize map');
    }

  }, [apiLoaded, mapError, mapCenter]); // Removed userLocation to prevent re-initialization

  // Viewport-gated, threshold-aware rendering using the marker management hook
  const renderVisibleMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) { 
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console

      }
      return; 
    }

    const bounds = map.getBounds?.();
    if (!bounds) { 
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console

      }
      return; 
    }

    // Compute restaurants within current viewport
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const inView = restaurantsWithCoords.filter((r) => {
      if (r.latitude === undefined || r.longitude === undefined) { 
        return false; 
      }
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { 
        return false; 
      }
      return lat >= sw.lat() && lat <= ne.lat() && lng >= sw.lng() && lng <= ne.lng();
    });

    // Enhanced guard against excessive rerenders with more granular bounds checking
    const zoom = map.getZoom?.() ?? 0;
    const boundsKey = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)}:${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}:z${zoom}`;
    const nextKey = `${boundsKey}|count=${inView.length}|b=${showRatingBubbles ? 1 : 0}`;
    
    // Check if the change is significant enough to warrant a re-render
    if (lastRenderKeyRef.current === nextKey && selectedRestaurantIdRef.current === selectedRestaurantId) {
      return; // Skip render if nothing meaningful changed
    }
    
    // Additional check: if only a few restaurants are in view and they're the same, skip render
    if (lastRenderKeyRef.current && inView.length <= 5) {
      const lastKeyParts = lastRenderKeyRef.current.split('|');
      const currentKeyParts = nextKey.split('|');
      if (lastKeyParts[2] === currentKeyParts[2] && selectedRestaurantIdRef.current === selectedRestaurantId) {
        // Only bounds changed but same restaurants in view - check if change is minimal
        const lastBounds = lastKeyParts[0];
        const currentBounds = currentKeyParts[0];
        if (lastBounds === currentBounds) {
          return; // Skip render for minimal changes
        }
      }
    }
    
    lastRenderKeyRef.current = nextKey;

    // Smart marker management: only update what's necessary
    const currentIds = new Set(currentRenderedIdsRef.current);
    const newIds = new Set(Array.isArray(inView) ? inView.map(r => parseInt(r.id.toString())) : []);
    
    // Remove markers that are no longer in view
    const toRemove = Array.from(currentIds).filter(id => !newIds.has(id));
    toRemove.forEach(id => {
      const marker = markersMapRef.current.get(id);
      if (marker) {
        const restaurant = (Array.isArray(inView) ? inView.find(r => parseInt(r.id.toString()) === parseInt(id.toString())) : null) || restaurantsWithCoords.find(r => parseInt(r.id.toString()) === parseInt(id.toString()));
        if (restaurant) {
          const key = getRestaurantKey(restaurant);
          returnMarkerToPool(marker, key);
        }
        markersMapRef.current.delete(id);
      }
    });

    // Add markers that are newly in view
    const toAdd = Array.isArray(inView) ? inView.filter(r => !currentIds.has(parseInt(r.id.toString()))) : [];
    
    // Update markers that need visual updates (selected state, rating changes, etc.)
    const toUpdate = Array.isArray(inView) ? inView.filter(r => {
      if (!currentIds.has(parseInt(r.id.toString()))) { 
        return false; 
      }
      const marker = markersMapRef.current.get(parseInt(r.id.toString()));
      if (!marker) { 
        return false; 
      }
      
      // Check if marker needs update based on restaurant key
      const currentKey = getRestaurantKey(r);
      const markerKey = (marker as any)._restaurantKey;
      return currentKey !== markerKey;
    }) : [];

    // Process additions and updates
          const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    
    // Keep existing markers that don't need updates
    (Array.isArray(inView) ? inView : []).forEach(r => {
      if (!toAdd.some(add => add.id === r.id) && !toUpdate.some(update => update.id === r.id)) {
        const existingMarker = markersMapRef.current.get(parseInt(r.id.toString()));
        if (existingMarker) {
          newMarkers.push(existingMarker);
        }
      }
    });

    // Use performance-optimized batch processing for additions and updates
    const allToProcess = [...toAdd, ...toUpdate];
    if (allToProcess.length > 0) {
      const processBatch = createBatchProcessor(
        allToProcess, (restaurant) => {
                  // Always create fresh markers to avoid content issues
        const marker = createMarker(restaurant, map);
          
          if (marker) {
            // Store the restaurant key for future comparison
            (marker as any)._restaurantKey = getRestaurantKey(restaurant);
            newMarkers.push(marker);
            markersMapRef.current.set(parseInt(restaurant.id.toString()), marker);
          }
        },
        5, // batchSize
        16, // delay (~60fps)
        () => {
          // Completion callback
          markersRef.current = newMarkers;
          currentRenderedIdsRef.current = new Set(Array.isArray(inView) ? inView.map(r => parseInt(r.id.toString())) : []);
          applyClustering(map);
        }
      );

      processBatch();
    } else {
      // No new markers to add/update, just update refs
      markersRef.current = newMarkers;
      currentRenderedIdsRef.current = new Set(Array.isArray(inView) ? inView.map(r => parseInt(r.id.toString())) : []);
      applyClustering(map);
    }
  }, [restaurantsWithCoords, selectedRestaurantId, showRatingBubbles, onRestaurantSelect, cleanupMarkers, createMarker, applyClustering, getRestaurantKey, getPooledMarker, returnMarkerToPool]);

  // Update user location marker when userLocation changes
  useEffect(() => {
    if (!mapInstanceRef.current || !apiLoaded || !userLocation) {
      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }
      return;
    }

    try {
      const map = mapInstanceRef.current;

      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }

      // Remove existing user location marker
      if (userLocationMarkerRef.current) {
        if ('setMap' in userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setMap(null);
        } else if ('map' in userLocationMarkerRef.current) {
          userLocationMarkerRef.current.map = null;
        }
      }

      // Create user location marker using AdvancedMarkerElement if available
      let userMarker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        // Use AdvancedMarkerElement with custom person icon
        const personElement = document.createElement('div');
        personElement.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="22" height="22" rx="11" ry="11" fill="#4285F4" stroke="#1a73e8" stroke-width="1"/>
            <circle cx="12" cy="8" r="3" fill="white"/>
            <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="white"/>
          </svg>
        `;

        userMarker = new window.google.maps.marker.AdvancedMarkerElement({
          position: new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude),
          map,
          content: personElement,
          title: 'YOU'
        });
      } else {
        // Fallback to AdvancedMarkerElement with person icon
        const personElement = document.createElement('div');
        personElement.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="22" height="22" rx="11" ry="11" fill="#4285F4" stroke="#1a73e8" stroke-width="1"/>
            <circle cx="12" cy="8" r="3" fill="white"/>
            <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="white"/>
          </svg>
        `;

        userMarker = new window.google.maps.marker.AdvancedMarkerElement({
          position: new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude),
          map,
          content: personElement,
          title: 'YOU'
        });
      }

      userLocationMarkerRef.current = userMarker;

      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }

            // Add click listener to user location marker - AdvancedMarkerElement uses gmp-click
      (userMarker as any).addListener('gmp-click', () => {
        // Center map on user location with standard zoom
        map.panTo(new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude));
        map.setZoom(10); // Standard 10-mile view

        if (infoWindowRef.current) {
          const content = `
            <div class="p-3 max-w-xs">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 class="font-semibold text-gray-900 text-sm">YOU</h3>
              </div>
              <p class="text-gray-600 text-xs mt-1">
                ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}
              </p>
              ${userLocation.accuracy ? `
                <p class="text-gray-500 text-xs mt-1">
                  Accuracy: ±${Math.round(userLocation.accuracy)} meters
                </p>
              ` : ''}
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, userMarker as any);
        }
      });

    } catch {
      // console.error('Error updating user location marker:', error);
    }

  }, [userLocation, apiLoaded]);

  // Update map center when userLocation changes (for location searches)
  useEffect(() => {
    if (!mapInstanceRef.current || !apiLoaded || !userLocation) {return;}

    try {
      const map = mapInstanceRef.current;
      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }

      // Smoothly pan to the new location
      map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.setZoom(14); // Zoom in to show the area

    } catch {
      // console.error('Error updating map center:', error);
    }
  }, [userLocation, apiLoaded]);

  // Update map center when mapCenter prop changes (for URL parameters)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Development logging
    }

    if (!mapInstanceRef.current || !apiLoaded || !mapCenter) {
      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }
      return;
    }

    try {
      const map = mapInstanceRef.current;
      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }

      // Smoothly pan to the specific restaurant location
      map.panTo(mapCenter);
      map.setZoom(16); // Zoom in close to the specific location

      if (process.env.NODE_ENV === 'development') {
        // Development logging
      }

    } catch {
      // console.error('Error updating map center from URL parameters:', error);
    }
  }, [mapCenter, apiLoaded]);

  // Update markers when restaurants or map bounds change
  useEffect(() => {
    if (!mapInstanceRef.current || !apiLoaded || restaurantsWithCoords.length === 0) {
      return;
    }

    const map = mapInstanceRef.current;
    const bounds = map.getBounds();
    
    if (!bounds) {
      return;
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Filter restaurants that are in the current view
    const inView = restaurantsWithCoords.filter(restaurant => {
      const lat = Number(restaurant.latitude);
      const lng = Number(restaurant.longitude);
      return lat >= sw.lat() && lat <= ne.lat() && lng >= sw.lng() && lng <= ne.lng();
    });

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Map bounds check:', {
        mapBounds: { 
          sw: { lat: sw.lat(), lng: sw.lng() }, 
          ne: { lat: ne.lat(), lng: ne.lng() } 
        },
        mapCenter: (map as any).getCenter() ? { 
          lat: (map as any).getCenter()!.lat(), 
          lng: (map as any).getCenter()!.lng() 
        } : 'unknown',
        zoom: map.getZoom?.() ?? 'unknown',
        totalRestaurants: restaurantsWithCoords.length,
        restaurantsInView: inView.length,
        sampleInView: inView.slice(0, 3).map(r => ({ 
          name: r.name, 
          lat: Number(r.latitude), 
          lng: Number(r.longitude) 
        }))
      });
    }

    // Enhanced bounds change detection with minimum distance threshold
    const zoom = map.getZoom?.() ?? 0;
    
    // More granular bounds checking (3 decimal places for better precision)
    const boundsKey = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)}:${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}:z${zoom}`;
    
    // Add minimum distance threshold to prevent micro-movements from triggering renders
    const lastBounds = lastRenderKeyRef.current;
    if (lastBounds) {
      const lastBoundsParts = lastBounds.split(':');
      const currentBoundsParts = boundsKey.split(':');
      
      // Check if bounds change is significant enough
      const lastCoords = lastBoundsParts[0].split(',');
      const currentCoords = currentBoundsParts[0].split(',');
      
      const latDiff = Math.abs(parseFloat(lastCoords[0]) - parseFloat(currentCoords[0]));
      const lngDiff = Math.abs(parseFloat(lastCoords[1]) - parseFloat(currentCoords[1]));
      
      // Skip render if change is less than 0.001 degrees (roughly 100 meters)
      if (latDiff < 0.001 && lngDiff < 0.001 && lastBoundsParts[2] === currentBoundsParts[2]) {
        return;
      }
    }
    
    const nextKey = `${boundsKey}|count=${inView.length}|b=${showRatingBubbles ? 1 : 0}`;
    
    // Additional check for rapid movements
    if (lastRenderKeyRef.current === nextKey && selectedRestaurantIdRef.current === selectedRestaurantId) {
      return;
    }
    
    lastRenderKeyRef.current = nextKey;

    // Use debounced marker update
    debouncedUpdateMarkers(map, inView);
  }, [restaurantsWithCoords, selectedRestaurantId, showRatingBubbles, onRestaurantSelect, debouncedUpdateMarkers]);

  // Clear info window cache when restaurants change
  useEffect(() => {
    infoWindowCache.current.clear();
  }, [restaurantsWithCoords]);

  // Function to get directions to a restaurant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDirectionsToRestaurant = useCallback((restaurant: Restaurant) => {
    if (!userLocation || !mapInstanceRef.current || !restaurant.latitude || !restaurant.longitude) {
      setNotification({
        type: 'error',
        message: 'Unable to get directions. Please check your location and try again.'
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    // Initialize directions renderer if not already done
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true, // Don't show default markers
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });
    }

    const directionsService = new window.google.maps.DirectionsService();
    const origin = new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude);
    const destination = new window.google.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude));

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      }
    ).then((result) => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result);
        setShowDirections(true);
        setNotification({
          type: 'success',
          message: `Directions to ${restaurant.name} loaded successfully!`
        });
        setTimeout(() => setNotification(null), 3000);
      }
    }).catch(() => {
      setNotification({
        type: 'error',
        message: 'Unable to calculate directions. Please try again.'
      });
      setTimeout(() => setNotification(null), 5000);
    });
  }, [userLocation]);

  // Helper function to get safe image URLs (handle Google Places photo URLs properly)
  const getMapSafeImageUrl = (restaurant: Restaurant) => {
    const isGooglePlacesUrl = restaurant.image_url?.includes('maps.googleapis.com/maps/api/place/photo');
    if (isGooglePlacesUrl) {
      // Replace the API key in the Google Places photo URL with our configured key
      const apiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'];
      if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
        try {
          // Extract the photo reference and other parameters
          const url = new URL(restaurant.image_url!);
          const photoReference = url.searchParams.get('photo_reference');
          const maxWidth = url.searchParams.get('maxwidth') || '400';

          if (photoReference) {
            // Construct a new URL with our API key
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
          }
        } catch {
          // console.error('Error parsing Google Places URL:', error);
        }
      }
      return null; // Fall back to no image if we can't construct a proper URL
    }
    
    // For non-Google Places URLs, use the centralized URL validator that fixes Cloudinary URLs
    return getSafeImageUrl(restaurant.image_url);
  };

  // Sanitize HTML content to prevent XSS
  const sanitizeHtml = (str: string): string => {
    if (!str) {
      return '';
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  // Enhanced info window content creation with caching
  const createInfoWindowContent = useCallback((restaurant: Restaurant, distanceFromUser?: number | null) => {
    const cacheKey: number = parseInt(restaurant.id.toString());
    const now = Date.now();
    
    // Check cache first (TEMPORARILY DISABLED for heart button fix)
    // const cached = infoWindowCache.current.get(cacheKey);
    // if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    //   return cached.content;
    // }
    
    // Generate new content
    const content = _createInfoWindowContent(restaurant, distanceFromUser);
    
    // Cache the content
    infoWindowCache.current.set(cacheKey, {
      content,
      timestamp: now
    });
    
    // Clean up old cache entries
    if (infoWindowCache.current.size > 100) {
      const entries = Array.from(infoWindowCache.current.entries());
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sortedEntries.slice(0, 20); // Remove oldest 20 entries
      toRemove.forEach(([key]) => infoWindowCache.current.delete(key));
    }
    
    return content;
  }, []);

  const _createInfoWindowContent = (restaurant: Restaurant, distanceFromUser?: number | null) => {
    let safeImageUrl = getMapSafeImageUrl(restaurant);
    if (safeImageUrl) {
      safeImageUrl = safeImageUrl.replace(/\/image_1\.(jpg|jpeg|png|webp|avif)$/i, '/image_1');
    }
    
    // Check if restaurant is already a favorite
    const isFavorite = favoritesManager.isFavorite(restaurant.id.toString());

    // Helper functions to match EateryCard logic
    const titleCase = (str: string) => {
      if (!str) {
        return '';
      }
      return str.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    };

    const formatPriceRange = () => {
      if (restaurant.price_range && restaurant.price_range.trim() !== '') {
        if (restaurant.price_range.includes('-')) {
          return `$${restaurant.price_range}`;
        }
        return restaurant.price_range;
      }

      if ((restaurant as any).min_avg_meal_cost && (restaurant as any).max_avg_meal_cost) {
        return `$${(restaurant as any).min_avg_meal_cost}-${(restaurant as any).max_avg_meal_cost}`;
      }

      return 'Price Range: $';
    };

    const getRating = () => {
      const rating = restaurant.rating || (restaurant as any).star_rating || (restaurant as any).google_rating;
      return rating && rating > 0 ? rating : 0.0;
    };

    const getKosherCategoryStyle = () => {
      const category = restaurant.kosher_category?.toLowerCase();
      if (category === 'dairy') {
        return 'bg-white text-[#ADD8E6] font-bold';
      } else if (category === 'meat') {
        return 'bg-white text-[#A70000] font-bold';
      } else if (category === 'pareve') {
        return 'bg-white text-[#FFCE6D] font-bold';
      } else {
        return 'bg-white text-gray-500 font-bold';
      }
    };

    const placeholder = '/images/default-restaurant.webp';
    return `
      <div class="p-4 max-w-sm relative bg-white rounded-xl shadow-lg" data-popup-version="v3" style="position: relative; overflow: visible;">
        <!-- Heart/Favorite Button - FIXED LEFT CORNER -->
        <button onclick="window.toggleMapFavorite && window.toggleMapFavorite('${restaurant.id}', this)"
                class="rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm shadow-sm ${
                  isFavorite 
                    ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                    : 'bg-white/90 hover:bg-white text-gray-600 hover:text-red-500'
                }"
                style="
                  position: absolute !important; 
                  top: 12px !important; 
                  left: 12px !important; 
                  width: 32px !important; 
                  height: 32px !important;
                  z-index: 999 !important;
                  margin: 0 !important;
                  border: none !important;
                  transform: none !important;
                  flex-shrink: 0 !important;
                "
                data-favorite="${isFavorite ? 'true' : 'false'}"
                title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
          <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="${isFavorite ? 'currentColor' : 'none'}">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        
        <!-- Close Button - FIXED RIGHT CORNER -->
        <button onclick="this.parentElement.parentElement.parentElement.close()"
                style="
                  position: absolute !important; 
                  top: 12px !important; 
                  right: 12px !important; 
                  z-index: 999 !important;
                  margin: 0 !important;
                  border: none !important;
                  transform: none !important;
                  background: none !important;
                  width: 24px !important;
                  height: 24px !important;
                  flex-shrink: 0 !important;
                "
                class="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none">
          ×
        </button>

        <!-- Image Container -->
        <div class="relative aspect-[5/4] overflow-hidden rounded-2xl bg-gray-100 mb-3">
          ${safeImageUrl ? `
            <img src="${sanitizeHtml(safeImageUrl)}" alt="${sanitizeHtml(restaurant.name)}"
                 class="w-full h-full object-cover"
                 loading="lazy" />
          ` : `
            <img src="${placeholder}" alt="${sanitizeHtml(restaurant.name)}"
                 class="w-full h-full object-cover"
                 loading="lazy" />
          `}

          <!-- Kosher Category Badge -->
          ${restaurant.kosher_category ? `
            <span class="absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium shadow-sm ${getKosherCategoryStyle()}">
              ${sanitizeHtml(titleCase(restaurant.kosher_category))}
            </span>
          ` : ''}

          <!-- Distance Badge -->
          ${distanceFromUser !== null && distanceFromUser !== undefined ? `
            <span class="absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-medium shadow-sm bg-blue-100 text-blue-800">
              📍 ${distanceFromUser.toFixed(1)} mi
            </span>
          ` : ''}
        </div>

        <!-- Content -->
        <div class="space-y-2">
          <!-- Restaurant Name -->
          <h3 class="font-bold text-gray-900 text-base leading-tight">
            ${sanitizeHtml(titleCase(restaurant.name))}
          </h3>

          <!-- Price Range and Rating -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 font-normal">
              ${formatPriceRange()}
            </span>

            <div class="flex items-center gap-1">
              <svg class="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span class="text-sm font-medium text-gray-800">
                ${getRating().toFixed(1)}
              </span>
            </div>
          </div>

          <!-- Address -->
          ${restaurant.address ? `
            <p class="text-sm text-gray-600">
              ${sanitizeHtml(restaurant.address)}
            </p>
          ` : ''}

          <!-- Certifying Agency -->
          ${restaurant.certifying_agency ? `
            <div class="flex flex-wrap gap-1">
              <span class="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                ${sanitizeHtml(restaurant.certifying_agency)}
              </span>
            </div>
          ` : ''}

          <!-- Kosher Details -->
          ${(restaurant as any).is_cholov_yisroel || (restaurant as any).cholov_stam || (restaurant as any).is_pas_yisroel ? `
            <div class="flex flex-wrap gap-1">
              ${(restaurant as any).is_cholov_yisroel ? `
                <span class="inline-block px-2 py-1 bg-[#FCC0C5]/20 text-[#8a4a4a] text-xs rounded-full border border-[#FCC0C5]">
                  Chalav Yisroel
                </span>
              ` : ''}
              ${(restaurant as any).cholov_stam && !(restaurant as any).is_cholov_yisroel ? `
                <span class="inline-block px-2 py-1 bg-[#FFE4B5]/20 text-[#8B4513] text-xs rounded-full border border-[#FFE4B5]">
                  Chalav Stam
                </span>
              ` : ''}
              ${(restaurant as any).is_pas_yisroel ? `
                <span class="inline-block px-2 py-1 bg-[#74E1A0]/20 text-[#1a4a2a] text-xs rounded-full border border-[#74E1A0]">
                  Pas Yisroel
                </span>
              ` : ''}
            </div>
          ` : ''}

          <!-- Action Button -->
          <div class="pt-2 border-t border-gray-100">
            <a href="/restaurant/${restaurant.id}"
               class="block w-full text-center bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              View Details →
            </a>
          </div>
        </div>
      </div>
    `;
  };

  // Helper function to get kosher category badge classes for template literals
  const _getKosherBadgeClasses = (category: string) => {
    switch (category) {
      case 'meat':
        return 'bg-[#A70000] text-white';
      case 'dairy':
        return 'bg-[#ADD8E6] text-[#1a4a5a]';
      case 'pareve':
        return 'bg-[#FFCE6D] text-[#8a5a1a]';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state
  if (!apiLoaded && !mapError) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jewgo-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interactive map...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (mapError) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Map Error</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
        </div>
      </div>
    );
  }

  // Do not gate map rendering on userLocation or data presence. Show map regardless.

  return (
    <div
      className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
      role="application"
      aria-label="Interactive restaurant map"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full"
        role="img"
        aria-label="Google Maps showing restaurant locations"
      />

      {/* Restaurant Count and Error Handling - Moved to parent component */}

      {/* Color Legend - Mobile Optimized - Positioned in top left corner */}
      <div
        className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2 shadow-lg z-30 max-w-[100px] sm:max-w-[120px] md:max-w-none"
        role="region"
        aria-label="Map legend showing kosher restaurant types"
      >
        <div className="text-xs font-medium text-gray-700 mb-1 sm:mb-2">
          Kosher Types:
        </div>
        {showRatingBubbles ? (
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#A70000]"></div>
              <span className="text-xs text-gray-600">Meat</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#ADD8E6]"></div>
              <span className="text-xs text-gray-600">Dairy</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#FFCE6D]"></div>
              <span className="text-xs text-gray-600">Pareve</span>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#A70000]"></div>
              <span className="text-xs text-gray-600">Meat</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ADD8E6]"></div>
              <span className="text-xs text-gray-600">Dairy</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFCE6D]"></div>
              <span className="text-xs text-gray-600">Pareve</span>
            </div>
          </div>
        )}
      </div>

      {/* Notification System */}
      {notification && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
          }`}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Directions Toggle Button - Positioned below get location button */}
      {userLocation && showDirections && (
        <div className="absolute top-48 right-2 sm:top-52 sm:right-4 z-10">
          <button
            onClick={() => {
              if (directionsRendererRef.current) {
                directionsRendererRef.current.setDirections({ 
                  routes: [],
                  geocoded_waypoints: []
                });
                setShowDirections(false);
              }
            }}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg hover:bg-white transition-colors flex items-center space-x-1 sm:space-x-2 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] touch-manipulation"
            title="Clear directions"
            aria-label="Clear directions"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">
              Clear
            </span>
          </button>
        </div>
      )}

      {/* Center on User Location Button - Mobile Optimized - Positioned at top right corner */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30">
        <button
          onClick={() => {
            if (userLocation && mapInstanceRef.current) {
              // If we have user location, center on it
              mapInstanceRef.current.panTo(new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude));
              mapInstanceRef.current.setZoom(12); // Closer zoom for better location view
            } else {
              // If no location, request it
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    const newLocation = { latitude, longitude, accuracy };

                    // Update the user location state in parent component
                    if (onUserLocationUpdate) {
                      onUserLocationUpdate(newLocation);
                    }

                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo(new window.google.maps.LatLng(latitude, longitude));
                      mapInstanceRef.current.setZoom(12);
                    }

                    // Show success notification
                    setNotification({
                      type: 'success',
                      message: 'Location obtained successfully!'
                    });
                    // Auto-hide notification after 3 seconds
                    setTimeout(() => setNotification(null), 3000);
                  },
                  () => {
                    // console.error('Error getting location:', error);
                    setNotification({
                      type: 'error',
                      message: 'Unable to get your location. Please check your location settings.'
                    });
                    // Auto-hide notification after 5 seconds
                    setTimeout(() => setNotification(null), 5000);
                  }
                );
              } else {
                setNotification({
                  type: 'error',
                  message: 'Geolocation is not supported by this browser.'
                });
                // Auto-hide notification after 5 seconds
                setTimeout(() => setNotification(null), 5000);
              }
            }
          }}
          className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg hover:bg-white transition-colors flex items-center space-x-1 sm:space-x-2 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] touch-manipulation"
          title={userLocation ? "Back to your location" : "Get my location"}
          aria-label={userLocation ? "Center map on your location" : "Get your current location"}
          aria-describedby="location-button-description"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">
            {userLocation ? "My Location" : "Get Location"}
          </span>
        </button>
      </div>
      
      {/* Performance Monitor - Only shown in development */}
      <MapPerformanceMonitor />
    </div>
  );
}
