import { AppliedFilters, DraftFilters } from '@/lib/filters/filters.types';
import { normalizeFilters } from '@/lib/utils/filterValidation';

const MILES_TO_KM = 1.60934;

export const DEFAULT_DISTANCE_RADIUS_KM = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_DISTANCE_RADIUS_KM || '10000'
);

export interface BuildRestaurantParamsOptions {
  searchQuery?: string;
  categoryOverride?: string;
  userLocation?: { latitude: number; longitude: number } | null;
  sort?: string;
  defaultSort?: string;
  fallbackRadiusKm?: number;
  limit?: number;
  page?: number;
  cursor?: string;
  includeFilterOptions?: boolean;
  extraParams?: Record<string, string | number | boolean | undefined>;
}

function appendIfPresent(params: URLSearchParams, key: string, value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === '') return;
  params.set(key, String(value));
}

export function buildRestaurantSearchParams(
  filters: AppliedFilters | DraftFilters | undefined,
  options: BuildRestaurantParamsOptions = {}
): URLSearchParams {
  const normalized = normalizeFilters((filters || {}) as AppliedFilters);
  const params = new URLSearchParams();

  const search = options.searchQuery?.trim() || normalized.q?.trim();
  if (search) {
    params.set('search', search);
  }

  const category = options.categoryOverride ?? normalized.category;
  if (category && category !== 'all') {
    params.set('kosher_category', category);
  }

  if (normalized.agency) {
    params.set('agency', normalized.agency);
  }

  if (normalized.kosherDetails) {
    params.set('kosherDetails', normalized.kosherDetails);
  }

  if (normalized.dietary && normalized.dietary.length > 0) {
    normalized.dietary.forEach((item) => params.append('dietary', item));
  }

  if (normalized.businessTypes && normalized.businessTypes.length > 0) {
    normalized.businessTypes.forEach((item) => params.append('businessTypes', item));
  }

  if (normalized.priceRange && Array.isArray(normalized.priceRange)) {
    const [min, max] = normalized.priceRange;
    if (min) params.set('price_min', String(min));
    if (max) params.set('price_max', String(max));
  }

  if (normalized.ratingMin !== undefined) {
    params.set('ratingMin', String(normalized.ratingMin));
  }

  if (normalized.hoursFilter) {
    params.set('hoursFilter', normalized.hoursFilter);
  }

  if (normalized.openNow) {
    params.set('openNow', 'true');
  }

  const location = options.userLocation;
  const canonicalDistance = typeof normalized.distanceMi === 'number' ? normalized.distanceMi : undefined;
  const normalizedSort = (normalized as { sort?: string }).sort;

  if (location) {
    params.set('latitude', location.latitude.toString());
    params.set('longitude', location.longitude.toString());

    const sort = options.sort || normalizedSort || 'distance_asc';
    if (sort) {
      params.set('sort', sort);
    }

    if (canonicalDistance !== undefined) {
      params.set('radius', (canonicalDistance * MILES_TO_KM).toString());
    } else if (options.fallbackRadiusKm !== undefined) {
      params.set('radius', options.fallbackRadiusKm.toString());
    }
  } else {
    const sort = options.sort || normalizedSort || options.defaultSort || 'created_at_desc';
    if (sort) {
      params.set('sort', sort);
    }
  }

  if (options.limit !== undefined) {
    params.set('limit', String(options.limit));
  }

  if (options.page !== undefined) {
    params.set('page', String(options.page));
  }

  if (options.cursor) {
    params.set('cursor', options.cursor);
  }

  if (options.includeFilterOptions !== undefined) {
    params.set('include_filter_options', String(options.includeFilterOptions));
  }

  if (options.extraParams) {
    Object.entries(options.extraParams).forEach(([key, value]) => appendIfPresent(params, key, value));
  }

  return params;
}
