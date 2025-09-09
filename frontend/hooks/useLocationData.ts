/**
 * useLocationData Hook
 * 
 * A reusable hook that provides location functionality for any page.
 * This hook integrates with the LocationContext and provides utilities
 * for location-based operations.
 */

import { useMemo } from 'react';
import { useLocation } from '@/lib/contexts/LocationContext';
import {
  addDistanceToItems,
  sortByDistance,
  filterByDistance,
  formatLocationForDisplay,
  type UserLocation,
  type LocationWithDistance
} from '@/lib/utils/location';

export interface UseLocationDataOptions {
  /** Whether to automatically sort items by distance */
  sortByDistance?: boolean;
  /** Maximum distance in miles to filter items (optional) */
  maxDistanceMiles?: number;
  /** Fallback text when no location is available */
  fallbackText?: string;
}

export interface UseLocationDataReturn<T extends LocationWithDistance> {
  /** Current user location */
  userLocation: UserLocation | null;
  /** Location permission status */
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unsupported';
  /** Whether location is currently being requested */
  isLoading: boolean;
  /** Any location-related error */
  error: string | null;
  /** Whether popup has been shown */
  hasShownPopup: boolean;
  /** Function to request location permission */
  requestLocation: () => void;
  /** Check if popup should be shown */
  shouldShowPopup: (forceShow?: boolean) => boolean;
  /** Mark popup as shown */
  markPopupShown: () => void;
  /** Transform items to include distance calculations */
  transformItems: (items: T[]) => T[];
  /** Sort items by distance from user location */
  sortItems: (items: T[]) => T[];
  /** Filter items within distance radius */
  filterItems: (items: T[], maxDistanceMiles: number) => T[];
  /** Get display text for a single item */
  getItemDisplayText: (item: T) => string;
  /** Create a transformer function for items */
  createTransformer: () => (item: T) => T & { distance: string };
}

/**
 * Hook for location-based data operations
 * 
 * @param options Configuration options for location operations
 * @returns Location utilities and transformed data functions
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   const {
 *     userLocation,
 *     permissionStatus,
 *     isLoading,
 *     requestLocation,
 *     transformItems,
 *     sortItems
 *   } = useLocationData({
 *     sortByDistance: true,
 *     maxDistanceMiles: 10,
 *     fallbackText: 'Distance unavailable'
 *   });
 * 
 *   const restaurants = useMemo(() => {
 *     return sortItems(transformItems(rawRestaurants));
 *   }, [rawRestaurants, sortItems, transformItems]);
 * 
 *   return (
 *     <div>
 *       {restaurants.map(restaurant => (
 *         <Card key={restaurant.id} distance={restaurant.distance} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLocationData<T extends LocationWithDistance>(
  options: UseLocationDataOptions = {}
): UseLocationDataReturn<T> {
  const {
    sortByDistance: shouldSortByDistance = false,
    maxDistanceMiles: _maxDistanceMiles,
    fallbackText = 'Get Location'
  } = options;

  const {
    userLocation,
    permissionStatus,
    isLoading,
    error,
    hasShownPopup,
    requestLocation,
    shouldShowPopup,
    markPopupShown
  } = useLocation();

  // Transform items to include distance calculations
  const transformItems = useMemo(() => {
    return (items: T[]): T[] => {
      return addDistanceToItems(items, userLocation);
    };
  }, [userLocation]);

  // Sort items by distance
  const sortItems = useMemo(() => {
    return (items: T[]): T[] => {
      if (!shouldSortByDistance) return items;
      return sortByDistance(items, userLocation);
    };
  }, [userLocation, shouldSortByDistance]);

  // Filter items by distance
  const filterItems = useMemo(() => {
    return (items: T[], maxDistance: number): T[] => {
      return filterByDistance(items, userLocation, maxDistance);
    };
  }, [userLocation]);

  // Get display text for a single item
  const getItemDisplayText = useMemo(() => {
    return (item: T): string => {
      return formatLocationForDisplay(userLocation, item, fallbackText);
    };
  }, [userLocation, fallbackText]);

  // Create transformer function
  const createTransformer = useMemo(() => {
    return () => (item: T) => {
      const locationItem = item as LocationWithDistance;
      return {
        ...item,
        distance: formatLocationForDisplay(userLocation, locationItem, fallbackText)
      } as T & { distance: string };
    };
  }, [userLocation, fallbackText]);

  return {
    userLocation,
    permissionStatus,
    isLoading,
    error,
    hasShownPopup,
    requestLocation,
    shouldShowPopup,
    markPopupShown,
    transformItems,
    sortItems,
    filterItems,
    getItemDisplayText,
    createTransformer
  };
}

/**
 * Simplified hook for basic location display
 * 
 * @param fallbackText Text to show when location is not available
 * @returns Basic location utilities
 * 
 * @example
 * ```tsx
 * function SimpleCard({ restaurant }) {
 *   const { getItemDisplayText } = useLocationDisplay('Distance unavailable');
 *   
 *   return (
 *     <div>
 *       <h3>{restaurant.name}</h3>
 *       <p>{getItemDisplayText(restaurant)}</p>
 *     </div>
   );
 * }
 * ```
 */
export function useLocationDisplay(fallbackText: string = 'Get Location') {
  const { 
    userLocation, 
    permissionStatus, 
    isLoading, 
    error, 
    hasShownPopup,
    requestLocation,
    shouldShowPopup,
    markPopupShown
  } = useLocation();

  const getItemDisplayText = useMemo(() => {
    return (item: LocationWithDistance): string => {
      return formatLocationForDisplay(userLocation, item, fallbackText);
    };
  }, [userLocation, fallbackText]);

  return {
    userLocation,
    permissionStatus,
    isLoading,
    error,
    hasShownPopup,
    requestLocation,
    shouldShowPopup,
    markPopupShown,
    getItemDisplayText
  };
}
