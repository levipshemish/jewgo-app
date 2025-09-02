// Types removed as they were not used in this file

/**
 * Distance field names in order of precedence (highest to lowest)
 */
const DISTANCE_FIELDS = ['distanceMi', 'maxDistanceMi', 'maxDistance', 'radius', 'distanceRadius'] as const;

/**
 * Distance field configuration with units and conversion factors
 */
const DISTANCE_FIELD_CONFIG = {
  distanceMi: { unit: 'miles', conversionToMiles: 1 },
  maxDistanceMi: { unit: 'miles', conversionToMiles: 1 },
  maxDistance: { unit: 'meters', conversionToMiles: 1 / 1609.34 }, // meters to miles
  radius: { unit: 'meters', conversionToMiles: 1 / 1609.34 }, // meters to miles
  distanceRadius: { unit: 'meters', conversionToMiles: 1 / 1609.34 }, // meters to miles
} as const;

/**
 * Error thrown when multiple distance fields are set in a filter object
 */
export class MultipleDistanceFieldsError extends Error {
  constructor(fields: string[]) {
    super(`Multiple distance fields detected: ${fields.join(', ')}. Use only one distance field to avoid ambiguity.`);
    this.name = 'MultipleDistanceFieldsError';
  }
}

/**
 * Validates that only one distance field is set in a filter object
 * @param filters - The filter object to validate
 * @throws MultipleDistanceFieldsError if multiple distance fields are set
 */
export function validateDistanceFields<T extends Record<string, any>>(filters: T): void {
  const setFields = DISTANCE_FIELDS.filter(field => 
    filters[field] !== undefined && filters[field] !== null
  );
  
  if (setFields.length > 1) {
    throw new MultipleDistanceFieldsError(setFields);
  }
}

/**
 * Gets the canonical distance value in miles from a filter object
 * @param filters - The filter object to extract distance from
 * @returns The distance in miles, or undefined if no distance field is set
 */
export function getCanonicalDistanceMi<T extends Record<string, any>>(filters: T): number | undefined {
  // Find the first set distance field in precedence order
  for (const field of DISTANCE_FIELDS) {
    const value = (filters as Record<string, any>)[field];
    if (value !== undefined && value !== null) {
      const config = DISTANCE_FIELD_CONFIG[field];
      return value * config.conversionToMiles;
    }
  }
  return undefined;
}

/**
 * Normalizes a filter object to use the canonical distanceMi field
 * @param filters - The filter object to normalize
 * @returns A new filter object with distanceMi set and other distance fields removed
 */
export function normalizeDistanceFields<T extends Record<string, any>>(filters: T): T & { distanceMi?: number } {
  const canonicalDistance = getCanonicalDistanceMi(filters);
  
  // Create a new object without the legacy distance fields
  const normalized: Record<string, any> = { ...filters };
  
  // Remove all legacy distance fields
  DISTANCE_FIELDS.forEach(field => {
    delete normalized[field as string];
  });
  
  // Set the canonical field if a distance was found
  if (canonicalDistance !== undefined) {
    (normalized as any).distanceMi = canonicalDistance;
  }
  
  return normalized as T & { distanceMi?: number };
}

/**
 * Converts a filter object to use maxDistanceMi for API compatibility
 * @param filters - The filter object to convert
 * @returns A new filter object with maxDistanceMi set and other distance fields removed
 */
export function toApiFormat<T extends Record<string, any>>(filters: T): T & { maxDistanceMi?: number } {
  const canonicalDistance = getCanonicalDistanceMi(filters);
  
  // Create a new object without the legacy distance fields
  const apiFormat: Record<string, any> = { ...filters };
  
  // Remove all legacy distance fields
  DISTANCE_FIELDS.forEach(field => {
    delete apiFormat[field as string];
  });
  
  // Set maxDistanceMi for API compatibility if a distance was found
  if (canonicalDistance !== undefined) {
    (apiFormat as any).maxDistanceMi = canonicalDistance;
  }
  
  return apiFormat as T & { maxDistanceMi?: number };
}

/**
 * Type guard to check if an object has any distance fields set
 */
export function hasDistanceFields(obj: Record<string, any>): boolean {
  return DISTANCE_FIELDS.some(field => (obj as Record<string, any>)[field] !== undefined && (obj as Record<string, any>)[field] !== null);
}

/**
 * Gets the field name and unit of the currently set distance field
 * @param filters - The filter object to check
 * @returns Object with field name and unit, or null if no distance field is set
 */
export function getDistanceFieldInfo<T extends Record<string, any>>(filters: T): { field: string; unit: string } | null {
  for (const field of DISTANCE_FIELDS) {
    const value = (filters as Record<string, any>)[field];
    if (value !== undefined && value !== null) {
      return {
        field,
        unit: DISTANCE_FIELD_CONFIG[field].unit
      };
    }
  }
  return null;
}

/**
 * Runtime guard for filter assembly that validates distance fields
 * @param filters - The filter object to validate
 * @returns Object with success status and error message if validation fails
 */
export function validateFilterDistanceFields<T extends Record<string, any>>(filters: T): { 
  success: boolean; 
  error?: string; 
  canonicalDistance?: number;
} {
  try {
    validateDistanceFields(filters);
    const canonicalDistance = getCanonicalDistanceMi(filters);
    return {
      success: true,
      canonicalDistance
    };
  } catch (error) {
    if (error instanceof MultipleDistanceFieldsError) {
      return {
        success: false,
        error: error.message
      };
    }
    return {
      success: false,
      error: 'Unknown validation error'
    };
  }
}

/**
 * Safe filter assembly that automatically resolves distance field conflicts
 * @param filters - The filter object to process
 * @returns A new filter object with distance fields normalized
 */
export function assembleSafeFilters<T extends Record<string, any>>(filters: T): T & { distanceMi?: number } {
  const validation = validateFilterDistanceFields(filters);
  
  if (!validation.success) {
    console.warn('Distance field validation failed:', validation.error);
    // Return normalized filters to prevent runtime errors
    return normalizeDistanceFields(filters);
  }
  
  // If validation passed, normalize to canonical format
  return normalizeDistanceFields(filters);
}
