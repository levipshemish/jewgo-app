import { Restaurant } from '@/lib/types/restaurant';
import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

// Use Next.js API proxy from the browser to avoid CORS in both dev and prod
// Backend URL is handled inside the API routes.
const API_BASE_URL = '';

interface RestaurantsResponse {
  restaurants: Restaurant[];
  total: number;
  page?: number;
  offset?: number;
  limit?: number;
}

interface ApiError {
  message: string;
  status?: number;
  retryable: boolean;
}

export class RestaurantsAPI {
  private static pendingRequests = new Map<string, Promise<any>>();
  private static cache = new Map<string, { ts: number; data: RestaurantsResponse }>();
  private static CACHE_TTL_MS = 30_000; // 30 seconds
  
  // private static async checkNetworkConnectivity(): Promise<boolean> {
  //   try {
  //     // Simple connectivity check - try to fetch a small resource
  //     // Use a simple endpoint that doesn't depend on the backend
  //     const response = await fetch('/api/connectivity-test', {
  //       method: 'GET',
  //       signal: AbortSignal.timeout(3000) // 3 second timeout
  //     });
  //     return response.ok;
  //   } catch (error) {
  //     // console.warn('Network connectivity check failed:', error);
  //     // If connectivity check fails, we'll still try the main API
  //     // but with shorter timeouts and better fallback handling
  //     return false;
  //   }
  // }
  
  // private static async wakeUpBackend(): Promise<boolean> {
  //   try {
  //     // Use a longer timeout for wake-up attempts on production
  //     const timeout = process.env.NODE_ENV === 'production' ? 15000 : 3000;
  //     
  //     // In production, use the health endpoint through the proxy
  //     const healthUrl = process.env.NODE_ENV === 'production' 
  //       ? '/api/health-check' 
  //       : `${API_BASE_URL}/health`;
  //     
  //     const response = await fetch(healthUrl, {
  //       method: 'GET',
  //       signal: AbortSignal.timeout(timeout)
  //     });
  //     
  //     if (response.ok) {
  //       // Check if the backend is actually healthy or just degraded
  //       const healthData = await response.json();
  //       
  //       // Consider it "awake" if frontend is working, even if backend is degraded
  //       if (healthData.overall === 'healthy' || 
  //           (healthData.overall === 'degraded' && healthData.frontend?.status === 'healthy')) {
  //         return true;
  //       }
  //     }
  //     
  //     return false;
  //   } catch {
  //     return false;
  //   }
  // }

