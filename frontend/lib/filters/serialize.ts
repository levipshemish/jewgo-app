import { Filters } from './filters.types';

export function serializeFilters(input: Record<string, any>): string {
  // Filter out undefined, null, empty strings, and empty arrays
  const entries = Object.entries(input).filter(([, v]) => {
    if (v === undefined || v === null || v === '') {
      return false;
    }
    if (Array.isArray(v) && v.length === 0) {
      return false;
    }
    return true;
  });
  
  // Sort entries by key for stable stringify
  entries.sort(([a], [b]) => a.localeCompare(b));
  
  return JSON.stringify(Object.fromEntries(entries));
}

export function parseFilters(serialized: string): Record<string, any> {
  try {
    return JSON.parse(serialized);
  } catch {
    return {};
  }
}

export function createFilterKey(filters: Filters): string {
  return serializeFilters(filters);
}

export function isFilterEmpty(filters: Filters): boolean {
  return Object.values(filters).every(value => 
    value === undefined || 
    value === null || 
    value === '' || 
    value === false ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function getActiveFilterCount(filters: Filters): number {
  return Object.values(filters).filter(value => 
    value !== undefined && 
    value !== null && 
    value !== '' && 
    value !== false &&
    (!Array.isArray(value) || value.length > 0)
  ).length;
}
