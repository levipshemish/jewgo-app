/**
 * Filter Validation Utilities
 * Prevents invalid filter combinations and provides user-friendly error messages
 */

import { AppliedFilters, DraftFilters } from '@/lib/filters/filters.types';

export interface FilterValidationError {
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface FilterValidationResult {
  isValid: boolean;
  errors: FilterValidationError[];
  warnings: FilterValidationError[];
}

/**
 * Validates filter combinations to prevent invalid states
 */
export function validateFilters(
  filters: AppliedFilters | DraftFilters,
  userLocation?: { latitude: number; longitude: number } | null
): FilterValidationResult {
  const errors: FilterValidationError[] = [];
  const warnings: FilterValidationError[] = [];

  // Distance validation
  if (filters.distanceMi || filters.maxDistanceMi || filters.maxDistance || filters.radius) {
    if (!userLocation) {
      errors.push({
        field: 'distance',
        message: 'Location is required to filter by distance',
        severity: 'error'
      });
    } else {
      // Check for multiple distance fields (should be standardized)
      const distanceFields = [
        filters.distanceMi && 'distanceMi',
        filters.maxDistanceMi && 'maxDistanceMi', 
        filters.maxDistance && 'maxDistance',
        filters.radius && 'radius'
      ].filter(Boolean);

      if (distanceFields.length > 1) {
        warnings.push({
          field: 'distance',
          message: 'Multiple distance filters detected. Using the most specific one.',
          severity: 'warning'
        });
      }

      // Validate distance range
      const distance = filters.distanceMi || filters.maxDistanceMi || 
                      (filters.maxDistance ? filters.maxDistance / 1609.34 : undefined) || // Convert meters to miles
                      (filters.radius ? filters.radius / 1609.34 : undefined);

      if (distance && (distance < 0.1 || distance > 100)) {
        errors.push({
          field: 'distance',
          message: 'Distance must be between 0.1 and 100 miles',
          severity: 'error'
        });
      }
    }
  }

  // Price range validation
  if (filters.priceRange) {
    const [min, max] = filters.priceRange;
    if (min < 1 || min > 4 || max < 1 || max > 4) {
      errors.push({
        field: 'priceRange',
        message: 'Price range must be between $ and $$$$',
        severity: 'error'
      });
    }
    if (min > max) {
      errors.push({
        field: 'priceRange',
        message: 'Minimum price cannot be higher than maximum price',
        severity: 'error'
      });
    }
  }

  // Rating validation
  if (filters.ratingMin && (filters.ratingMin < 1 || filters.ratingMin > 5)) {
    errors.push({
      field: 'ratingMin',
      message: 'Rating must be between 1 and 5 stars',
      severity: 'error'
    });
  }

  // Hours filter validation
  if (filters.hoursFilter && !['openNow', 'morning', 'afternoon', 'evening', 'lateNight'].includes(filters.hoursFilter)) {
    errors.push({
      field: 'hoursFilter',
      message: 'Invalid hours filter selected',
      severity: 'error'
    });
  }

  // Search query validation
  if (filters.q && filters.q.trim().length < 2) {
    warnings.push({
      field: 'search',
      message: 'Search query should be at least 2 characters long',
      severity: 'warning'
    });
  }

  // Category and agency validation
  if (filters.category && filters.agency) {
    // This is actually valid, but we could add business logic validation here
    // For example, certain agencies might only certify certain categories
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets the canonical distance value from filters (standardized to miles)
 */
export function getCanonicalDistance(filters: AppliedFilters | DraftFilters): number | undefined {
  // Use precedence: distanceMi > maxDistanceMi > maxDistance (meters) > radius (meters)
  if (filters.distanceMi) return filters.distanceMi;
  if (filters.maxDistanceMi) return filters.maxDistanceMi;
  if (filters.maxDistance) return filters.maxDistance / 1609.34; // Convert meters to miles
  if (filters.radius) return filters.radius / 1609.34; // Convert meters to miles
  return undefined;
}

/**
 * Normalizes filters to use standardized field names
 */
export function normalizeFilters(filters: AppliedFilters | DraftFilters): AppliedFilters {
  const normalized: AppliedFilters = { ...filters };

  // Standardize distance to distanceMi
  const distance = getCanonicalDistance(filters);
  if (distance !== undefined) {
    normalized.distanceMi = distance;
    // Remove legacy distance fields
    delete normalized.maxDistanceMi;
    delete normalized.maxDistance;
    delete normalized.radius;
  }

  // Ensure price range is properly formatted
  if (filters.priceRange && Array.isArray(filters.priceRange)) {
    const [min, max] = filters.priceRange;
    normalized.priceRange = [Math.min(min, max), Math.max(min, max)];
  }

  return normalized;
}

/**
 * Checks if filters have any active values
 */
export function hasActiveFilters(filters: AppliedFilters | DraftFilters): boolean {
  return Object.values(filters).some(value => {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value === true;
    return true;
  });
}

/**
 * Gets a user-friendly description of active filters
 */
export function getFilterDescription(filters: AppliedFilters | DraftFilters): string[] {
  const descriptions: string[] = [];

  if (filters.q) {
    descriptions.push(`Search: "${filters.q}"`);
  }

  if (filters.category) {
    descriptions.push(`Kosher Type: ${filters.category}`);
  }

  if (filters.agency) {
    descriptions.push(`Agency: ${filters.agency}`);
  }

  const distance = getCanonicalDistance(filters);
  if (distance) {
    descriptions.push(`Within ${distance} miles`);
  }

  if (filters.priceRange) {
    const [min, max] = filters.priceRange;
    const priceSymbols = ['$', '$$', '$$$', '$$$$'];
    if (min === max) {
      descriptions.push(`Price: ${priceSymbols[min - 1]}`);
    } else {
      descriptions.push(`Price: ${priceSymbols[min - 1]} - ${priceSymbols[max - 1]}`);
    }
  }

  if (filters.ratingMin) {
    descriptions.push(`Rating: ${filters.ratingMin}+ stars`);
  }

  if (filters.hoursFilter) {
    const hourLabels: Record<string, string> = {
      openNow: 'Open Now',
      morning: 'Morning (6 AM - 12 PM)',
      afternoon: 'Afternoon (12 PM - 6 PM)',
      evening: 'Evening (6 PM - 10 PM)',
      lateNight: 'Late Night (10 PM - 6 AM)'
    };
    descriptions.push(`Hours: ${hourLabels[filters.hoursFilter] || filters.hoursFilter}`);
  }

  return descriptions;
}
