export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationWithLatLng {
  lat: number;
  lng: number;
}

export interface LocationWithLatitudeLongitude {
  latitude: number;
  longitude: number;
}

export type AnyLocation = Location | LocationWithLatLng | LocationWithLatitudeLongitude;

/**
 * Centralized distance calculation hook that consolidates all duplicate logic
 * Supports multiple location formats and provides consistent distance calculations
 */
export function useDistanceCalculation() {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 - First latitude
   * @param lon1 - First longitude  
   * @param lat2 - Second latitude
   * @param lon2 - Second longitude
   * @param unit - 'miles' (default) or 'kilometers'
   * @returns Distance in the specified unit
   */
  const calculateDistance = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number, 
    unit: 'miles' | 'kilometers' = 'miles'
  ): number => {
    const R = unit === 'miles' ? 3959 : 6371; // Earth's radius in miles or kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /**
   * Calculate distance between two location objects
   * Automatically detects location format and extracts coordinates
   */
  const calculateDistanceBetween = (
    location1: AnyLocation,
    location2: AnyLocation,
    unit: 'miles' | 'kilometers' = 'miles'
  ): number => {
    const getCoords = (loc: AnyLocation): { lat: number; lng: number } => {
      if ('lat' in loc && 'lng' in loc) {
        return { lat: loc.lat, lng: loc.lng };
      } else if ('latitude' in loc && 'longitude' in loc) {
        return { lat: loc.latitude, lng: loc.longitude };
      }
      throw new Error('Invalid location format');
    };

    const coords1 = getCoords(location1);
    const coords2 = getCoords(location2);
    
    return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng, unit);
  };

  /**
   * Format distance for display with consistent formatting
   * @param distance - Distance in miles
   * @returns Formatted distance string
   */
  const formatDistance = (distance: number, unit: 'miles' | 'kilometers' = 'miles'): string => {
    if (unit === 'kilometers') {
      if (distance < 1) {
        return `${Math.round(distance * 1000)}m`;
      } else if (distance < 10) {
        return `${distance.toFixed(1)}km`;
      } else {
        return `${Math.round(distance)}km`;
      }
    } else {
      // Miles formatting (US market)
      if (distance < 0.1) {
        return `${Math.round(distance * 5280)}ft`;
      } else if (distance < 1) {
        return `${distance.toFixed(1)}mi`;
      } else if (distance < 10) {
        return `${distance.toFixed(1)}mi`;
      } else {
        return `${Math.round(distance)}mi`;
      }
    }
  };

  /**
   * Sort locations by distance from a reference point
   */
  const sortByDistance = <T extends AnyLocation>(
    items: T[],
    referenceLocation: AnyLocation,
    getLocation: (item: T) => AnyLocation,
    unit: 'miles' | 'kilometers' = 'miles'
  ): T[] => {
    return [...items].sort((a, b) => {
      const distanceA = calculateDistanceBetween(referenceLocation, getLocation(a), unit);
      const distanceB = calculateDistanceBetween(referenceLocation, getLocation(b), unit);
      return distanceA - distanceB;
    });
  };

  /**
   * Get distance with formatting in one call
   */
  const getFormattedDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    unit: 'miles' | 'kilometers' = 'miles'
  ): string => {
    const distance = calculateDistance(lat1, lon1, lat2, lon2, unit);
    return formatDistance(distance, unit);
  };

  return {
    calculateDistance,
    calculateDistanceBetween,
    formatDistance,
    sortByDistance,
    getFormattedDistance,
  };
}
