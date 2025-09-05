/**
 * Location Utility Functions
 * 
 * This module provides utility functions for location-based operations
 * that can be used across the entire application.
 */

import { calculateDistance, formatDistance } from './distance';

// Types
export interface UserLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface LocationWithDistance {
  id: string | number;
  latitude?: number;
  longitude?: number;
  distance?: string;
  zip_code?: string;
  [key: string]: any;
}

export interface LocationPermissionStatus {
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

/**
 * Calculate distance between user location and a target location
 */
export function calculateLocationDistance(
  userLocation: UserLocation | null,
  targetLatitude?: number,
  targetLongitude?: number
): string {
  if (!userLocation || targetLatitude === undefined || targetLongitude === undefined) {
    return '';
  }

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLatitude,
    targetLongitude
  );

  return formatDistance(distance);
}

/**
 * Transform a list of items with location data to include distance calculations
 */
export function addDistanceToItems<T extends LocationWithDistance>(
  items: T[],
  userLocation: UserLocation | null
): T[] {
  return items.map(item => ({
    ...item,
    distance: calculateLocationDistance(
      userLocation,
      item.latitude,
      item.longitude
    ) || item.zip_code || ''
  }));
}

/**
 * Sort items by distance from user location
 */
export function sortByDistance<T extends LocationWithDistance>(
  items: T[],
  userLocation: UserLocation | null
): T[] {
  if (!userLocation) {
    return items;
  }

  return items
    .map(item => ({
      ...item,
      distance: calculateLocationDistance(
        userLocation,
        item.latitude,
        item.longitude
      ) || item.zip_code || ''
    }))
    .sort((a, b) => {
      // Items with distance come first
      if (a.distance && !b.distance) return -1;
      if (!a.distance && b.distance) return 1;
      if (!a.distance && !b.distance) return 0;

      // Extract numeric distance for comparison
      const aDistance = extractNumericDistance(a.distance);
      const bDistance = extractNumericDistance(b.distance);

      if (aDistance === null && bDistance === null) return 0;
      if (aDistance === null) return 1;
      if (bDistance === null) return -1;

      return aDistance - bDistance;
    });
}

/**
 * Extract numeric distance from formatted distance string
 * e.g., "2.3mi" -> 2.3, "850ft" -> 0.16
 */
function extractNumericDistance(distanceStr: string): number | null {
  if (!distanceStr) return null;

  const match = distanceStr.match(/(\d+\.?\d*)\s*(mi|ft|km|m)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  // Convert to miles for consistent comparison
  switch (unit) {
    case 'mi':
      return value;
    case 'ft':
      return value / 5280; // feet to miles
    case 'km':
      return value * 0.621371; // km to miles
    case 'm':
      return value * 0.000621371; // meters to miles
    default:
      return value;
  }
}

/**
 * Filter items within a certain distance radius
 */
export function filterByDistance<T extends LocationWithDistance>(
  items: T[],
  userLocation: UserLocation | null,
  maxDistanceMiles: number
): T[] {
  if (!userLocation) {
    return items;
  }

  return items.filter(item => {
    if (item.latitude === undefined || item.longitude === undefined) {
      return false;
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      item.latitude,
      item.longitude
    );

    return distance <= maxDistanceMiles;
  });
}

/**
 * Get location display text for UI components
 */
export function getLocationDisplayText(
  userLocation: UserLocation | null,
  item: LocationWithDistance
): string {
  if (userLocation && item.latitude !== undefined && item.longitude !== undefined) {
    return calculateLocationDistance(userLocation, item.latitude, item.longitude);
  }
  
  return item.zip_code || '';
}

/**
 * Check if location services are supported
 */
export function isLocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Check if permission API is supported
 */
export function isPermissionAPISupported(): boolean {
  return 'permissions' in navigator && 'query' in navigator.permissions;
}

/**
 * Get current location permission status
 */
export async function getLocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!isLocationSupported()) {
    return 'unsupported';
  }

  if (!isPermissionAPISupported()) {
    return 'prompt';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Request current location with timeout
 */
export function requestCurrentLocation(timeoutMs: number = 10000): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!isLocationSupported()) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Location request timed out'));
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now()
        });
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs - 1000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Format location for display in UI
 */
export function formatLocationForDisplay(
  userLocation: UserLocation | null,
  item: LocationWithDistance,
  fallbackText: string = 'Get Location'
): string {
  if (userLocation && item.latitude !== undefined && item.longitude !== undefined) {
    return calculateLocationDistance(userLocation, item.latitude, item.longitude);
  }
  
  return item.zip_code || fallbackText;
}

/**
 * Create location-aware data transformer
 */
export function createLocationTransformer<T extends LocationWithDistance>(
  userLocation: UserLocation | null
) {
  return (item: T): T & { distance: string } => ({
    ...item,
    distance: formatLocationForDisplay(userLocation, item)
  });
}
