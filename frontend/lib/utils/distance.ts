import { Restaurant } from '@/lib/types/restaurant';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RestaurantWithDistance {
  restaurant: Restaurant;
  distance: number;
}

// Legacy functions that maintain backward compatibility
export function calculateDistance(
  lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Sort restaurants by distance from user location
export function sortRestaurantsByDistance(
  restaurants: Restaurant[], userLocation: Location | null): Restaurant[] {
  if (!userLocation) {
    return restaurants;
  }

  const restaurantsWithDistance: RestaurantWithDistance[] = restaurants
    .filter(restaurant => restaurant.latitude && restaurant.longitude)
    .map(restaurant => {
      const lat = restaurant.latitude!;
      const lng = restaurant.longitude!;
      
      // Ensure coordinates are numbers
      const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
      const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
      
      // Check if parsing was successful
      if (isNaN(latNum) || isNaN(lngNum)) {
        return null;
      }
      
      const calculatedDistance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        latNum,
        lngNum
      );

      return {
        restaurant,
        distance: calculatedDistance
      };
    })
    .filter((item): item is RestaurantWithDistance => item !== null)
    .sort((a, b) => a.distance - b.distance);

  // Add formatted distance to each restaurant
  return restaurantsWithDistance.map(item => ({
    ...item.restaurant,
    distance: formatDistance(item.distance)
  }));
}

// Format distance for display (in miles for US market)
export function formatDistance(distance: number): string {
  // Convert km to miles
  const miles = distance * 0.621371;
  
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)}ft`; // Convert to feet
  } else if (miles < 1) {
    return `${Math.round(miles * 10) / 10}mi`; // Show as 0.1, 0.2, etc.
  } else if (miles < 10) {
    return `${miles.toFixed(1)}mi`; // Show as 1.2mi, 2.5mi, etc.
  } else {
    return `${Math.round(miles)}mi`; // Show as 12mi, 25mi, etc.
  }
}

// Calculate distance for a single restaurant
export function getRestaurantDistance(
  restaurant: Restaurant, userLocation: Location | null): number | null {
  if (!userLocation || !restaurant.latitude || !restaurant.longitude) {
    return null;
  }
  
  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    restaurant.latitude,
    restaurant.longitude
  );
}

// Export the hook for components to use
export { useDistanceCalculation } from '@/lib/hooks/useDistanceCalculation'; 