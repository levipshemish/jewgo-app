import { Restaurant } from '@/lib/types/restaurant';
import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

// Use relative URLs to go through frontend proxy in production
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? ''  // Use relative URLs in production to go through frontend proxy
  : process.env['NEXT_PUBLIC_BACKEND_URL'] || 'http://127.0.0.1:8081';

interface RestaurantsResponse {
  restaurants: Restaurant[];
  total: number;
}

interface ApiError {
  message: string;
  status?: number;
  retryable: boolean;
}

export class RestaurantsAPI {
  private static pendingRequests = new Map<string, Promise<any>>();
  
  private static async wakeUpBackend(): Promise<boolean> {
    try {
      // Use a longer timeout for wake-up attempts on production
      const timeout = process.env.NODE_ENV === 'production' ? 15000 : 3000;
      
      // In production, use the health endpoint through the proxy
      const healthUrl = process.env.NODE_ENV === 'production' 
        ? '/api/health-check' 
        : `${API_BASE_URL}/health`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout)
      });
      
      if (response.ok) {
        // Check if the backend is actually healthy or just degraded
        const healthData = await response.json();
        
        // Consider it "awake" if frontend is working, even if backend is degraded
        if (healthData.overall === 'healthy' || 
            (healthData.overall === 'degraded' && healthData.frontend?.status === 'healthy')) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private static async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = 3,
    timeout: number = process.env.NODE_ENV === 'production' ? 30000 : 12000 // Increased timeout for production
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
          
          // For 404 errors, don't retry
          if (response.status === 404) {
            throw error;
          }
          
          // For 429 errors, implement exponential backoff with longer delays
          if (response.status === 429) {
            if (attempt < retries) {
              // Longer delay for rate limiting: 2^attempt seconds + random jitter
              const delay = Math.min(2000 * Math.pow(2, attempt - 1) + Math.random() * 2000, 10000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          if (error.retryable && attempt < retries) {
            // Exponential backoff with jitter for other retryable errors
            const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw error;
        }

        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return data;
        }
        
        // Handle non-JSON responses
        const text = await response.text();
        return text as T;
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 5000);
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
    
    // Check if there's already a pending request
    if (this.pendingRequests.has(requestKey)) {
      // console.log('RestaurantsAPI: Using existing pending request for:', requestKey);
      return this.pendingRequests.get(requestKey)!;
    }
    
    // Create new request
    const requestPromise = this._fetchRestaurantsInternal(limit, queryParams);
    this.pendingRequests.set(requestKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
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
      
      // Graceful degradation: if backend returns no restaurants, try images-only endpoint, then mock
      if (!Array.isArray(restaurants) || restaurants.length === 0) {
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
              restaurants: sanitizeRestaurantData(withImagesData),
              total: withImagesData.length,
            };
          }
        } catch {
          // ignore and fallback to mocks
        }
        return {
          restaurants: sanitizeRestaurantData(this.getMockRestaurants()),
          total: this.getMockRestaurants().length,
        };
      }

      return {
        restaurants: sanitizeRestaurantData(restaurants),
        total,
      };
    } catch {
      // // console.error('Failed to fetch restaurants:', error);
      
      // Return mock data on error for better UX
      return {
        restaurants: sanitizeRestaurantData(this.getMockRestaurants()),
        total: this.getMockRestaurants().length
      };
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
    } catch {
      // // console.error('Error fetching restaurant:', error);
      
      // Fallback to mock data for better UX when API is unavailable
      const mockRestaurants = this.getMockRestaurants();
      const mockRestaurant = mockRestaurants.find(r => r.id === id);
      
      if (mockRestaurant) {
        return mockRestaurant;
      }
      
      return null;
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

  // Fallback mock data for when API is completely unavailable
  static getMockRestaurants(): Restaurant[] {
    return [
      {
        id: 1,
        name: 'Kosher Deli & Grill',
        address: '123 Main St',
        city: 'Miami',
        state: 'FL',
        zip_code: '33101',
        phone_number: '(305) 555-0123',
        certifying_agency: 'KM',
        kosher_category: 'meat',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.5,
        price_range: '$15 - $35',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7617,
        longitude: -80.1918,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Fri: 11:00 AM - 10:00 PM, Sat-Sun: 12:00 PM - 11:00 PM'
        },
        category: {
          name: 'Restaurant',
          description: 'Full-service kosher restaurant'
        }
      },
      {
        id: 2,
        name: 'Miami Kosher Market',
        address: '456 Oak Ave',
        city: 'Miami Beach',
        state: 'FL',
        zip_code: '33139',
        phone_number: '(305) 555-0456',
        certifying_agency: 'ORB',
        kosher_category: 'dairy',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.2,
        price_range: '$10 - $25',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7907,
        longitude: -80.1300,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Sat: 8:00 AM - 8:00 PM, Sun: 9:00 AM - 6:00 PM'
        },
        category: {
          name: 'Market',
          description: 'Kosher grocery and deli market'
        }
      },
      {
        id: 3,
        name: 'Kosher Pizza Palace',
        address: '789 Pine St',
        city: 'Miami',
        state: 'FL',
        zip_code: '33102',
        phone_number: '(305) 555-0789',
        certifying_agency: 'ORB',
        kosher_category: 'dairy',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.8,
        price_range: '$12 - $30',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7749,
        longitude: -80.1977,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Thu: 11:00 AM - 11:00 PM, Fri: 11:00 AM - 3:00 PM, Sat: 8:00 PM - 12:00 AM, Sun: 12:00 PM - 10:00 PM'
        },
        category: {
          name: 'Pizza',
          description: 'Kosher pizza and Italian cuisine'
        }
      },
      {
        id: 4,
        name: 'Sushi Kosher Express',
        address: '321 Ocean Dr',
        city: 'Miami Beach',
        state: 'FL',
        zip_code: '33139',
        phone_number: '(305) 555-0321',
        certifying_agency: 'Kosher Miami',
        kosher_category: 'pareve',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.7,
        price_range: '$20 - $45',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7825,
        longitude: -80.1344,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Sat: 12:00 PM - 10:00 PM, Sun: 5:00 PM - 9:00 PM'
        },
        category: {
          name: 'Sushi',
          description: 'Kosher sushi and Japanese cuisine'
        }
      },
      {
        id: 5,
        name: 'Kosher Bakery & Cafe',
        address: '654 Biscayne Blvd',
        city: 'Miami',
        state: 'FL',
        zip_code: '33132',
        phone_number: '(305) 555-0654',
        certifying_agency: 'ORB',
        kosher_category: 'dairy',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.0,
        price_range: '$8 - $20',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7869,
        longitude: -80.1867,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Fri: 7:00 AM - 7:00 PM, Sat: 8:00 AM - 6:00 PM, Sun: 8:00 AM - 5:00 PM'
        },
        category: {
          name: 'Bakery',
          description: 'Kosher bakery and cafe'
        }
      },
      {
        id: 6,
        name: 'Kosher Ice Cream Parlor',
        address: '987 Collins Ave',
        city: 'Miami Beach',
        state: 'FL',
        zip_code: '33139',
        phone_number: '(305) 555-0987',
        certifying_agency: 'ORB',
        kosher_category: 'dairy',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.3,
        price_range: '$5 - $15',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7869,
        longitude: -80.1225,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Sun: 12:00 PM - 10:00 PM'
        },
        category: {
          name: 'Dessert',
          description: 'Kosher ice cream and dessert parlor'
        }
      },
      {
        id: 7,
        name: 'Kosher Steakhouse',
        address: '147 Lincoln Rd',
        city: 'Miami Beach',
        state: 'FL',
        zip_code: '33139',
        phone_number: '(305) 555-0147',
        certifying_agency: 'KM',
        kosher_category: 'meat',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.6,
        price_range: '$25 - $60',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7907,
        longitude: -80.1300,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Thu: 5:00 PM - 11:00 PM, Fri: 5:00 PM - 3:00 PM, Sat: 8:00 PM - 12:00 AM, Sun: 5:00 PM - 10:00 PM'
        },
        category: {
          name: 'Steakhouse',
          description: 'Upscale kosher steakhouse'
        }
      },
      {
        id: 8,
        name: 'Kosher Mediterranean Grill',
        address: '258 Washington Ave',
        city: 'Miami Beach',
        state: 'FL',
        zip_code: '33139',
        phone_number: '(305) 555-0258',
        certifying_agency: 'ORB',
        kosher_category: 'meat',
        listing_type: 'restaurant',
        status: 'open',
        rating: 4.4,
        price_range: '$15 - $35',
        image_url: '/images/default-restaurant.webp',
        latitude: 25.7825,
        longitude: -80.1344,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        hours: {
          hours_of_operation: 'Mon-Sat: 11:00 AM - 10:00 PM, Sun: 12:00 PM - 9:00 PM'
        },
        category: {
          name: 'Mediterranean',
          description: 'Kosher Mediterranean and Middle Eastern cuisine'
        }
      }
    ];
  }
}

// Export convenience functions
export const fetchRestaurants = (limit?: number, queryParams?: string) => RestaurantsAPI.fetchRestaurants(limit, queryParams);
export const searchRestaurants = (query: string, limit?: number) => RestaurantsAPI.searchRestaurants(query, limit);
export const getRestaurant = (id: number) => RestaurantsAPI.getRestaurant(id);
export const fetchRestaurantsByIds = (ids: number[]) => RestaurantsAPI.fetchRestaurantsByIds(ids);
export const getStatistics = () => RestaurantsAPI.getStatistics();
export const getMockRestaurants = () => RestaurantsAPI.getMockRestaurants(); 