import { Restaurant } from '@/lib/types/restaurant';
import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

export type RestaurantsResponse = {
  success: boolean;
  restaurants: Restaurant[];
  totalPages: number;
  totalRestaurants: number;
  page: number;
  limit: number;
  message?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!API_BASE) {
  // Helps catch "relative fetch" bugs in prod logs
  // (relative fetch would hit /eatery page HTML and blow up parsing)
  console.warn("NEXT_PUBLIC_BACKEND_URL is not set; fetches may fail.");
}

export async function fetchRestaurants({
  page = 1,
  limit = 50,
  filters = {},
  location,
}: { 
  page?: number; 
  limit?: number;
  filters?: Record<string, any>;
  location?: { latitude: number; longitude: number };
}): Promise<RestaurantsResponse> {
  const u = new URL("/api/restaurants", API_BASE || window.location.origin);
  
  // Build search params
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  searchParams.set('offset', String((page - 1) * limit)); // Convert page to offset for backend
  
  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  
  // Add location if available
  if (location) {
    searchParams.set('lat', String(location.latitude));
    searchParams.set('lng', String(location.longitude));
  }
  
  u.search = searchParams.toString();

  const res = await fetch(u.toString(), {
    // No caching for freshness; change if you want ISR
    cache: "no-store",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json || typeof json !== 'object') {
    throw new Error("Malformed restaurants response");
  }
  
  return json as RestaurantsResponse;
}

export async function searchRestaurants(query: string, limit: number = 100): Promise<RestaurantsResponse> {
  const u = new URL("/api/restaurants/search", API_BASE || window.location.origin);
  u.search = new URLSearchParams({ 
    q: query, 
    limit: String(limit) 
  }).toString();

  const res = await fetch(u.toString(), {
    cache: "no-store",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json || typeof json !== 'object') {
    throw new Error("Malformed search response");
  }
  
  return json as RestaurantsResponse;
}

export async function getRestaurant(id: number): Promise<Restaurant | null> {
  const u = new URL(`/api/restaurants/${id}`, API_BASE || window.location.origin);

  const res = await fetch(u.toString(), {
    cache: "no-store",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error(`Backend error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json || typeof json !== 'object') {
    throw new Error("Malformed restaurant response");
  }
  
  // Handle different response formats
  let restaurant = null;
  if (json.restaurant) {
    restaurant = json.restaurant;
  } else if (json.success === true && json.data) {
    restaurant = json.data;
  } else if (json.id) {
    restaurant = json;
  }
  
  if (restaurant) {
    const sanitized = sanitizeRestaurantData([restaurant]);
    return sanitized[0] as Restaurant;
  }
  
  return null;
}

export async function fetchRestaurantsByIds(ids: number[]): Promise<Restaurant[]> {
  try {
    if (ids.length === 0) {
      return [];
    }
    
    // For now, fetch restaurants one by one since the API doesn't support bulk fetch
    const restaurants = await Promise.all(
      ids.map(id => getRestaurant(id))
    );
    
    const validRestaurants = restaurants.filter((restaurant): restaurant is Restaurant => restaurant !== null);
    return sanitizeRestaurantData(validRestaurants) as Restaurant[];
  } catch (error) {
    console.error('Error fetching restaurants by IDs:', error);
    return [];
  }
}

export async function getStatistics(): Promise<any> {
  const u = new URL("/api/statistics", API_BASE || window.location.origin);

  const res = await fetch(u.toString(), {
    cache: "no-store",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json || typeof json !== 'object') {
    throw new Error("Malformed statistics response");
  }
  
  return json;
}
