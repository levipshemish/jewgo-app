import { Filters } from './filters.types';

export function replaceUrlQuery(filters: Record<string, any>): void {
  const params = new URLSearchParams();
  
  // Only set defined values, keeping it compact
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
    return;
  }
    
    if (Array.isArray(v)) {
      params.set(k, v.join(','));
    } else if (typeof v === 'object') {
      params.set(k, JSON.stringify(v));
    } else {
      params.set(k, String(v));
    }
  });
  
  const qs = params.toString();
  const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname;
  
  // Use browser history replace to avoid navigation
  window.history.replaceState({}, '', newUrl);
}

export function parseUrlQuery(): Record<string, any> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const params = new URLSearchParams(window.location.search);
  const filters: Record<string, any> = {};
  
  // Use Array.from to avoid iteration issues
  Array.from(params.entries()).forEach(([key, value]) => {
    // Try to parse as JSON first (for arrays/objects)
    try {
      const parsed = JSON.parse(value);
      filters[key] = parsed;
    } catch {
      // If not JSON, check if it's a comma-separated list
      if (value.includes(',')) {
        filters[key] = value.split(',');
      } else {
        // Otherwise treat as string
        filters[key] = value;
      }
    }
  });
  
  return filters;
}

export function syncFiltersToUrl(filters: Filters, enableUrlSync: boolean = true): void {
  if (!enableUrlSync || typeof window === 'undefined') {
    return;
  }
  
  // Remove undefined values before syncing
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined)
  );
  
  replaceUrlQuery(cleanFilters);
}

export function hydrateFiltersFromUrl(): Filters {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const urlFilters = parseUrlQuery();
  
  // Convert string values to appropriate types
  const filters: Filters = {};
  
  Object.entries(urlFilters).forEach(([key, value]) => {
    switch (key) {
      case 'openNow':
      case 'nearMe':
        (filters as any)[key] = value === 'true';
        break;
      case 'maxDistance':
      case 'ratingMin':
      case 'page':
      case 'limit':
      case 'lat':
      case 'lng':
      case 'radius':
        const num = Number(value);
        if (!isNaN(num)) {
          (filters as any)[key] = num;
        }
        break;
      case 'priceRange':
        if (Array.isArray(value) && value.length === 2) {
          filters.priceRange = [Number(value[0]), Number(value[1])];
        }
        break;
      default:
        (filters as any)[key] = value;
    }
  });
  
  return filters;
}
