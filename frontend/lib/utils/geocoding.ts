/**
 * Geocoding Utilities
 * ===================
 * 
 * Frontend utilities for geocoding addresses and managing shul coordinates
 * Provides functions to call backend geocoding APIs
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 */

// ============================================================================
// Types
// ============================================================================

export interface GeocodeRequest {
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface GeocodeResponse {
  success: boolean;
  data?: {
    latitude: number;
    longitude: number;
    formatted_address: string;
  };
  error?: string;
}

export interface ShulGeocodeResponse {
  success: boolean;
  message?: string;
  data?: {
    shul_id: number;
    latitude: number;
    longitude: number;
  };
  error?: string;
}

export interface BatchGeocodeResponse {
  success: boolean;
  message?: string;
  data?: {
    processed: number;
    successful: number;
    failed: number;
    results: Array<{
      shul_id: number;
      name: string;
      status: 'success' | 'failed';
      latitude?: number;
      longitude?: number;
      error?: string;
    }>;
  };
  error?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Geocode a single address
 */
export async function geocodeAddress(request: GeocodeRequest): Promise<GeocodeResponse> {
  try {
    const response = await fetch('/api/v5/geocoding/geocode-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Geocode a specific shul by ID and update its coordinates
 */
export async function geocodeShul(shulId: number): Promise<ShulGeocodeResponse> {
  try {
    const response = await fetch(`/api/v5/geocoding/geocode-shul/${shulId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Batch geocode multiple shuls
 */
export async function batchGeocodeShuls(options: {
  limit?: number;
  force_update?: boolean;
} = {}): Promise<BatchGeocodeResponse> {
  try {
    const response = await fetch('/api/v5/geocoding/batch-geocode-shuls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract address components from a full address string
 */
export function parseAddress(fullAddress: string): GeocodeRequest {
  // Split by commas and clean up
  const parts = fullAddress.split(',').map(part => part.trim());
  
  if (parts.length >= 3) {
    // Format: "123 Main St, Miami, FL 33101"
    const address = parts[0];
    const city = parts[1];
    const stateZip = parts[2];
    
    // Try to extract state and zip from last part
    const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      return {
        address,
        city,
        state: stateZipMatch[1],
        zip_code: stateZipMatch[2],
        country: 'USA'
      };
    } else {
      return {
        address,
        city,
        state: stateZip,
        country: 'USA'
      };
    }
  } else if (parts.length === 2) {
    // Format: "123 Main St, Miami FL"
    return {
      address: parts[0],
      city: parts[1],
      country: 'USA'
    };
  } else {
    // Single string - treat as address
    return {
      address: fullAddress,
      country: 'USA'
    };
  }
}

/**
 * Validate if coordinates are valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0) // Exclude null island
  );
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Check if a shul needs geocoding
 */
export function needsGeocoding(shul: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  city?: string;
}): boolean {
  // Has address info but missing or invalid coordinates
  const hasAddressInfo = !!(shul.address || shul.city);
  const hasValidCoordinates = shul.latitude && shul.longitude && 
    isValidCoordinates(shul.latitude, shul.longitude);
  
  return hasAddressInfo && !hasValidCoordinates;
}
