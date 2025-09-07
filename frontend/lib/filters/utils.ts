/**
 * Utility functions for filter operations
 */

/**
 * Creates a unique key for filter state based on applied filters
 */
export function createFilterKey(filters: Record<string, any>): string {
  // Remove undefined, null, and empty values
  const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        acc[key] = value;
      } else if (!Array.isArray(value)) {
        acc[key] = value;
      }
    }
    return acc;
  }, {} as Record<string, any>);

  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(cleanFilters).sort();
  const sortedFilters = sortedKeys.reduce((acc, key) => {
    acc[key] = cleanFilters[key];
    return acc;
  }, {} as Record<string, any>);

  return JSON.stringify(sortedFilters);
}

/**
 * Counts the number of active (non-empty) filters
 */
export function getActiveFilterCount(filters: Record<string, any>): number {
  return Object.entries(filters).reduce((count, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return count;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 ? count + 1 : count;
    }
    
    return count + 1;
  }, 0);
}
