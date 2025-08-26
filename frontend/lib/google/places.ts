
import { GooglePlacesHours, GooglePlacesResult } from '@/types';

export async function fetchPlaceDetails(place_id: string): Promise<{
  hoursText: string,
  hoursJson: GooglePlacesHours['periods'],
  timezone: string
}> {
  // Validate place_id parameter
  if (!place_id || typeof place_id !== 'string' || place_id.trim() === '') {
    return {
      hoursText: '',
      hoursJson: [],
      timezone: 'UTC'
    };
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id.trim()}&fields=opening_hours,utc_offset_minutes&key=${process.env['GOOGLE_API_KEY']}`
  );
  const data = await res.json();
  // const periods = data.result.opening_hours?.periods || [];
  // const weekdayText = data.result.opening_hours?.weekday_text || [];
  // const offset = data.result.utc_offset_minutes;
  return {
    hoursText: '', // weekdayText.join("\n"),
    hoursJson: [], // periods,
    timezone: 'UTC' // offsetToTimezone(offset)
  };
}

function offsetToTimezone(offset: number): string {
  // Simple mapping for common US timezones
  switch (offset) {
    case -300: return 'America/New_York';
    case -360: return 'America/Chicago';
    case -420: return 'America/Denver';
    case -480: return 'America/Los_Angeles';
    default: return 'UTC';
  }
}

// Modern Google Places API wrapper using the new Place API
export class ModernGooglePlacesAPI {
  private static instance: ModernGooglePlacesAPI;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private lastInitAttempt = 0;
  private readonly INIT_RETRY_DELAY = 60000; // 1 minute between retry attempts
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 300000; // 5 minutes default cache time

  static getInstance(): ModernGooglePlacesAPI {
    if (!ModernGooglePlacesAPI.instance) {
      ModernGooglePlacesAPI.instance = new ModernGooglePlacesAPI();
    }
    return ModernGooglePlacesAPI.instance;
  }

  // Get cached data if still valid
  private getCachedData(key: string): GooglePlacesResult[] | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as GooglePlacesResult[];
  }

  // Set cache data
  private setCachedData(key: string, data: GooglePlacesResult[], ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  // Clear expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((cached, key) => {
      if (now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }
    
    // If there's an ongoing initialization, return that promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // Check if we should retry initialization (avoid too frequent attempts)
    const now = Date.now();
    if (now - this.lastInitAttempt < this.INIT_RETRY_DELAY) {
      return;
    }

    this.lastInitAttempt = now;
    this.initPromise = new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = 300; // 30 seconds with 100ms intervals
      
      const checkGoogleMaps = () => {
        checkCount++;
        
        if (window.google && window.google.maps && window.google.maps.places) {
          this.isInitialized = true;
          resolve();
          return;
        }
        
        if (checkCount >= maxChecks) {
          const error = 'Google Maps failed to load within 30 seconds. Please check your internet connection and try again.';
          // // console.error(error);
          reject(new Error(error));
          return;
        }
        
        // Continue checking
        setTimeout(checkGoogleMaps, 100);
      };

      // Check if API key is available
      const apiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'];
      if (!apiKey) {
        const error = 'Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.';
        // // console.error(error);
        reject(new Error(error));
        return;
      }

      // Start checking for Google Maps availability
      checkGoogleMaps();
    });

    try {
      await this.initPromise;
    } catch (_error) {
      // Reset initialization state on error so it can be retried
      this.isInitialized = false;
      this.initPromise = null;
      throw _error;
    }

    return this.initPromise;
  }

  // Method to reset initialization state (useful for testing or manual refresh)
  resetInitialization(): void {
    this.isInitialized = false;
    this.initPromise = null;
    this.lastInitAttempt = 0;
    }

  // Method to check if API is ready
  isReady(): boolean {
    return this.isInitialized && !!(window.google && window.google.maps && window.google.maps.places);
  }

  // Method to clear cache
  clearCache(): void {
    this.cache.clear();
    }

  // Method to get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    this.cleanupCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  async searchPlaces(query: string, options: {
    location?: { lat: number; lng: number };
    radius?: number;
    types?: string[];
    limit?: number;
  } = {}): Promise<GooglePlacesResult[]> {
    await this.initialize();

    // Validate query parameter
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return [];
    }

    try {
      // Create cache key based on search parameters
      const cacheKey = `search:${query}:${JSON.stringify(options)}`;
      
      // Check cache first
      const cachedResult = this.getCachedData(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Use the new Place API for text search
      const request: google.maps.places.TextSearchRequest = {
        query: query.trim(),
        location: options.location ? new google.maps.LatLng(options.location.lat, options.location.lng) : undefined,
        radius: options.radius,
        types: options.types
      };

      const results = await new Promise<GooglePlacesResult[]>((resolve, _reject) => {
        // Create a dummy div for the service (required by Google Maps API)
        const dummyDiv = document.createElement('div');
        // Use the new Place API if available, fallback to PlacesService
        if (window.google.maps.places.Place) {
          // Modern approach - use Place API
          const placeService = new window.google.maps.places.Place(dummyDiv);
          placeService.textSearch(request, (results: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              const convertedResults: GooglePlacesResult[] = results
                .filter((result: any) => result.place_id) // Filter out results without place_id
                .map((result: any) => ({
                  place_id: result.place_id!,
                  name: result.name || '',
                  formatted_address: result.formatted_address || '',
                  geometry: result.geometry?.location ? {
                    location: {
                      lat: result.geometry.location.lat(),
                      lng: result.geometry.location.lng()
                    }
                  } : { location: { lat: 0, lng: 0 } },
                  rating: undefined, // PlaceResult doesn't have rating
                  user_ratings_total: undefined, // PlaceResult doesn't have user_ratings_total
                  photos: result.photos,
                  opening_hours: undefined, // PlaceResult doesn't have opening_hours
                  website: result.website,
                  formatted_phone_number: undefined, // PlaceResult doesn't have formatted_phone_number
                  price_level: undefined, // PlaceResult doesn't have price_level
                  types: result.types || []
                }));
              resolve(convertedResults.slice(0, options.limit || 20));
            } else {
              resolve([]);
            }
          });
        } else {
          // Fallback to PlacesService (deprecated but still works)
          const placesService = new window.google.maps.places.PlacesService(dummyDiv);
          placesService.textSearch(request, (results: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              const convertedResults: GooglePlacesResult[] = results
                .filter((result: any) => result.place_id) // Filter out results without place_id
                .map((result: any) => ({
                  place_id: result.place_id!,
                  name: result.name || '',
                  formatted_address: result.formatted_address || '',
                  geometry: result.geometry?.location ? {
                    location: {
                      lat: result.geometry.location.lat(),
                      lng: result.geometry.location.lng()
                    }
                  } : { location: { lat: 0, lng: 0 } },
                  rating: undefined, // PlaceResult doesn't have rating
                  user_ratings_total: undefined, // PlaceResult doesn't have user_ratings_total
                  photos: result.photos,
                  opening_hours: undefined, // PlaceResult doesn't have opening_hours
                  website: result.website,
                  formatted_phone_number: undefined, // PlaceResult doesn't have formatted_phone_number
                  price_level: undefined, // PlaceResult doesn't have price_level
                  types: result.types || []
                }));
              resolve(convertedResults.slice(0, options.limit || 20));
            } else {
              resolve([]);
            }
          });
        }
      });

      // Cache the results
      this.setCachedData(cacheKey, results, 300000); // Cache for 5 minutes
      return results;
    } catch (_error) {
      // console.error('Error searching places:', _error);
      return [];
    }
  }

  async getPlacePredictions(input: string, options: {
    types?: string[];
    location?: { lat: number; lng: number };
    radius?: number;
    country?: string;
  } = {}): Promise<google.maps.places.AutocompletePrediction[]> {
    await this.initialize();

    // Validate input parameter
    if (!input || typeof input !== 'string' || input.trim() === '') {
      return [];
    }

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        types: options.types || ['establishment'],
        location: options.location ? new google.maps.LatLng(options.location.lat, options.location.lng) : undefined,
        radius: options.radius,
        componentRestrictions: options.country ? { country: options.country } : undefined
      };

      return new Promise((resolve, _reject) => {
        // Use AutocompleteSuggestion if available (newer API)
        if (window.google.maps.places.AutocompleteSuggestion) {
          const autocompleteService = new window.google.maps.places.AutocompleteSuggestion();
          autocompleteService.getPlacePredictions(request)
            .then((response: any) => {
              resolve(response.predictions || []);
            })
            .catch((_error: any) => {
              // console.error('AutocompleteSuggestion error:', _error);
              resolve([]);
            });
        } else if (window.google.maps.places.AutocompleteService) {
          // Fallback to AutocompleteService
          const autocompleteService = new window.google.maps.places.AutocompleteService();
          autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              resolve([]);
            }
          });
        } else {
          resolve([]);
        }
      });
    } catch (_error) {
      // console.error('Error getting place predictions:', _error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string, fields: string[] = ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'photos', 'opening_hours', 'website', 'formatted_phone_number', 'price_level']): Promise<any> {
    await this.initialize();

    // Validate placeId parameter
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      return null;
    }

    try {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: placeId.trim(),
        fields
      };

      return new Promise((resolve, _reject) => {
        const dummyDiv = document.createElement('div');
        
        // Use Place API if available, fallback to PlacesService
        if (window.google.maps.places.Place) {
          const placeService = new window.google.maps.places.Place(dummyDiv);
          placeService.getDetails(request, (result: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              resolve(null);
            }
          });
        } else {
          const placesService = new window.google.maps.places.PlacesService(dummyDiv);
          placesService.getDetails(request, (result: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              resolve(null);
            }
          });
        }
      });
    } catch (_error) {
      // console.error('Error getting place details:', _error);
      return null;
    }
  }
}

// Export a singleton instance
export const googlePlacesAPI = ModernGooglePlacesAPI.getInstance();

// Legacy function for backward compatibility
export async function searchGooglePlaces(query: string, options: {
  location?: { lat: number; lng: number };
  radius?: number;
  types?: string[];
  limit?: number;
} = {}): Promise<GooglePlacesResult[]> {
  return googlePlacesAPI.searchPlaces(query, options);
}