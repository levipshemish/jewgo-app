import { useRef, useCallback } from 'react';

import { Restaurant } from '@/lib/types/restaurant';

// Optional globals for clustering libs when available at runtime
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

interface UseMarkerManagementProps {
  restaurants: Restaurant[];
  selectedRestaurantId?: number;
  userLocation?: UserLocation | null;
  showRatingBubbles: boolean;
  enableClustering: boolean;
  onRestaurantSelect?: (restaurantId: number) => void;
}

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

export function useMarkerManagement({
  restaurants, selectedRestaurantId, userLocation, showRatingBubbles, enableClustering, onRestaurantSelect
}: UseMarkerManagementProps) {
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markersMapRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<any | null>(null);
  
  // Add marker content cache and pool for reuse
  const markerContentCache = useRef<Map<string, { element: HTMLElement; version: string; lastUsed: number }>>(new Map());
  const markerPool = useRef<Map<string, google.maps.marker.AdvancedMarkerElement[]>>(new Map());

  // Enhanced restaurant key generation with content versioning
  const getRestaurantKey = useCallback((restaurant: Restaurant) => {
    const isSelected = selectedRestaurantId === parseInt(restaurant.id);
    const rating = restaurant.quality_rating || restaurant.rating || restaurant.star_rating || restaurant.google_rating || 0;
    
    // Calculate distance hash if user location is available
    let distanceHash = '';
    if (userLocation && restaurant.latitude && restaurant.longitude) {
      const R = 3959; // Earth's radius in miles
      const restaurantLat = Number(restaurant.latitude);
      const restaurantLon = Number(restaurant.longitude);
      const dLat = (restaurantLat - userLocation.latitude) * Math.PI / 180;
      const dLon = (restaurantLon - userLocation.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(restaurantLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      distanceHash = `_${Math.round(distance * 10)}`; // Round to 0.1 miles
    }
    
    // Add content version to key
    const contentVersion = `${restaurant.kosher_category}_${rating}_${isSelected}_${showRatingBubbles ? 1 : 0}`;
    
    return `${restaurant.id}_${restaurant.latitude}_${restaurant.longitude}_${contentVersion}${distanceHash}`;
  }, [selectedRestaurantId, userLocation, showRatingBubbles]);

  // Enhanced marker pooling with content validation
  const getPooledMarker = useCallback((restaurant: Restaurant, map: google.maps.Map) => {
    const key = getRestaurantKey(restaurant);
    const pool = markerPool.current.get(key);
    
    if (pool && pool.length > 0) {
      const marker = pool.pop()!;
      
      // Validate marker content before reuse
      const currentContentVersion = getRestaurantKey(restaurant);
      const markerContentVersion = (marker as any)._contentVersion;
      
      if (currentContentVersion === markerContentVersion) {
        // Content is still valid, reuse marker
        (marker as any).map = map;
        return marker;
      } else {
        // Content has changed, clean up old marker
        (marker as any).map = null;
      }
    }
    
    return null;
  }, [getRestaurantKey]);

  // Enhanced marker return to pool
  const returnMarkerToPool = useCallback((marker: google.maps.marker.AdvancedMarkerElement, key: string) => {
    try {
      // Store content version for validation
      (marker as any)._contentVersion = key;
      
      // Remove from map
      (marker as any).map = null;
      
      // Add to pool
      if (!markerPool.current.has(key)) {
        markerPool.current.set(key, []);
      }
      markerPool.current.get(key)!.push(marker);
      
      // Limit pool size to prevent memory leaks
      const pool = markerPool.current.get(key)!;
      if (pool.length > 10) {
        const oldMarker = pool.shift()!;
        (oldMarker as any).map = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // Enhanced cleanup with pool management
  const cleanupMarkers = useCallback(() => {
    try {
      markersRef.current.forEach(marker => {
        try {
          (marker as any).map = null;
        } catch {
          // Ignore cleanup errors
        }
      });
      markersRef.current = [];
      markersMapRef.current.clear();
      
      // Clean up old pool entries (older than 5 minutes)
      const now = Date.now();
      markerPool.current.forEach((pool, key) => {
        const filteredPool = pool.filter(marker => {
          const lastUsed = (marker as any)._lastUsed || 0;
          return (now - lastUsed) < 5 * 60 * 1000; // 5 minutes
        });
        if (filteredPool.length === 0) {
          markerPool.current.delete(key);
        } else {
          markerPool.current.set(key, filteredPool);
        }
      });
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // Add marker update functionality
  const updateMarkerContent = useCallback((marker: google.maps.marker.AdvancedMarkerElement, restaurant: Restaurant) => {
    try {
      const newContent = createMarkerContent(restaurant);
      if (newContent) {
        (marker as any).content = newContent;
        (marker as any)._contentVersion = getRestaurantKey(restaurant);
        (marker as any)._lastUsed = Date.now();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Failed to update marker content:', error);
      }
    }
  }, [getRestaurantKey]);

  // Separate content creation from marker creation
  const createMarkerContent = useCallback((restaurant: Restaurant) => {
    const isSelected = selectedRestaurantId === parseInt(restaurant.id.toString());
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
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
        transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
        transition: all 0.2s ease-out;
        cursor: pointer;
      `;
      
      // Add hover effects
      element.addEventListener('mouseenter', () => {
        element.style.transform = isSelected ? 'scale(1.15)' : 'scale(1.05)';
        element.style.filter = 'drop-shadow(0 6px 20px rgba(0, 0, 0, 0.25))';
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
        element.style.filter = 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))';
      });
      
      element.innerHTML = `
        <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}">
          <defs>
            <!-- Glass gradient for background -->
            <linearGradient id="glassGradient-${restaurant.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:rgba(255,255,255,0.95);stop-opacity:1" />
              <stop offset="30%" style="stop-color:rgba(255,255,255,0.85);stop-opacity:1" />
              <stop offset="70%" style="stop-color:rgba(255,255,255,0.75);stop-opacity:1" />
              <stop offset="100%" style="stop-color:rgba(255,255,255,0.65);stop-opacity:1" />
            </linearGradient>
            
            <!-- Colored gradient for selected state -->
            <linearGradient id="selectedGradient-${restaurant.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${finalColor};stop-opacity:0.9" />
              <stop offset="100%" style="stop-color:${finalColor};stop-opacity:0.7" />
            </linearGradient>
            
            <!-- Border gradient -->
            <linearGradient id="borderGradient-${restaurant.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${finalColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${finalColor};stop-opacity:0.8" />
            </linearGradient>
          </defs>
          
          <!-- Main background with glass effect -->
          <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}" 
                rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
                fill="${isSelected ? `url(#selectedGradient-${restaurant.id})` : `url(#glassGradient-${restaurant.id})`}" 
                stroke="url(#borderGradient-${restaurant.id})" 
                stroke-width="2"/>
          
          <!-- Glass highlight overlay -->
          <rect x="3" y="3" width="${bubbleWidth - 6}" height="${(bubbleHeight - 6) * 0.4}" 
                rx="${(bubbleHeight - 6) / 4}" ry="${(bubbleHeight - 6) / 4}"
                fill="rgba(255,255,255,0.6)" opacity="0.9"/>
          
          <!-- Inner glow -->
          <rect x="2.5" y="2.5" width="${bubbleWidth - 5}" height="${bubbleHeight - 5}" 
                rx="${(bubbleHeight - 5) / 2}" ry="${(bubbleHeight - 5) / 2}"
                fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.5"/>
          
          <!-- Star icon with glow -->
          <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}" 
                text-anchor="middle" 
                font-family="Arial, sans-serif" 
                font-size="8" 
                fill="#FFD700"
                style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">⭐</text>
          
          <!-- Rating text with shadow -->
          <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}" 
                text-anchor="middle" 
                font-family="Arial, sans-serif" 
                font-size="10" 
                font-weight="bold" 
                fill="${isSelected ? '#FFFFFF' : '#1a1a1a'}"
                style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">
            ${rating.toFixed(1)}
          </text>
        </svg>
      `;
      return element;
    } else {
      // Create glassy pin marker content
      const element = document.createElement('div');
      element.style.cssText = `
        filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.25));
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
      `;
      
      // Add hover effects
      element.addEventListener('mouseenter', () => {
        element.style.transform = isSelected ? 'scale(1.2)' : 'scale(1.1)';
        element.style.filter = 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.35))';
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
        element.style.filter = 'drop-shadow(0 6px 20px rgba(0, 0, 0, 0.25))';
      });
      
      element.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin with colored border -->
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                fill="${isSelected ? finalColor : 'rgba(255, 255, 255, 0.95)'}" 
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

  // Enhanced createMarker function with recycling
  const createMarker = useCallback((restaurant: Restaurant, map: google.maps.Map) => {
    try {
      if (restaurant.latitude === undefined || restaurant.longitude === undefined) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('createMarker: Restaurant missing coordinates:', restaurant.name, restaurant.latitude, restaurant.longitude);
        }
        return null;
      }

      // Try to get a pooled marker first
      let marker = getPooledMarker(restaurant, map);
      
      if (marker) {
        // Update existing marker content if needed
        const currentVersion = getRestaurantKey(restaurant);
        const markerVersion = (marker as any)._contentVersion;
        
        if (currentVersion !== markerVersion) {
          updateMarkerContent(marker, restaurant);
        }
        
        return marker;
      }

      // Create new marker if no pooled marker available
      const position = new window.google.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude));
      const content = createMarkerContent(restaurant);
      
      if (!content) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('createMarker: createMarkerContent returned null for:', restaurant.name);
        }
        return null;
      }

      if (!window.google.maps.marker?.AdvancedMarkerElement) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('createMarker: AdvancedMarkerElement not available, falling back to regular Marker');
        }
        // Fallback to regular marker
        marker = new window.google.maps.Marker({
          position,
          title: restaurant.name,
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#fff" stroke-width="2"/></svg>'),
            scaledSize: new window.google.maps.Size(24, 24)
          }
        }) as any;
      } else {
        marker = new window.google.maps.marker.AdvancedMarkerElement({
          position,
          content,
          title: restaurant.name,
          map
        });
      }

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('createMarker: Successfully created marker for:', restaurant.name, 'at', position.lat(), position.lng());
      }

      // Store metadata
      (marker as any)._contentVersion = getRestaurantKey(restaurant);
      (marker as any)._lastUsed = Date.now();
      (marker as any)._restaurantId = restaurant.id;

      // Add event listeners
      marker.addListener('gmp-click', () => {
        onRestaurantSelect?.(parseInt(restaurant.id.toString()));
      });

      return marker;
    } catch (markerError) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(`Error creating marker for restaurant ${restaurant.name}:`, markerError);
      }
      return null;
    }
  }, [getRestaurantKey, getPooledMarker, updateMarkerContent, createMarkerContent, onRestaurantSelect]);

  // Apply clustering function
  const applyClustering = useCallback((map: google.maps.Map) => {
    if (enableClustering && markersRef.current.length > 10 && window.MarkerClusterer && window.SuperClusterAlgorithm) {
      // Clear existing clusterer
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      
      // Create new clusterer
      clustererRef.current = new window.MarkerClusterer({
        map,
        markers: markersRef.current as unknown as google.maps.Marker[],
        algorithm: new window.SuperClusterAlgorithm({
          radius: 100,
          maxZoom: 15
        }),
        renderer: {
          render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
            const clusterMarker = new window.google.maps.Marker({
              position,
              icon: {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="36" height="36" rx="18" ry="18" fill="#4285F4" stroke="#FFFFFF" stroke-width="2"/>
                    <text x="20" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">${count}</text>
                  </svg>
                `)}`,
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20)
              }
            });
            return clusterMarker;
          }
        }
      });
    } else if (clustererRef.current) {
      // Remove clustering if disabled or not enough markers
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
  }, [enableClustering]);

  return {
    markersRef,
    markersMapRef,
    clustererRef,
    getRestaurantKey,
    cleanupMarkers,
    createMarker,
    applyClustering,
    updateMarkerContent, // Export for external use
    getPooledMarker,     // Export for debugging
    returnMarkerToPool   // Export for debugging
  };
}
