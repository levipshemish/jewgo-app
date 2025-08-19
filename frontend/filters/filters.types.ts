export interface Filters {
  q?: string;
  agency?: string;
  dietary?: string;
  category?: string;
  businessTypes?: string[];
  openNow?: boolean;
  nearMe?: boolean;
  maxDistance?: number;
  ratingMin?: number;
  priceRange?: [number, number];
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface FilterState {
  agency?: string;
  dietary?: string;
  openNow?: boolean;
  category?: string;
  businessTypes?: string[];
  nearMe?: boolean;
  maxDistance?: number;
  distanceRadius?: number;
  ratingMin?: number;
  priceRange?: [number, number];
  searchQuery?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export type FilterValue = string | string[] | boolean | number | [number, number] | undefined;

export interface FilterOptions {
  agencies: string[];
  kosherCategories: string[];
  listingTypes: string[];
  businessTypes: string[];
}

export interface AppliedFilters extends Filters {
  // Applied filters are the ones that have been submitted and are actively filtering data
  q?: string;
  agency?: string;
  dietary?: string;
  category?: string;
  businessTypes?: string[];
  openNow?: boolean;
  nearMe?: boolean;
  maxDistance?: number;
  ratingMin?: number;
  priceRange?: [number, number];
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface DraftFilters extends FilterState {
  // Draft filters are the ones being edited but not yet applied
  q?: string;
  agency?: string;
  dietary?: string;
  category?: string;
  businessTypes?: string[];
  openNow?: boolean;
  nearMe?: boolean;
  maxDistance?: number;
  ratingMin?: number;
  priceRange?: [number, number];
}
