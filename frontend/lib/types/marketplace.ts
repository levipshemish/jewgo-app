export interface MarketplaceListing {
  id: string;
  kind: 'regular' | 'vehicle' | 'appliance';  // Changed from type
  txn_type: 'sale';  // New field
  title: string;
  description?: string;
  price_cents: number;
  price?: number;
  originalPrice?: number;
  currency: string;
  condition: 'new' | 'used_like_new' | 'used_good' | 'used_fair';
  category_id: number;
  subcategory_id?: number;
  category_name?: string;
  subcategory_name?: string;
  city?: string;
  region?: string;
  zip?: string;
  country: string;
  lat?: number;
  lng?: number;
  seller_user_id?: string;
  seller_name?: string;
  seller_username?: string;
  attributes?: any;  // JSONB for kind-specific data
  endorse_up: number;
  endorse_down: number;
  status: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
  images?: string[];
  name?: string;
  isOnSale?: boolean;
  views?: number;
  isAvailable?: boolean;
  rating?: number;
  vendor?: {
    city?: string;
    state?: string;
    name?: string;
    logo?: string;
  };
}

// Alias for backward compatibility
export type MarketplaceProduct = MarketplaceListing;

export interface MarketplaceCategory {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
  color?: string;
  productCount?: number;
  description?: string;
  icon?: string;
  subcategories: MarketplaceSubcategory[];
}

export interface MarketplaceSubcategory {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
}



export interface MarketplaceFilters {
  category: string;
  subcategory: string;
  kind: string;  // Changed from listingType
  condition: string;
  minPrice: string;
  maxPrice: string;
  city: string;
  region: string;
}

export interface MarketplaceSearchParams {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  kind?: string;  // Changed from type
  condition?: string;
  min_price?: number;
  max_price?: number;
  city?: string;
  region?: string;
  status?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  featured?: boolean;
}

export interface MarketplaceSearchResponse {
  success: boolean;
  data?: {
    listings: MarketplaceListing[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface MarketplaceListingResponse {
  success: boolean;
  data?: MarketplaceListing;
  error?: string;
}

export interface CreateListingRequest {
  title: string;
  description?: string;
  kind: 'regular' | 'vehicle' | 'appliance';  // Changed from type
  txn_type?: 'sale';  // New field
  category_id: number;
  subcategory_id?: number;
  price_cents: number;
  currency?: string;
  condition: 'new' | 'used_like_new' | 'used_good' | 'used_fair';
  city?: string;
  region?: string;
  zip?: string;
  country?: string;
  lat?: number;
  lng?: number;
  seller_user_id?: string;
  attributes?: any;  // JSONB for kind-specific data
}

export interface CreateListingResponse {
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: string;
}

export interface CategoriesResponse {
  success: boolean;
  data?: MarketplaceCategory[];
  error?: string;
}



export interface MarketplaceStats {
  totalListings: number;
  totalCategories: number;
  totalUsers: number;
  recentListings: number;
  featuredListings: number;
}

// Kind-specific attribute interfaces
export interface VehicleAttributes {
  vehicle_type: 'car' | 'motorcycle' | 'scooter' | 'bike';
  make: string;
  model: string;
  year: number;
  mileage: number;
  [key: string]: any;
}

export interface ApplianceAttributes {
  appliance_type: string;
  kosher_use: 'meat' | 'dairy' | 'pareve' | 'unspecified';
  brand?: string;
  model?: string;
  never_mixed?: boolean;
  [key: string]: any;
}

export interface RegularAttributes {
  [key: string]: any;
}
