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

export function useMarkerManagement({
  restaurants, selectedRestaurantId, userLocation, showRatingBubbles, enableClustering, onRestaurantSelect
}: UseMarkerManagementProps) {
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markersMapRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<any | null>(null);

  // Helper function to generate a unique key for restaurant changes
  const getRestaurantKey = useCallback((restaurant: Restaurant) => {
    const isSelected = selectedRestaurantId === restaurant.id;
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
    
    return `${restaurant.id}_${restaurant.latitude}_${restaurant.longitude}_${restaurant.kosher_category}_${rating}_${isSelected}${distanceHash}`;
  }, [selectedRestaurantId, userLocation]);

  // Cleanup function to remove markers
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
    } catch {
      // // console.error('Error during marker cleanup:', error);
    }
  }, []);

  // Create marker function
  const createMarker = useCallback((restaurant: Restaurant, map: google.maps.Map) => {
    try {
      if (restaurant.latitude === undefined || restaurant.longitude === undefined) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('useMarkerManagement: Restaurant missing coordinates:', {
            id: restaurant.id,
            name: restaurant.name,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude
          });
        }
        return null;
      }

      const position = new window.google.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude));
      // Remove excessive logging that was called for every marker
      const isSelected = selectedRestaurantId === restaurant.id;

      if (process.env.NODE_ENV === 'development') {
        // console.log('useMarkerManagement: Creating marker for restaurant:', {
        //   id: restaurant.id,
        //   name: restaurant.name,
        //   lat: restaurant.latitude,
        //   lng: restaurant.longitude,
        //   isSelected,
        //   showRatingBubbles
        // });
      }

      // Calculate distance from user if available
      let distanceFromUser: number | null = null;
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
        distanceFromUser = R * c;
      }

      // Get marker color based on kosher category
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

      const markerColor = getMarkerColor(restaurant.kosher_category);
      const finalColor = isSelected ? '#FFD700' : markerColor; // Gold if selected, otherwise category color

      // Get rating for bubble display
      const getRating = (restaurant: Restaurant) => {
        const rating = restaurant.quality_rating || restaurant.rating || restaurant.star_rating || restaurant.google_rating;
        return rating && rating > 0 ? rating : 0.0;
      };

      const rating = getRating(restaurant);

      // Create marker using AdvancedMarkerElement with fallback
      let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
      
      if (showRatingBubbles) {
        // Create rating bubble marker
        const bubbleWidth = isSelected ? 56 : 48;
        const bubbleHeight = isSelected ? 32 : 28;
        
        const kosherColor = getMarkerColor(restaurant.kosher_category);
        const bubbleColor = isSelected ? kosherColor : '#FFFFFF';
        const textColor = isSelected ? '#FFFFFF' : '#000000';
        const borderColor = isSelected ? kosherColor : kosherColor;
        
        if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
          try {
            const element = document.createElement('div');
            element.innerHTML = `
              <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}">
                <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}" 
                      rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
                      fill="${bubbleColor}" stroke="${borderColor}" stroke-width="2"/>
                <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#FFD700">⭐</text>
                <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${textColor}">
                  ${rating.toFixed(1)}
                </text>
              </svg>
            `;
            
            marker = new window.google.maps.marker.AdvancedMarkerElement({
              position,
              content: element,
              title: restaurant.name,
              map
            });
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              // console.log('useMarkerManagement: Failed to create rating bubble marker, falling back:', error);
            }
            // Fallback to simple AdvancedMarkerElement
            const element = document.createElement('div');
            element.innerHTML = `
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                      fill="${finalColor}" 
                      stroke="#000000" 
                      stroke-width="1.5"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
                <circle cx="12" cy="9" r="1.5" fill="${finalColor}"/>
              </svg>
            `;
            
            marker = new window.google.maps.marker.AdvancedMarkerElement({
              position,
              map,
              content: element,
              title: restaurant.name
            });
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            // console.log('useMarkerManagement: AdvancedMarkerElement not available, using fallback');
          }
          // Fallback to simple AdvancedMarkerElement
          const element = document.createElement('div');
          element.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                    fill="${finalColor}" 
                    stroke="#000000" 
                    stroke-width="1.5"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
              <circle cx="12" cy="9" r="1.5" fill="${finalColor}"/>
            </svg>
          `;
          
          marker = new window.google.maps.marker.AdvancedMarkerElement({
            position,
            map,
            content: element,
            title: restaurant.name
          });
        }
      } else {
        // Regular AdvancedMarkerElement without rating bubble
        const element = document.createElement('div');
        element.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                  fill="${finalColor}" 
                  stroke="#000000" 
                  stroke-width="1.5"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
            <circle cx="12" cy="9" r="1.5" fill="${finalColor}"/>
          </svg>
        `;
        
        marker = new window.google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          content: element,
          title: restaurant.name
        });
      }

      // Add click listener to marker - AdvancedMarkerElement uses gmp-click
      marker.addListener('gmp-click', () => {
        onRestaurantSelect?.(restaurant.id);
      });

      // Add hover effects for better interactivity - AdvancedMarkerElement
      marker.addListener('gmp-mouseover', () => {
        // AdvancedMarkerElement doesn't have setZIndex, but we can handle hover effects differently
        // For now, we'll just log or handle hover in a different way
      });

      marker.addListener('gmp-mouseout', () => {
        // Handle mouse out if needed
      });

      if (process.env.NODE_ENV === 'development') {
        // console.log('useMarkerManagement: Successfully created marker for restaurant:', restaurant.name);
      }

      return marker;
    } catch (markerError) {
      if (process.env.NODE_ENV === 'development') {
        // console.error(`useMarkerManagement: Error creating marker for restaurant ${restaurant.name} (ID: ${restaurant.id}):`, markerError);
      }
      return null;
    }
  }, [selectedRestaurantId, userLocation, showRatingBubbles, onRestaurantSelect]);

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
    applyClustering
  };
}
