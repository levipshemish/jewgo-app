export interface Filters {
  q?: string;
  agency?: string;
  dietary?: string[];
  category?: string;
  businessTypes?: string[];
  openNow?: boolean;
  nearMe?: boolean;
  hoursFilter?: string; // 'openNow', 'morning', 'afternoon', 'evening', 'lateNight'
  
  /**
   * Canonical distance field in miles - preferred over all other distance fields
   * @unit miles
   * @precedence 1 (highest priority)
   */
  distanceMi?: number;
  
  /**
   * Distance filter in miles - backend expects this field
   * @unit miles
   * @precedence 2
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistanceMi?: number;
  
  /**
   * Legacy distance filter in meters
   * @unit meters
   * @precedence 3
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistance?: number;
  
  /**
   * Legacy radius filter in meters
   * @unit meters
   * @precedence 4 (lowest priority)
   * @deprecated Use distanceMi instead for consistency
   */
  radius?: number;
  
  ratingMin?: number;
  priceRange?: [number, number];
  kosherDetails?: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
}

export interface FilterState {
  agency?: string;
  dietary?: string[];  // Changed to match updated schema
  openNow?: boolean;
  category?: string;
  businessTypes?: string[];
  nearMe?: boolean;
  hoursFilter?: string; // 'openNow', 'morning', 'afternoon', 'evening', 'lateNight'
  
  /**
   * Canonical distance field in miles - preferred over all other distance fields
   * @unit miles
   * @precedence 1 (highest priority)
   */
  distanceMi?: number;
  
  /**
   * Distance filter in miles - backend expects this field
   * @unit miles
   * @precedence 2
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistanceMi?: number;
  
  /**
   * Legacy distance filter in meters
   * @unit meters
   * @precedence 3
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistance?: number;
  
  /**
   * Legacy radius filter in meters
   * @unit meters
   * @precedence 4 (lowest priority)
   * @deprecated Use distanceMi instead for consistency
   */
  distanceRadius?: number;
  
  ratingMin?: number;
  priceRange?: [number, number];
  kosherDetails?: string;
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
  priceRanges?: string[];
  cities?: string[];
  states?: string[];
  ratings?: number[];
  kosherDetails?: string[];
}

export interface AppliedFilters extends Filters {
  // Applied filters are the ones that have been submitted and are actively filtering data
  q?: string;
  agency?: string;
  dietary?: string[];
  category?: string;
  businessTypes?: string[];
  openNow?: boolean;
  nearMe?: boolean;
  hoursFilter?: string; // 'openNow', 'morning', 'afternoon', 'evening', 'lateNight'
  
  /**
   * Canonical distance field in miles - preferred over all other distance fields
   * @unit miles
   * @precedence 1 (highest priority)
   */
  distanceMi?: number;
  
  /**
   * Distance filter in miles - backend expects this field
   * @unit miles
   * @precedence 2
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistanceMi?: number;
  
  /**
   * Legacy distance filter in meters
   * @unit meters
   * @precedence 3
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistance?: number;
  
  /**
   * Legacy radius filter in meters
   * @unit meters
   * @precedence 4 (lowest priority)
   * @deprecated Use distanceMi instead for consistency
   */
  radius?: number;
  
  ratingMin?: number;
  priceRange?: [number, number];
  kosherDetails?: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;

  // Shul-specific filters
  denomination?: string;
  shulType?: string;
  hasDailyMinyan?: boolean;
  hasShabbatServices?: boolean;
  hasHolidayServices?: boolean;
  hasWomenSection?: boolean;
  hasMechitza?: boolean;
  hasSeparateEntrance?: boolean;
  hasParking?: boolean;
  hasDisabledAccess?: boolean;
  hasKiddushFacilities?: boolean;
  hasSocialHall?: boolean;
  hasLibrary?: boolean;
  hasHebrewSchool?: boolean;
  hasAdultEducation?: boolean;
  hasYouthPrograms?: boolean;
  hasSeniorPrograms?: boolean;
  acceptsVisitors?: boolean;
  membershipRequired?: boolean;

  // Mikvah-specific filters
  appointment_required?: boolean;
  walk_in_available?: boolean;
  status?: string;
  contact_person?: string;
  is_currently_open?: boolean;
  private_entrance?: boolean;
}

export interface DraftFilters extends FilterState {
  // Draft filters are the ones being edited but not yet applied
  q?: string;
  agency?: string;
  dietary?: string[];
  category?: string;
  businessTypes?: string[];
  openNow?: boolean;
  nearMe?: boolean;
  hoursFilter?: string; // 'openNow', 'morning', 'afternoon', 'evening', 'lateNight'
  
  /**
   * Canonical distance field in miles - preferred over all other distance fields
   * @unit miles
   * @precedence 1 (highest priority)
   */
  distanceMi?: number;
  
  /**
   * Distance filter in miles - backend expects this field
   * @unit miles
   * @precedence 2
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistanceMi?: number;
  
  /**
   * Legacy distance filter in meters
   * @unit meters
   * @precedence 3
   * @deprecated Use distanceMi instead for consistency
   */
  maxDistance?: number;
  
  /**
   * Legacy radius filter in meters
   * @unit meters
   * @precedence 4 (lowest priority)
   * @deprecated Use distanceMi instead for consistency
   */
  radius?: number;
  
  ratingMin?: number;
  priceRange?: [number, number];
  kosherDetails?: string;

  // Shul-specific filters
  denomination?: string;
  shulType?: string;
  hasDailyMinyan?: boolean;
  hasShabbatServices?: boolean;
  hasHolidayServices?: boolean;
  hasWomenSection?: boolean;
  hasMechitza?: boolean;
  hasSeparateEntrance?: boolean;
  hasParking?: boolean;
  hasDisabledAccess?: boolean;
  hasKiddushFacilities?: boolean;
  hasSocialHall?: boolean;
  hasLibrary?: boolean;
  hasHebrewSchool?: boolean;
  hasAdultEducation?: boolean;
  hasYouthPrograms?: boolean;
  hasSeniorPrograms?: boolean;
  acceptsVisitors?: boolean;
  membershipRequired?: boolean;

  // Mikvah-specific filters
  appointment_required?: boolean;
  walk_in_available?: boolean;
  status?: string;
  contact_person?: string;
  is_currently_open?: boolean;
  private_entrance?: boolean;
}