  private static async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = 3,
    timeout: number = process.env.NODE_ENV === 'production' ? 15000 : 8000 // Reduced timeout for better UX
  ): Promise<T> {
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const url = `${API_BASE_URL}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
      
      try {
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          if (response.status === 504) {
            errorMessage = 'Request timed out - backend may be starting up. Please try again.';
          }
          const error: ApiError = {
            message: errorMessage,
            status: response.status,
            retryable: response.status >= 500 || response.status === 429
          };
          throw error;
        }
        
        const data = await response.json();
        return data;
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle network errors more gracefully
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // console.warn(`Network error on attempt ${attempt}/${retries}:`, error.message);
          
          // If this is a network connectivity issue, wait before retrying
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Handle AbortError (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          // console.warn(`Request timeout on attempt ${attempt}/${retries}`);
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        if (attempt === retries) {
          throw error;
        }
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  static async fetchRestaurants(limit: number = 1000, queryParams?: string): Promise<RestaurantsResponse> {
    const requestKey = `restaurants_${limit}_${queryParams || ''}`;

    // Serve from cache if fresh to prevent UI flicker and redundant re-renders
    const cached = this.cache.get(requestKey);
    if (cached && (Date.now() - cached.ts) < this.CACHE_TTL_MS) {
      return cached.data;
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }
    
    // Create new request
    const requestPromise = this._fetchRestaurantsInternal(limit, queryParams);
    this.pendingRequests.set(requestKey, requestPromise);
    
    try {
      // Try to fetch real data first, regardless of connectivity check
      const result = await requestPromise;
      // Cache successful result
      this.cache.set(requestKey, { ts: Date.now(), data: result });
      return result;
    } catch (error) {
      // console.error('Error in fetchRestaurants:', error);
      // Re-throw the error to be handled by the UI
      throw error;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }
  
  private static async _fetchRestaurantsInternal(limit: number = 1000, queryParams?: string): Promise<RestaurantsResponse> {
    try {
      // Build URL params, avoiding duplicates
      const urlParams = new URLSearchParams();
      
      // Add default values
      urlParams.set('limit', limit.toString());
      urlParams.set('offset', '0');
      
      // Add additional query params, which may override defaults
      if (queryParams) {
        const additionalParams = new URLSearchParams(queryParams);
        additionalParams.forEach((value, key) => {
          urlParams.set(key, value);
        });
      }
      
      const url = `/api/restaurants?${urlParams.toString()}`;
      
      // Try the main endpoint first
      try {
        const data = await this.makeRequest<any>(url);
        
        // Handle different response formats
        let restaurants: Restaurant[] = [];
        let total: number = 0;
        
        if (data && typeof data === 'object') {
          // Handle Next.js API route wrapper shape: { success, data: Restaurant[], total }
          if ((data as any).success === true && Array.isArray((data as any).data)) {
            restaurants = (data as any).data;
            total = (data as any).total ?? (data as any).data.length;
          } else 
          if (Array.isArray(data)) {
            // Direct array response
            restaurants = data;
            total = data.length;
          } else if ((data as any).restaurants && Array.isArray((data as any).restaurants)) {
            // Wrapped response
            restaurants = (data as any).restaurants;
            total = (data as any).total || (data as any).restaurants.length;
          } else {
            restaurants = [];
            total = 0;
          }
        }
        
        // If we got valid data, return it
        if (Array.isArray(restaurants) && restaurants.length > 0) {
          return {
            restaurants: sanitizeRestaurantData(restaurants) as Restaurant[],
            total,
          };
        }
          } catch (error) {
      // console.warn('Primary API endpoint failed, trying fallback:', error);
      }
      
      // Graceful degradation: if backend returns no restaurants, try images-only endpoint, then mock
      try {
        const withImages = await this.makeRequest<any>(`/api/restaurants-with-images?limit=${Math.min(limit, 200)}`);
        const withImagesData = Array.isArray(withImages?.data)
          ? withImages.data
          : Array.isArray(withImages)
            ? withImages
            : Array.isArray(withImages?.restaurants)
              ? withImages.restaurants
              : [];
        if (withImagesData.length > 0) {
          return {
            restaurants: sanitizeRestaurantData(withImagesData) as Restaurant[],
            total: withImagesData.length,
          };
        }
          } catch (error) {
      // console.warn('Images-only endpoint also failed:', error);
      }
      
      // All endpoints failed
      throw new Error('Unable to connect to restaurant service. Please try again later.');
      
    } catch (error) {
      // console.error('Failed to fetch restaurants:', error);
      
      // Re-throw with a user-friendly message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load restaurants. Please check your connection and try again.');
    }
  }

  static async searchRestaurants(query: string, limit: number = 100): Promise<RestaurantsResponse> {
    try {
      const data = await this.makeRequest<RestaurantsResponse>(`/api/restaurants/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      return {
        restaurants: sanitizeRestaurantData(data.restaurants || []),
        total: data.total || 0
      };
    } catch {
      // // console.error('Failed to search restaurants:', error);
      return {
        restaurants: [],
        total: 0
      };
    }
  }

  static async getRestaurant(id: number): Promise<Restaurant | null> {
    try {
      const response = await this.makeRequest<any>(`/api/restaurants/${id}`);
      // Handle the wrapped response format from backend
      let restaurant = null;
      if (response && (response as any).restaurant) {
        restaurant = (response as any).restaurant;
      } else if (response && (response as any).success === true && (response as any).data) {
        restaurant = (response as any).data;
      } else if (response && (response as any).id) {
        // Direct restaurant object (fallback)
        restaurant = response;
      }
      
      if (restaurant) {
        // Sanitize the restaurant data before returning
        const sanitized = sanitizeRestaurantData([restaurant]);
        return sanitized[0];
      }
      
      return null;
    } catch (error) {
      // console.error('Error fetching restaurant:', error);
      throw new Error('Unable to load restaurant details. Please try again later.');
    }
  }

  static async fetchRestaurantsByIds(ids: number[]): Promise<Restaurant[]> {
    try {
      if (ids.length === 0) {return [];}
      
      // For now, fetch restaurants one by one since the API doesn't support bulk fetch
      const restaurants = await Promise.all(
        ids.map(id => this.getRestaurant(id))
      );
      
      const validRestaurants = restaurants.filter((restaurant): restaurant is Restaurant => restaurant !== null);
      return sanitizeRestaurantData(validRestaurants);
    } catch {
      // // console.error('Error fetching restaurants by IDs:', error);
      return [];
    }
  }

  static async getStatistics(): Promise<any> {
    try {
      const data = await this.makeRequest<any>('/api/statistics');
      return data;
    } catch {
      // // console.error('Failed to fetch statistics:', error);
      return {
        total_restaurants: 0,
        total_cities: 0,
        total_states: 0
      };
    }
  }

}

// Export convenience functions
export const fetchRestaurants = (limit?: number, queryParams?: string) => RestaurantsAPI.fetchRestaurants(limit, queryParams);
export const searchRestaurants = (query: string, limit?: number) => RestaurantsAPI.searchRestaurants(query, limit);
export const getRestaurant = (id: number) => RestaurantsAPI.getRestaurant(id);
export const fetchRestaurantsByIds = (ids: number[]) => RestaurantsAPI.fetchRestaurantsByIds(ids);
export const getStatistics = () => RestaurantsAPI.getStatistics();
