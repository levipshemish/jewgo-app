/// <reference types="@types/google.maps" />
import { useRef, useCallback } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface UseDistanceCirclesProps {
  userLocation?: UserLocation | null;
  showDistanceCircles: boolean;
}

export function useDistanceCircles({ userLocation, showDistanceCircles }: UseDistanceCirclesProps) {
  const distanceCirclesRef = useRef<google.maps.Circle[]>([]);

  // Function to draw distance circles around user location
  const drawDistanceCircles = useCallback((map: google.maps.Map | null) => {
    if (!userLocation || !map || !showDistanceCircles) {
      return;
    }

    // Clear existing circles
    distanceCirclesRef.current.forEach(circle => {
      circle.setMap(null);
    });
    distanceCirclesRef.current = [];

    // Draw circles at different distances
    const distances = [1, 3, 5, 10]; // miles
    distances.forEach(distance => {
      const circle = new window.google.maps.Circle({
        strokeColor: '#4285F4',
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: '#4285F4',
        fillOpacity: 0.05,
        map,
        center: new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude),
        radius: distance * 1609.34 // Convert miles to meters
      });
      distanceCirclesRef.current.push(circle);
    });
  }, [userLocation, showDistanceCircles]);

  // Function to clear distance circles
  const clearDistanceCircles = useCallback(() => {
    distanceCirclesRef.current.forEach(circle => {
      circle.setMap(null);
    });
    distanceCirclesRef.current = [];
  }, []);

  return {
    distanceCirclesRef,
    drawDistanceCircles,
    clearDistanceCircles
  };
}
