export interface LightRestaurant {
  id: string | number;
  name: string;
  address: string;
  image_url?: string;
  price_range?: string;
  google_rating?: number | string;
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

