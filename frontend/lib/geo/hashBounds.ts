/**
 * Bounds Hashing Utility
 * 
 * Creates consistent cache keys from map bounds.
 */

import type { Bounds } from "@/types/livemap";

export function hashBounds(bounds: Bounds): string {
  const { ne, sw } = bounds;
  
  // Round to 4 decimal places for consistent hashing
  const neLat = Math.round(ne.lat * 10000) / 10000;
  const neLng = Math.round(ne.lng * 10000) / 10000;
  const swLat = Math.round(sw.lat * 10000) / 10000;
  const swLng = Math.round(sw.lng * 10000) / 10000;
  
  return `${neLat},${neLng}-${swLat},${swLng}`;
}
