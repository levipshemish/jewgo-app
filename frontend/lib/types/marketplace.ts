export interface MarketplaceListing {
  id: string;
  title: string;
  description?: string;
  type: 'sale' | 'free' | 'borrow';
  category?: MarketplaceCategory | string;
  subcategory?: string;
  price_cents: number;
  price?: number;
  originalPrice?: number;
  currency: string;
  condition?: 'new' | 'used_like_new' | 'used_good' | 'used_fair';
  city?: string;
  region?: string;
  zip?: string;
  country: string;
  lat?: number;
  lng?: number;
  seller_name?: string;
  seller_type: 'user' | 'gemach';
  available_from?: string;
  available_to?: string;
  loan_terms?: any;
  attributes?: any;
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
  listingType: string;
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
  type?: string;
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
  type: 'sale' | 'free' | 'borrow' | 'gemach';
  category_id: number;
  subcategory_id?: number;
  price_cents: number;
  currency?: string;
  condition?: 'new' | 'used_like_new' | 'used_good' | 'used_fair';
  city?: string;
  region?: string;
  zip?: string;
  country?: string;
  lat?: number;
  lng?: number;
  seller_user_id?: string;
  seller_gemach_id?: string;
  available_from?: string;
  available_to?: string;
  loan_terms?: any;
  attributes?: any;
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
