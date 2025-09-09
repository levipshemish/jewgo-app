/**
 * GoogleMap Adapter - Thin Wrapper Around Google Maps
 * 
 * This is a pure renderer that receives props and renders markers.
 * NO business state ownership - just a thin adapter to Google Maps API.
 */

'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { loadMaps } from '@/lib/maps/loader';
import type { Restaurant, LatLng, Bounds } from '@/types/livemap';

interface GoogleMapProps {
  center: LatLng | null;
  zoom: number;
  restaurants: Restaurant[];
  selectedId: string | null;
  userLocation?: LatLng | null;
  
  // Event handlers
  onBoundsChange?: (bounds: Bounds) => void;
  onSelect?: (restaurantId: string | null) => void;
  onMapReady?: () => void;
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
}

interface MarkerData {
  marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
  restaurant: Restaurant;
}

export default function GoogleMap({
  center,
  zoom,
  restaurants,
  selectedId,
  userLocation,
  onBoundsChange,
  onSelect,
  onMapReady,
  className = '',
  style,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        await loadMaps();
        
        if (!isMounted || !mapRef.current) {
          return;
        }

        // Don't create a new map if one already exists
        if (mapInstanceRef.current) {
          return;
        }

        // Get Map ID from environment (required for Advanced Markers)
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
        
        const mapConfig: google.maps.MapOptions = {
          center: center || { lat: 25.7617, lng: -80.1918 }, // Miami default
          zoom: zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: true,
          gestureHandling: 'cooperative',
        };
        
        // Add Map ID if available (required for Advanced Markers)
        if (mapId && mapId.trim() !== '' && mapId !== 'undefined') {
          mapConfig.mapId = mapId.trim();
        }
        
        const map = new google.maps.Map(mapRef.current, mapConfig);

        if (!isMounted) {
          return;
        }

        mapInstanceRef.current = map;

        // Set up bounds change listener
        if (onBoundsChange) {
          map.addListener('bounds_changed', () => {
            const bounds = map.getBounds();
            if (bounds) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              onBoundsChange({
                ne: { lat: ne.lat(), lng: ne.lng() },
                sw: { lat: sw.lat(), lng: sw.lng() },
              });
            }
          });
        }


        // Notify that map is ready
        onMapReady?.();

      } catch (error) {
        console.error('Failed to initialize Google Map:', error);
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      // Cleanup will be handled by the cleanup effect
    };
  }, [center, zoom, onBoundsChange, onMapReady]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // Helper function to get marker color (matching original)
  const getMarkerColor = (kosher: string) => {
    switch (kosher?.toLowerCase()) {
      case 'meat':
        return '#A70000'; // JewGo Dark Red for meat
      case 'dairy':
        return '#ADD8E6'; // JewGo Light Blue for dairy
      case 'pareve':
        return '#FFCE6D'; // JewGo Yellow for pareve
      default:
        return '#BBBBBB'; // JewGo Gray for unknown
    }
  };

  // Create marker for restaurant (matching original design)
  const createMarker = useCallback((restaurant: Restaurant, isSelected: boolean) => {
    if (!mapInstanceRef.current) return null;

    const position = new google.maps.LatLng(restaurant.pos.lat, restaurant.pos.lng);
    const markerColor = getMarkerColor(restaurant.kosher);
    const finalColor = isSelected ? '#FFD700' : markerColor;
    
    // Get rating for bubble display
    const rating = restaurant.rating && restaurant.rating > 0 ? restaurant.rating : 0.0;
    
    // Create glassy rating bubble content (matching original)
    const bubbleWidth = isSelected ? 56 : 48;
    const bubbleHeight = isSelected ? 32 : 28;
    
    const element = document.createElement('div');
    element.style.cssText = `
      transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
      transition: all 0.2s ease-out;
      cursor: pointer;
    `;
    
    // Add hover effects
    element.addEventListener('mouseenter', () => {
      element.style.transform = isSelected ? 'scale(1.15)' : 'scale(1.05)';
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
    });
    
    element.innerHTML = `
      <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}">
        <!-- Rating bubble with colored border -->
        <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}" 
              rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
              fill="${isSelected ? finalColor : 'white'}" 
              stroke="${finalColor}" 
              stroke-width="2"/>
        
        <!-- Star icon -->
        <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}" 
              text-anchor="middle" 
              font-family="var(--font-nunito), system-ui, sans-serif" 
              font-size="8" 
              fill="#FFD700">⭐</text>
        
        <!-- Rating text -->
        <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}" 
              text-anchor="middle" 
              font-family="var(--font-nunito), system-ui, sans-serif" 
              font-size="10" 
              font-weight="bold" 
              fill="${isSelected ? 'white' : '#1a1a1a'}">
          ${rating.toFixed(1)}
        </text>
      </svg>
    `;

    // Try to create AdvancedMarkerElement, fall back to classic marker if not available
    let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
    
    try {
      // Check if AdvancedMarkerElement is available (requires Map ID)
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          position,
          content: element,
          title: restaurant.name,
          map: mapInstanceRef.current,
        });
      } else {
        throw new Error('AdvancedMarkerElement not available');
      }
    } catch (error) {
      // Fallback to classic marker with SVG icon
      console.warn('AdvancedMarkerElement not available, falling back to classic marker:', error);
      
      // Create SVG icon for classic marker
      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}" 
                  rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
                  fill="${isSelected ? finalColor : 'white'}" 
                  stroke="${finalColor}" 
                  stroke-width="2"/>
            <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}" 
                  text-anchor="middle" 
                  font-family="system-ui, sans-serif" 
                  font-size="8" 
                  fill="#FFD700">⭐</text>
            <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}" 
                  text-anchor="middle" 
                  font-family="system-ui, sans-serif" 
                  font-size="10" 
                  font-weight="bold" 
                  fill="${isSelected ? 'white' : '#1a1a1a'}">
              ${rating.toFixed(1)}
            </text>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(bubbleWidth, bubbleHeight),
        anchor: new google.maps.Point(bubbleWidth / 2, bubbleHeight / 2),
      };
      
      marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: restaurant.name,
        icon: svgIcon,
        zIndex: isSelected ? 1000 : 100,
      });
    }

    // Add click listener (no InfoWindow - just selection like original)
    marker.addListener('click', () => {
      onSelect?.(restaurant.id);
    });

    return marker;
  }, [onSelect]);

  // Update markers when restaurants change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => {
      if ('setMap' in marker) {
        marker.setMap(null);
      } else {
        // For AdvancedMarkerElement, remove from map by setting map to null
        (marker as google.maps.marker.AdvancedMarkerElement).map = null;
      }
    });
    markersRef.current.clear();

    // Create new markers
    restaurants.forEach(restaurant => {
      const isSelected = selectedId === restaurant.id;
      const marker = createMarker(restaurant, isSelected);
      
      if (marker) {
        markersRef.current.set(restaurant.id, {
          marker,
          restaurant,
        });
      }
    });

  }, [restaurants, selectedId, createMarker]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
    }

    if (userLocation) {
      userLocationMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        zIndex: 1000,
      });
    }
  }, [userLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
          // Clean up markers
          markersRef.current.forEach(({ marker }) => {
            if ('setMap' in marker) {
              (marker as google.maps.Marker).setMap(null);
            } else if ('map' in marker) {
              (marker as any).map = null;
            }
          });
      markersRef.current.clear();

      // Clean up user location marker
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
      }


      // Clean up map
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full ${className}`}
      style={style}
    />
  );
}
