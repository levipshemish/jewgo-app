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
  selectedRestaurantId?: string | null;
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

  // Create marker content
  const createMarkerContent = useCallback((restaurant: Restaurant) => {
    const isSelected = selectedRestaurantId === restaurant.id;
    const markerColor = getMarkerColor(restaurant.kosher_category);
    const finalColor = isSelected ? '#FFD700' : markerColor;
    
    // Get rating for bubble display
    const getRating = (restaurant: Restaurant) => {
      const rating = restaurant.quality_rating || restaurant.rating || restaurant.star_rating || restaurant.google_rating;
      return rating && rating > 0 ? rating : 0.0;
    };
    
    const rating = getRating(restaurant);
    
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
                font-family="Arial, sans-serif" 
                font-size="8" 
                fill="#FFD700">⭐</text>
          
          <!-- Rating text -->
          <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}" 
                text-anchor="middle" 
                font-family="Arial, sans-serif" 
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
  }, [selectedRestaurantId, showRatingBubbles]);

  // Clean up markers
  const cleanupMarkers = useCallback(() => {
    // Remove markers from map
    markersRef.current.forEach(marker => {
      if ('map' in marker) {
        (marker as any).map = null;
      } else if ('setMap' in marker) {
        (marker as google.maps.Marker).setMap(null);
      }
    });

    // Clear clusterer
    if (clustererRef.current) {
      // Clear markers from clusterer if method exists
      if (typeof clustererRef.current.clearMarkers === 'function') {
        clustererRef.current.clearMarkers();
      }
      clustererRef.current = null;
    }

    // Clear refs
    markersRef.current = [];
    markersMapRef.current.clear();
  }, []);

  // Create marker for restaurant
  const createMarker = useCallback((restaurant: Restaurant): google.maps.marker.AdvancedMarkerElement | google.maps.Marker => {
    if (!restaurant.latitude || !restaurant.longitude) {
      throw new Error(`Restaurant ${restaurant.id} missing coordinates`);
    }

    const position = new google.maps.LatLng(restaurant.latitude, restaurant.longitude);
    
    // Try to use AdvancedMarkerElement (modern API) first
    if (google.maps.marker?.AdvancedMarkerElement) {
      const content = createMarkerContent(restaurant);
      
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
      // Fallback to classic Marker API
      const marker = new google.maps.Marker({
        position,
        title: restaurant.name,
        map: map || undefined,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#fff" stroke-width="2"/></svg>')}`,
          scaledSize: new google.maps.Size(24, 24)
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        onRestaurantSelect?.(restaurant);
      });

      return marker;
    }
  }, [map, onRestaurantSelect, createMarkerContent]);

  // Apply clustering
  const applyClustering = useCallback(() => {
    if (!map || !window.MarkerClusterer || clustererRef.current) {
      return;
    }

    // Create clusterer
    clustererRef.current = new window.MarkerClusterer(map, markersRef.current as any, {
      gridSize: 50,
      maxZoom: 15,
      styles: [
        {
          url: '/images/cluster-1.png',
          height: 35,
          width: 35,
          textColor: '#fff',
          textSize: 12,
        },
        {
          url: '/images/cluster-2.png',
          height: 40,
          width: 40,
          textColor: '#fff',
          textSize: 14,
        },
        {
          url: '/images/cluster-3.png',
          height: 45,
          width: 45,
          textColor: '#fff',
          textSize: 16,
        },
      ],
    });
  }, [map]);

  // Update markers when restaurants change
  useEffect(() => {
    if (!map) return;

    // Clean up existing markers
    cleanupMarkers();

    // Create new markers
    const newMarkers: (google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[] = [];
    const newMarkersMap = new Map<string, MarkerData>();

    restaurants.forEach(restaurant => {
      try {
        const marker = createMarker(restaurant);
        newMarkers.push(marker);
        newMarkersMap.set(getRestaurantKey(restaurant), {
          marker,
          restaurant,
          map,
        });
      } catch (error) {
        console.warn(`Failed to create marker for restaurant ${restaurant.id}:`, error);
      }
    });

    // Update refs
    markersRef.current = newMarkers;
    markersMapRef.current = newMarkersMap;

    // Apply clustering
    applyClustering();
  }, [map, restaurants, createMarker, getRestaurantKey, cleanupMarkers, applyClustering]);

  // Handle selected restaurant
  useEffect(() => {
    if (selectedRestaurantId === lastSelectedIdRef.current) {
      return;
    }

    // Reset previous selection
    if (lastSelectedIdRef.current) {
      const prevData = markersMapRef.current.get(lastSelectedIdRef.current);
      if (prevData?.marker) {
        // Reset marker to default appearance
        if ('setZIndex' in prevData.marker) {
          prevData.marker.setZIndex(1);
        }
      }
    }

    // Highlight new selection
    if (selectedRestaurantId) {
      const data = markersMapRef.current.get(selectedRestaurantId);
      if (data?.marker) {
        // Highlight the selected marker
        if ('setZIndex' in data.marker) {
          data.marker.setZIndex(1000);
        }
      }
    }

    lastSelectedIdRef.current = selectedRestaurantId || null;
  }, [selectedRestaurantId]);

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
