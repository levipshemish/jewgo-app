/**
 * Filter System Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the filter system for restaurants, synagogues, and mikvahs.
 */

// Base filter interface
export interface BaseFilters {
  // Location filters
  latitude?: number;
  longitude?: number;
  radius?: number;
  distanceMi?: number;
  
  // Common filters
  city?: string;
  state?: string;
  ratingMin?: number;
  sort?: string;
}

// Restaurant-specific filters
export interface RestaurantFilters extends BaseFilters {
  // Kosher filters
  kosher_category?: 'Meat' | 'Dairy' | 'Pareve';
  agency?: string;
  kosherDetails?: string;
  
  // Business filters
  priceRange?: [number, number];
  hoursFilter?: 'openNow' | 'morning' | 'afternoon' | 'evening' | 'lateNight';
  
  // Listing filters
  listingType?: string;
}

// Synagogue-specific filters
export interface SynagogueFilters extends BaseFilters {
  // Religious filters
  denomination?: 'orthodox' | 'conservative' | 'reform' | 'reconstructionist';
  shulType?: 'traditional' | 'chabad' | 'orthodox' | 'sephardic';
  shulCategory?: 'ashkenazi' | 'chabad' | 'sephardic';
  
  // Service filters
  has_daily_minyan?: boolean;
  has_shabbat_services?: boolean;
  has_holiday_services?: boolean;
  
  // Facility filters
  has_parking?: boolean;
  has_kiddush_facilities?: boolean;
  has_social_hall?: boolean;
  has_library?: boolean;
  has_hebrew_school?: boolean;
  has_disabled_access?: boolean;
}

// Mikvah-specific filters
export interface MikvahFilters extends BaseFilters {
  // Appointment filters
  appointment_required?: boolean;
  walk_in_available?: boolean;
  
  // Status filters
  status?: 'active' | 'inactive' | 'pending';
  
  // Contact filters
  contact_person?: string;
  
  // Facility filters
  is_currently_open?: boolean;
  private_entrance?: boolean;
}

// Union type for all filter types
export type AppliedFilters = RestaurantFilters | SynagogueFilters | MikvahFilters;

// Filter options interfaces
export interface BaseFilterOptions {
  cities: string[];
  states: string[];
  ratings: number[];
}

export interface RestaurantFilterOptions extends BaseFilterOptions {
  agencies?: string[];
  kosherCategories?: string[];
  kosherDetails?: string[];
  listingTypes?: string[];
  priceRanges?: string[];
  hoursOptions?: string[];
}

export interface SynagogueFilterOptions extends BaseFilterOptions {
  denominations?: string[];
  shulTypes?: string[];
  shulCategories?: string[];
  accessibility?: string[];
  services?: string[];
  facilities?: string[];
}

export interface MikvahFilterOptions extends BaseFilterOptions {
  appointmentRequired?: string[];
  statuses?: string[];
  contactPersons?: string[];
  facilities?: string[];
  accessibility?: string[];
  appointmentTypes?: string[];
}

// Union type for all filter options
export type FilterOptions = RestaurantFilterOptions | SynagogueFilterOptions | MikvahFilterOptions;

// Filter counts for preview
export interface FilterCounts {
  cities: Record<string, number>;
  states: Record<string, number>;
  agencies?: Record<string, number>;
  listingTypes?: Record<string, number>;
  priceRanges?: Record<string, number>;
  kosherCategories?: Record<string, number>;
  denominations?: Record<string, number>;
  shulTypes?: Record<string, number>;
  shulCategories?: Record<string, number>;
  appointmentRequired?: Record<string, number>;
  statuses?: Record<string, number>;
  contactPersons?: Record<string, number>;
  total: number;
}

// Entity types
export type EntityType = 'restaurants' | 'synagogues' | 'mikvahs';

// Filter validation result
export interface FilterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Filter state for local management
export interface FilterState {
  draftFilters: AppliedFilters;
  activeFilters: AppliedFilters;
  filterOptions: FilterOptions | null;
  loading: boolean;
  error: string | null;
}

// Filter component props
export interface FilterComponentProps {
  entityType: EntityType;
  initialFilters: AppliedFilters;
  onFiltersChange: (filters: AppliedFilters) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  locationLoading?: boolean;
  onRequestLocation?: () => void;
}

// Filter modal props
export interface FilterModalProps extends FilterComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  preloadedFilterOptions?: FilterOptions | null;
}

// Filter preview props
export interface FilterPreviewProps {
  filters: AppliedFilters;
  userLocation?: { latitude: number; longitude: number } | null;
  entityType: EntityType;
  onPreviewUpdate?: (count: number) => void;
}

// Active filter chips props
export interface ActiveFilterChipsProps {
  filters: AppliedFilters;
  onRemoveFilter: (key: keyof AppliedFilters) => void;
  onClearAll: () => void;
  entityType: EntityType;
}

// Hook return types
export interface UseFilterOptionsReturn {
  filterOptions: FilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseLazyFilterOptionsReturn extends UseFilterOptionsReturn {
  trigger: () => void;
}

export interface UseLocalFiltersReturn {
  draftFilters: AppliedFilters;
  draftFilterCount: number;
  setDraftFilter: <K extends keyof AppliedFilters>(key: K, value: AppliedFilters[K]) => void;
  applyFilters: () => void;
  isApplying: boolean;
  clearAllDraftFilters: () => void;
  resetDraftFilters: (filters: AppliedFilters) => void;
}

// API response types
export interface FilterOptionsResponse {
  success: boolean;
  data: FilterOptions;
  error?: string;
}

export interface EntityListResponse<T> {
  data: T[];
  filter_options?: FilterOptions;
  total_count: number;
  next_cursor?: string;
  prev_cursor?: string;
  pagination?: {
    has_more: boolean;
    limit: number;
    next_cursor?: string;
    prev_cursor?: string;
  };
}

// Utility types
export type FilterKey = keyof AppliedFilters;
export type FilterValue = AppliedFilters[FilterKey];

// Constants
export const ENTITY_TYPES: Record<string, EntityType> = {
  RESTAURANTS: 'restaurants',
  SYNAGOGUES: 'synagogues',
  MIKVAHS: 'mikvahs'
} as const;

export const SORT_OPTIONS = {
  DISTANCE_ASC: 'distance_asc',
  DISTANCE_DESC: 'distance_desc',
  RATING_DESC: 'rating_desc',
  RATING_ASC: 'rating_asc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  CREATED_DESC: 'created_at_desc',
  CREATED_ASC: 'created_at_asc'
} as const;

export const HOURS_FILTER_OPTIONS = {
  OPEN_NOW: 'openNow',
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  LATE_NIGHT: 'lateNight'
} as const;

export const KOSHER_CATEGORIES = {
  MEAT: 'Meat',
  DAIRY: 'Dairy',
  PAREVE: 'Pareve'
} as const;

export const DENOMINATIONS = {
  ORTHODOX: 'orthodox',
  CONSERVATIVE: 'conservative',
  REFORM: 'reform',
  RECONSTRUCTIONIST: 'reconstructionist'
} as const;

export const SHUL_TYPES = {
  TRADITIONAL: 'traditional',
  CHABAD: 'chabad',
  ORTHODOX: 'orthodox',
  SEPHARDIC: 'sephardic'
} as const;

export const MIKVAH_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending'
} as const;
