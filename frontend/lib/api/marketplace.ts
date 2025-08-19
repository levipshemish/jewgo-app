import { 
  MarketplaceSearchParams, 
  MarketplaceSearchResponse,
  MarketplaceListingResponse,
  CreateListingRequest,
  CreateListingResponse,
  CategoriesResponse,
  GemachsResponse
} from '@/lib/types/marketplace';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo.onrender.com';

/**
 * Fetch marketplace listings with filtering and pagination
 */
export async function fetchMarketplaceListings(
  params: MarketplaceSearchParams = {}
): Promise<MarketplaceSearchResponse> {
  try {
    const searchParams = new URLSearchParams();
    
    // Add all parameters to search params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${BACKEND_URL}/api/v4/marketplace/listings?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return {
      success: false,
      error: 'Failed to fetch marketplace listings'
    };
  }
}

/**
 * Fetch a specific marketplace listing by ID
 */
export async function fetchMarketplaceListing(
  listingId: string
): Promise<MarketplaceListingResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v4/marketplace/listings/${listingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Listing not found'
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching marketplace listing:', error);
    return {
      success: false,
      error: 'Failed to fetch marketplace listing'
    };
  }
}

/**
 * Create a new marketplace listing
 */
export async function createMarketplaceListing(
  listingData: CreateListingRequest
): Promise<CreateListingResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v4/marketplace/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(listingData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating marketplace listing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create marketplace listing'
    };
  }
}

/**
 * Fetch marketplace categories
 */
export async function fetchMarketplaceCategories(): Promise<CategoriesResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v4/marketplace/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching marketplace categories:', error);
    return {
      success: false,
      error: 'Failed to fetch marketplace categories'
    };
  }
}

/**
 * Fetch marketplace gemachs
 */
export async function fetchMarketplaceGemachs(): Promise<GemachsResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v4/marketplace/gemachs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching marketplace gemachs:', error);
    return {
      success: false,
      error: 'Failed to fetch marketplace gemachs'
    };
  }
}

/**
 * Endorse a marketplace listing (upvote/downvote)
 */
export async function endorseListing(
  listingId: string,
  endorsementType: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v4/marketplace/listings/${listingId}/endorsements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: endorsementType }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error endorsing listing:', error);
    return {
      success: false,
      error: 'Failed to endorse listing'
    };
  }
}

/**
 * Search marketplace listings
 */
export async function searchMarketplaceListings(
  query: string,
  params: Omit<MarketplaceSearchParams, 'search'> = {}
): Promise<MarketplaceSearchResponse> {
  return fetchMarketplaceListings({
    ...params,
    search: query,
  });
}

/**
 * Get listings by category
 */
export async function getListingsByCategory(
  category: string,
  params: Omit<MarketplaceSearchParams, 'category'> = {}
): Promise<MarketplaceSearchResponse> {
  return fetchMarketplaceListings({
    ...params,
    category,
  });
}

/**
 * Get listings by type (sale, free, borrow, gemach)
 */
export async function getListingsByType(
  type: 'sale' | 'free' | 'borrow' | 'gemach',
  params: Omit<MarketplaceSearchParams, 'type'> = {}
): Promise<MarketplaceSearchResponse> {
  return fetchMarketplaceListings({
    ...params,
    type,
  });
}

/**
 * Get listings by location
 */
export async function getListingsByLocation(
  lat: number,
  lng: number,
  radius: number = 10,
  params: Omit<MarketplaceSearchParams, 'lat' | 'lng' | 'radius'> = {}
): Promise<MarketplaceSearchResponse> {
  return fetchMarketplaceListings({
    ...params,
    lat,
    lng,
    radius,
  });
}

/**
 * MarketplaceAPI class for centralized marketplace operations
 */
export class MarketplaceAPI {
  static async fetchListings(params: MarketplaceSearchParams = {}): Promise<MarketplaceSearchResponse> {
    return fetchMarketplaceListings(params);
  }

  static async fetchListing(listingId: string): Promise<MarketplaceListingResponse> {
    return fetchMarketplaceListing(listingId);
  }

  static async createListing(listingData: CreateListingRequest): Promise<CreateListingResponse> {
    return createMarketplaceListing(listingData);
  }

  static async searchListings(query: string, params: Omit<MarketplaceSearchParams, 'search'> = {}): Promise<MarketplaceSearchResponse> {
    return searchMarketplaceListings(query, params);
  }

  static async getListingsByCategory(category: string, params: Omit<MarketplaceSearchParams, 'category'> = {}): Promise<MarketplaceSearchResponse> {
    return getListingsByCategory(category, params);
  }

  static async getListingsByType(type: 'sale' | 'free' | 'borrow' | 'gemach', params: Omit<MarketplaceSearchParams, 'type'> = {}): Promise<MarketplaceSearchResponse> {
    return getListingsByType(type, params);
  }

  static async getListingsByLocation(lat: number, lng: number, radius: number = 10, params: Omit<MarketplaceSearchParams, 'lat' | 'lng' | 'radius'> = {}): Promise<MarketplaceSearchResponse> {
    return getListingsByLocation(lat, lng, radius, params);
  }

  static async endorseListing(listingId: string, endorsementType: 'up' | 'down'): Promise<{ success: boolean; error?: string }> {
    return endorseListing(listingId, endorsementType);
  }

  static async fetchCategories(): Promise<CategoriesResponse> {
    return fetchMarketplaceCategories();
  }

  static async fetchGemachs(): Promise<GemachsResponse> {
    return fetchMarketplaceGemachs();
  }
}
