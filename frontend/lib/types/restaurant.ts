// Kosher category enumeration
export type KosherCategory = 'Meat' | 'Dairy' | 'Pareve' | 'Fish' | 'Unknown';

// Restaurant status enumeration
export type RestaurantStatus = 'open' | 'closed' | 'unknown';

// Special type enumeration
export type SpecialType = 'discount' | 'promotion' | 'event';

// Hours structure interfaces
export interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

export interface WeeklyHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface HoursData {
  hours?: WeeklyHours;
  hours_json?: string;
  hours_of_operation?: string;
  hours_last_updated?: string;
  timezone?: string;
  current_time_local?: string;
  hours_parsed?: boolean;
}

// Category structure interface
export interface RestaurantCategory {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface RestaurantSpecial {
  id: number;
  restaurant_id: number;
  title: string;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  start_date?: string;
  end_date?: string;
  is_paid: boolean;
  payment_status: string;
  special_type: 'discount' | 'promotion' | 'event';
  priority: number;
  is_active: boolean;
  created_date: string;
  updated_date: string;
  // Additional properties for UI display
  discount?: string;
  price?: number;
  originalPrice?: number;
  validUntil?: string;
  terms?: string;
}

export interface MenuPricing {
  [section: string]: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

export interface RestaurantGridProps {
  restaurants: Restaurant[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalRestaurants?: number;
}

export interface SearchBarProps {
  onSearch: (query: string) => void;
}

export interface CategoryNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export interface Restaurant {
  // Hours and category with proper types
  hours: HoursData;
  category: RestaurantCategory;
  
  // Core identification
  id: string;
  name: string;
  
  // Location information
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  
  // Contact information
  phone_number: string;
  website?: string;
  google_listing_url?: string;
  
  // Kosher certification
  kosher_category: KosherCategory;
  certifying_agency: string;
  is_cholov_yisroel?: boolean;
  is_pas_yisroel?: boolean;
  cholov_stam?: boolean;
  
  // Business details
  listing_type: string;
  short_description?: string;
  price_range?: string;
  min_avg_meal_cost?: number;
  max_avg_meal_cost?: number;
  
  // Hours and status
  hours_of_operation?: string;
  hours_json?: string;
  hours_last_updated?: string;
  timezone?: string;
  current_time_local?: string;
  hours_parsed?: boolean;
  
  // Status information
  status: RestaurantStatus;
  is_open?: boolean;
  status_reason?: string;
  next_open_time?: string;
  
  // Media
  image_url?: string;
  additional_images?: string[];
  
  // Specials and offers
  specials?: RestaurantSpecial[];
  
  // Ratings and reviews
  rating?: number;
  star_rating?: number;
  quality_rating?: number;
  review_count?: number;
  google_rating?: number;
  google_review_count?: number;
  google_reviews?: string;
  
  // Enhanced business data (Phase 3)
  business_types?: string;
  review_snippets?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Additional notes
  notes?: string;
  
  // Legacy fields for backward compatibility
  certificate_link?: string;
  hours_open?: string;
  avg_price?: string;
  menu_pricing?: MenuPricing;
  openStatus?: RestaurantStatus;
  
  // Additional fields that may be present in data
  dietary_restrictions?: string[];
  
  // Computed fields (not from database)
  distance?: string;
}

// Utility function to compute restaurant status
export const computeRestaurantStatus = (restaurant: Restaurant): 'open' | 'closed' | 'unknown' => {
  // Priority: is_open field first
  if (restaurant.is_open !== undefined) {
    return restaurant.is_open ? 'open' : 'closed';
  }
  
  // Fallback to hours_open field
  if (restaurant.hours_open) {
    return restaurant.hours_open.toLowerCase().includes('open') ? 'open' : 'closed';
  }
  
  // Fallback to status field
  if (restaurant.status) {
    const status = restaurant.status.toLowerCase();
    if (status.includes('open')) {return 'open';}
    if (status.includes('closed')) {return 'closed';}
  }
  
  return 'unknown';
};
