import { 
  MarketplaceSearchParams, 
  MarketplaceSearchResponse,
  MarketplaceListingResponse,
  CreateListingRequest,
  CreateListingResponse,
  CategoriesResponse,

  MarketplaceCategory,
  MarketplaceListing,
  MarketplaceStats
} from '@/lib/types/marketplace';

// Ensure we're using the correct backend URL
const BACKEND_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  // If environment variable is set and looks valid, use it
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  
  // Default to the correct production URL
  return 'https://jewgo-app-oyoh.onrender.com';
})();

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

    const apiUrl = `${BACKEND_URL}/api/v4/marketplace/listings?${searchParams.toString()}`;
    
    // Debug logging to help identify URL issues
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console

    }
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console

    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout to handle cold starts
      mode: 'cors', // Explicitly set CORS mode
      credentials: 'omit', // Don't send credentials for cross-origin requests
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch marketplace listings';
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to marketplace server';
      } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        errorMessage = 'Server error: Invalid backend URL configuration';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout: Server is taking too long to respond';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
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
      signal: AbortSignal.timeout(30000), // 30 second timeout to handle cold starts
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
      signal: AbortSignal.timeout(30000), // 30 second timeout to handle cold starts
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
    // Use the local API route instead of calling backend directly
    const response = await fetch('/api/marketplace/categories', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout to handle cold starts
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
      signal: AbortSignal.timeout(30000), // 30 second timeout to handle cold starts
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
 * Get listings by kind (regular, vehicle, appliance)
 */
export async function getListingsByKind(
  kind: 'regular' | 'vehicle' | 'appliance',
  params: Omit<MarketplaceSearchParams, 'kind'> = {}
): Promise<MarketplaceSearchResponse> {
  return fetchMarketplaceListings({
    ...params,
    kind,
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

  static async getListingsByKind(kind: 'regular' | 'vehicle' | 'appliance', params: Omit<MarketplaceSearchParams, 'kind'> = {}): Promise<MarketplaceSearchResponse> {
    return getListingsByKind(kind, params);
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

  // Additional methods for the marketplace page
  static async getCategory(categoryId: string): Promise<MarketplaceCategory | null> {
    try {
      const categories = await fetchMarketplaceCategories();
      if (categories.success && categories.data) {
        return categories.data.find(cat => cat.id.toString() === categoryId) || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }

  static async getCategoryProducts(categoryId: string): Promise<MarketplaceListing[]> {
    try {
      const response = await getListingsByCategory(categoryId);
      if (response.success && response.data) {
        return response.data.listings;
      }
      return [];
    } catch (error) {
      console.error('Error fetching category products:', error);
      return [];
    }
  }

  static async search(query: string, params: any = {}): Promise<{ products: MarketplaceListing[] }> {
    try {
      const response = await searchMarketplaceListings(query, params);
      if (response.success && response.data) {
        return { products: response.data.listings };
      }
      return { products: [] };
    } catch (error) {
      console.error('Error searching products:', error);
      return { products: [] };
    }
  }

  // Additional methods for MarketplacePageClient
  static async getProducts(params: MarketplaceSearchParams = {}): Promise<MarketplaceListing[]> {
    try {
      const response = await fetchMarketplaceListings(params);
      if (response.success && response.data) {
        return response.data.listings;
      }
      return [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  static async getProduct(productId: string): Promise<MarketplaceListing | null> {
    try {
      const response = await fetchMarketplaceListing(productId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  static async getCategories(): Promise<MarketplaceCategory[]> {
    try {
      const response = await fetchMarketplaceCategories();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  static async getFeaturedProducts(): Promise<MarketplaceListing[]> {
    try {
      const response = await fetchMarketplaceListings({ limit: 10 });
      if (response.success && response.data) {
        return response.data.listings;
      }
      return [];
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  }

  static async getStats(): Promise<MarketplaceStats | null> {
    try {
      // This would typically call a stats endpoint
      // For now, return mock data
      return {
        totalListings: 0,
        totalCategories: 0,
        totalUsers: 0,
        recentListings: 0,
        featuredListings: 0
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  }
}
