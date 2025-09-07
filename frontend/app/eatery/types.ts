export interface LightRestaurant {
  id: string | number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  image_url?: string;
  price_range?: string;
  google_rating?: number | string;
  rating?: number | string;
  star_rating?: number | string;
  quality_rating?: number | string;
  google_reviews?: string; // JSON string containing review data
  kosher_category?: string;
  cuisine?: string;
  is_open?: boolean;
  latitude?: number;
  longitude?: number;
  // Computed client field: numeric distance in km for formatDistance
  distance?: number;
}

export interface ApiResponse {
  success: boolean;
  data: {
    restaurants: LightRestaurant[];
    total: number;
    filterOptions: {
      agencies: string[];
      kosherCategories: string[];
      listingTypes: string[];
      priceRanges: string[];
      cities: string[];
      states: string[];
    };
  };
  pagination: {
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
  };
}

