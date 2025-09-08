/// <reference types="@types/google.maps" />
import { useRef, useCallback, useEffect } from 'react';

import { Restaurant } from '@/lib/types/restaurant';
import { MarkerClusterer } from '@/types/global';

// Helper function to get marker color
const getMarkerColor = (category?: string) => {
  switch (category?.toLowerCase()) {
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

interface MarkerData {
  marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
  restaurant: Restaurant;
  map?: google.maps.Map;
}

interface UseMarkerManagementProps {
  map: google.maps.Map | null;
  restaurants: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  selectedRestaurantId?: number | null;
  showRatingBubbles?: boolean;
}

interface UseMarkerManagementReturn {
  markersMap: Map<string, MarkerData>;
  clusterer: MarkerClusterer | null;
  markersRef: React.MutableRefObject<(google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>;
  markersMapRef: React.MutableRefObject<Map<string, MarkerData>>;
  clustererRef: React.MutableRefObject<MarkerClusterer | null>;
  getRestaurantKey: (restaurant: Restaurant) => string;
  cleanupMarkers: () => void;
  createMarker: (restaurant: Restaurant) => google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
  applyClustering: () => void;
}

export function useMarkerManagement({
  map,
  restaurants,
  onRestaurantSelect,
  selectedRestaurantId,
  showRatingBubbles = false,
}: UseMarkerManagementProps): UseMarkerManagementReturn {
  const markersRef = useRef<(google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>([]);
  const markersMapRef = useRef<Map<string, MarkerData>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  // Get unique key for restaurant
  const getRestaurantKey = useCallback((restaurant: Restaurant): string => {
    return `restaurant-${restaurant.id}`;
  }, []);

  // Create marker content - removed selectedRestaurantId dependency to prevent recreating all markers on selection
  const createMarkerContent = useCallback((restaurant: Restaurant, isSelected = false) => {
    const markerColor = getMarkerColor(restaurant.kosher_category);
    const finalColor = isSelected ? '#FFD700' : markerColor;
    
    // Get rating for bubble display
    const getRating = (restaurantItem: Restaurant) => {
      const rawRating =
        restaurantItem.quality_rating ??
        restaurantItem.rating ??
        restaurantItem.star_rating ??
        restaurantItem.google_rating;
      const ratingNum = typeof rawRating === 'string' ? parseFloat(rawRating) : rawRating;
      return ratingNum && ratingNum > 0 ? ratingNum : 0.0;
    };
    
    const rating = getRating(restaurant);
    // Compute distance text for display in bubble
    const _distanceText = (() => {
      if (restaurant.distance && typeof restaurant.distance === 'string' && restaurant.distance.trim() !== '') {
        return restaurant.distance;
      }
      return restaurant.zip_code || '';
    })();
    
    if (showRatingBubbles) {
      // Create glassy rating bubble content
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
      return element;
    } else {
      // Create pin marker content
      const element = document.createElement('div');
      element.style.cssText = `
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
      `;
      
      // Add hover effects
      element.addEventListener('mouseenter', () => {
        element.style.transform = isSelected ? 'scale(1.2)' : 'scale(1.1)';
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
      });
      
      element.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin with colored border -->
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                fill="${isSelected ? finalColor : 'white'}" 
                stroke="${finalColor}" 
                stroke-width="2"/>
          
          <!-- Center dot -->
          <circle cx="12" cy="9" r="2.5" fill="${finalColor}"/>
          <circle cx="12" cy="9" r="1.5" fill="white"/>
        </svg>
      `;
      return element;
    }
  }, [showRatingBubbles]); // Removed selectedRestaurantId to prevent recreation

  // Clean up markers
  const cleanupMarkers = useCallback(() => {
    // Remove markers from map with proper null checks
    if (markersRef.current && Array.isArray(markersRef.current)) {
      markersRef.current.forEach(marker => {
        if (marker) {
          try {
            if ('map' in marker && marker.map) {
              (marker as any).map = null;
            } else if ('setMap' in marker && typeof (marker as google.maps.Marker).setMap === 'function') {
              (marker as google.maps.Marker).setMap(null);
            }
          } catch (error) {
            // Silently handle cleanup errors to prevent crashes
            console.warn('Marker cleanup error:', error);
          }
        }
      });
    }

    // Clustering disabled: ensure clusterer stays null
    if (clustererRef.current) {
      clustererRef.current = null;
    }

    // Clear refs safely
    if (markersRef.current) {
      markersRef.current = [];
    }
    if (markersMapRef.current) {
      markersMapRef.current.clear();
    }
  }, []);

  // Create marker for restaurant - removed dependencies to prevent recreation
  const createMarker = useCallback((restaurant: Restaurant, isSelected = false): google.maps.marker.AdvancedMarkerElement | google.maps.Marker => {
    // Check if we're on the client side and have Google Maps loaded
    if (typeof window === 'undefined' || !window.google?.maps) {
      throw new Error('Google Maps not loaded');
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      throw new Error(`Restaurant ${restaurant.id} missing coordinates`);
    }

    const position = new google.maps.LatLng(restaurant.latitude, restaurant.longitude);
    
    // Check if map has a valid Map ID for Advanced Markers
    const hasMapId = map && (map as any).mapId;
    
    // Try to use AdvancedMarkerElement (modern API) first, but only if map has Map ID
    if (google.maps.marker?.AdvancedMarkerElement && hasMapId) {
      const content = createMarkerContent(restaurant, isSelected);
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        content,
        title: restaurant.name,
        map: map || undefined,
      });

      // Add click listener
      marker.addListener('click', () => {
        onRestaurantSelect?.(restaurant);
      });

      return marker;
    } else {
      // Fallback to classic Marker API — render rating bubble via SVG icon so ratings show without Map ID

      // Build a small rating bubble as an SVG icon
      const markerColor = getMarkerColor(restaurant.kosher_category);
      const finalColor = isSelected ? '#FFD700' : markerColor;

      // Normalize rating similar to Advanced marker content
      const rawRating =
        (restaurant as any).quality_rating ??
        (restaurant as any).rating ??
        (restaurant as any).star_rating ??
        (restaurant as any).google_rating;
      const ratingNum = typeof rawRating === 'string' ? parseFloat(rawRating) : rawRating;
      const rating = ratingNum && ratingNum > 0 ? Number(ratingNum).toFixed(1) : '0.0';

      // Dimensions for the bubble
      const bubbleWidth = isSelected ? 56 : 48;
      const bubbleHeight = isSelected ? 32 : 28;

      const svg = `
        <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}"
                rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
                fill="${isSelected ? finalColor : 'white'}" stroke="${finalColor}" stroke-width="2" />
          <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}"
                text-anchor="middle" font-family="var(--font-nunito), system-ui, sans-serif" font-size="10" fill="#FFD700">★</text>
          <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}"
                text-anchor="middle" font-family="var(--font-nunito), system-ui, sans-serif" font-size="12" font-weight="bold"
                fill="${isSelected ? 'white' : '#1a1a1a'}">${rating}</text>
        </svg>
      `;

      const marker = new google.maps.Marker({
        position,
        title: restaurant.name,
        map: map || undefined,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(bubbleWidth, bubbleHeight),
          anchor: new google.maps.Point(Math.round(bubbleWidth / 2), Math.round(bubbleHeight / 2))
        },
        zIndex: isSelected ? 1000 : undefined,
      });

      // Add click listener
      marker.addListener('click', () => {
        onRestaurantSelect?.(restaurant);
      });

      return marker;
    }
  }, [map, onRestaurantSelect, createMarkerContent]); // Removed selectedRestaurantId

  // Apply clustering
  const applyClustering = useCallback(() => {
    // Clustering intentionally disabled
    return;
  }, []);

  // Smart marker update - only recreate when restaurant IDs actually change
  const lastRestaurantIdsRef = useRef<string>('');
  
  // Update markers when restaurants change
  useEffect(() => {
    // Check if we're on the client side and have the required dependencies
    if (typeof window === 'undefined' || !map || !window.google?.maps) {
      return;
    }

    // Smart comparison - check if restaurant IDs have actually changed
    const currentIds = restaurants.map(r => r.id).sort().join(',');
    if (currentIds === lastRestaurantIdsRef.current) {
      // IDs haven't changed, no need to recreate markers
      return;
    }
    lastRestaurantIdsRef.current = currentIds;

    // Clean up existing markers
    cleanupMarkers();

    // Create new markers
    const newMarkers: (google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[] = [];
    const newMarkersMap = new Map<string, MarkerData>();

    restaurants.forEach(restaurant => {
      try {
        const isSelected = selectedRestaurantId === restaurant.id;
        const marker = createMarker(restaurant, isSelected);
        newMarkers.push(marker);
        newMarkersMap.set(getRestaurantKey(restaurant), {
          marker,
          restaurant,
          map,
        });
      } catch (_error) {
        // Silently skip markers that can't be created
      }
    });

    // Update refs
    markersRef.current = newMarkers;
    markersMapRef.current = newMarkersMap;

    // Clustering disabled; no-op
    applyClustering();
  }, [map, restaurants, createMarker, getRestaurantKey, cleanupMarkers, applyClustering, selectedRestaurantId]); // Include selectedRestaurantId dependency

  // Handle selected restaurant - update both z-index and visual appearance
  useEffect(() => {
    if (selectedRestaurantId === lastSelectedIdRef.current) {
      return;
    }

    // Reset previous selection
    if (lastSelectedIdRef.current) {
      const prevKey = `restaurant-${lastSelectedIdRef.current}`;
      const prevData = markersMapRef.current.get(prevKey);
      if (prevData?.marker) {
        // Reset z-index
        if ('setZIndex' in prevData.marker) {
          (prevData.marker as any).setZIndex(1);
        }
        // Update visual appearance for Advanced Markers
        if ('content' in prevData.marker) {
          const content = createMarkerContent(prevData.restaurant, false);
          (prevData.marker as any).content = content;
        }
        // Update visual appearance for Classic Markers  
        else if ('setIcon' in prevData.marker) {
          const markerColor = getMarkerColor(prevData.restaurant.kosher_category);
          const rawRating = prevData.restaurant.quality_rating ?? 
            prevData.restaurant.rating ?? 
            prevData.restaurant.star_rating ?? 
            prevData.restaurant.google_rating;
          const ratingNum = typeof rawRating === 'string' ? parseFloat(rawRating) : rawRating;
          const rating = ratingNum && ratingNum > 0 ? Number(ratingNum).toFixed(1) : '0.0';
          
          const bubbleWidth = 48;
          const bubbleHeight = 28;
          const svg = `
            <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}"
                    rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
                    fill="white" stroke="${markerColor}" stroke-width="2" />
              <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}"
                    text-anchor="middle" font-family="var(--font-nunito), system-ui, sans-serif" font-size="10" fill="#FFD700">★</text>
              <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}"
                    text-anchor="middle" font-family="var(--font-nunito), system-ui, sans-serif" font-size="12" font-weight="bold"
                    fill="#1a1a1a">${rating}</text>
            </svg>
          `;
          
          (prevData.marker as google.maps.Marker).setIcon({
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new google.maps.Size(bubbleWidth, bubbleHeight),
            anchor: new google.maps.Point(Math.round(bubbleWidth / 2), Math.round(bubbleHeight / 2))
          });
        }
      }
    }

    // Highlight new selection
    if (selectedRestaurantId) {
      const selectedKey = `restaurant-${selectedRestaurantId}`;
      const data = markersMapRef.current.get(selectedKey);
      if (data?.marker) {
        // Update z-index
        if ('setZIndex' in data.marker) {
          (data.marker as any).setZIndex(1000);
        }
        // Update visual appearance for Advanced Markers
        if ('content' in data.marker) {
          const content = createMarkerContent(data.restaurant, true);
          (data.marker as any).content = content;
        }
        // Update visual appearance for Classic Markers
        else if ('setIcon' in data.marker) {
          const _markerColor = getMarkerColor(data.restaurant.kosher_category);
          const finalColor = '#FFD700'; // Gold for selected
          const rawRating = data.restaurant.quality_rating ?? 
            data.restaurant.rating ?? 
            data.restaurant.star_rating ?? 
            data.restaurant.google_rating;
          const ratingNum = typeof rawRating === 'string' ? parseFloat(rawRating) : rawRating;
          const rating = ratingNum && ratingNum > 0 ? Number(ratingNum).toFixed(1) : '0.0';
          
          const bubbleWidth = 56;
          const bubbleHeight = 32;
          const svg = `
            <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}"
                    rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
                    fill="${finalColor}" stroke="${finalColor}" stroke-width="2" />
              <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}"
                    text-anchor="middle" font-family="var(--font-nunito), system-ui, sans-serif" font-size="10" fill="#FFD700">★</text>
              <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}"
                    text-anchor="middle" font-family="var(--font-nunito), system-ui, sans-serif" font-size="12" font-weight="bold"
                    fill="white">${rating}</text>
            </svg>
          `;
          
          (data.marker as google.maps.Marker).setIcon({
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new google.maps.Size(bubbleWidth, bubbleHeight),
            anchor: new google.maps.Point(Math.round(bubbleWidth / 2), Math.round(bubbleHeight / 2))
          });
        }
      }
    }

    lastSelectedIdRef.current = selectedRestaurantId?.toString() || null;
  }, [selectedRestaurantId, createMarkerContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMarkers();
    };
  }, [cleanupMarkers]);

  return {
    markersMap: markersMapRef.current,
    clusterer: clustererRef.current,
    markersRef,
    markersMapRef,
    clustererRef,
    getRestaurantKey,
    cleanupMarkers,
    createMarker,
    applyClustering,
  };
}
