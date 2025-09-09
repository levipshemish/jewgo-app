/**
 * Livemap Types - Canonical Interfaces (FROZEN)
 * 
 * These types define the contract between all livemap components.
 * Changes here require coordination across the entire system.
 */

export type Id = string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  ne: LatLng;
  sw: LatLng;
}

export interface Restaurant {
  id: Id;
  name: string;
  pos: LatLng;
  rating?: number;
  kosher: "MEAT" | "DAIRY" | "PAREVE";
  openNow?: boolean;
  agencies?: string[];
  // minimal, everything else lazy-loaded by details fetcher
}

export interface Filters {
  query?: string;
  kosher?: Array<Restaurant["kosher"]>;
  openNow?: boolean;
  agencies?: string[];
  maxDistanceMi?: number;
  minRating?: number;
}

export interface MapState {
  bounds: Bounds | null;
  center: LatLng | null;
  zoom: number;
}

export type LoadingState = "idle" | "pending" | "success" | "error";

// Performance guardrails (enforced by services)
export const PERFORMANCE_LIMITS = {
  MAX_VISIBLE: 200,
  CLUSTER_WHEN: 60,
  MIN_ZOOM_FOR_OVERLAYS: 12,
  BOUNDS_DEBOUNCE_MS: 250,
  FILTER_DEBOUNCE_MS: 150,
} as const;

// URL sync keys (only these persist in URL)
export const URL_SYNC_KEYS: Array<keyof Filters> = [
  "query",
  "kosher", 
  "agencies",
  "minRating",
  "maxDistanceMi"
] as const;
