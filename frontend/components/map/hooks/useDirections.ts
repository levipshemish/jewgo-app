import { useRef, useCallback } from 'react';

import { Restaurant } from '@/lib/types/restaurant';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface UseDirectionsProps {
  userLocation?: UserLocation | null;
  onNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function useDirections({ userLocation, onNotification }: UseDirectionsProps) {
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Function to get directions to a restaurant
  const getDirectionsToRestaurant = useCallback((restaurant: Restaurant, map: google.maps.Map | null) => {
    if (!userLocation || !map || !restaurant.latitude || !restaurant.longitude) {
      onNotification('error', 'Unable to get directions. Please check your location and try again.');
      return false;
    }

    // Initialize directions renderer if not already done
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map,
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
        onNotification('success', `Directions to ${restaurant.name} loaded successfully!`);
      }
    }).catch(() => {
      onNotification('error', 'Unable to calculate directions. Please try again.');
    });

    return true;
  }, [userLocation, onNotification]);

  // Function to clear directions
  const clearDirections = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ 
        routes: [],
        geocoded_waypoints: []
      });
    }
  }, []);

  return {
    directionsRendererRef,
    getDirectionsToRestaurant,
    clearDirections
  };
}
