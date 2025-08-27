
import { GooglePlacesHours, GooglePlacesResult } from '@/types';
import { loadMaps } from '@/lib/maps/loader';

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
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initialization attempts
    if (this.initPromise) {
      return this.initPromise;
    }

    // Check if we've tried recently to avoid spam
    const now = Date.now();
    if (this.isInitialized || (now - this.lastInitAttempt < this.INIT_RETRY_DELAY)) {
      return;
    }

    this.lastInitAttempt = now;
    this.initPromise = this._initialize();
    
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await loadMaps();
      this.isInitialized = true;
    } catch (error) {
      console.error('[ModernGooglePlacesAPI] Failed to initialize:', error);
      throw error;
    }
  }

  async searchPlaces(query: string, options: {
    location?: { lat: number; lng: number };
    radius?: number;
    types?: string[];
    limit?: number;
  } = {}): Promise<GooglePlacesResult[]> {
    await this.initialize();

    // Validate input
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return [];
    }

    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use the modern Place API for searching
      const results: GooglePlacesResult[] = [];
      
      // For now, we'll use a simple approach with the Places API
      // In the future, this could be enhanced with the modern Place API
      const searchRequest = {
        query: query.trim(),
        location: options.location ? new google.maps.LatLng(options.location.lat, options.location.lng) : undefined,
        radius: options.radius || 50000, // 50km default
        type: options.types?.[0] || 'establishment'
      };

      // Use PlacesService for text search (this is still supported)
      const dummyDiv = document.createElement('div');
      const placesService = new google.maps.places.PlacesService(dummyDiv);
      
      const searchResults = await new Promise<google.maps.PlaceResult[]>((resolve, reject) => {
        placesService.textSearch(searchRequest, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });

      // Convert to our format
      for (const place of searchResults.slice(0, options.limit || 10)) {
        if (place.place_id) {
          results.push({
            place_id: place.place_id,
            name: place.name || '',
            formatted_address: place.formatted_address || '',
            geometry: place.geometry ? {
              location: {
                lat: place.geometry.location?.lat() || 0,
                lng: place.geometry.location?.lng() || 0
              }
            } : { location: { lat: 0, lng: 0 } },
            rating: (place as any).rating,
            user_ratings_total: (place as any).user_ratings_total,
            types: place.types || []
          });
        }
      }

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

    if (!input || input.length < 2) {
      return [];
    }

    try {
      // Debug: log what's available in the Google Maps API
      if (process.env.NODE_ENV === 'development') {
        console.log('[ModernGooglePlacesAPI] Available Google Maps objects:', {
          hasImportLibrary: !!(window.google.maps as any).importLibrary,
          hasPlaces: !!window.google.maps.places,
          placesKeys: window.google.maps.places ? Object.keys(window.google.maps.places) : [],
          hasAutocompleteService: !!window.google.maps.places?.AutocompleteService,
          hasAutocompleteSuggestion: !!(window.google.maps.places as any)?.AutocompleteSuggestion
        });
      }
      
      // Try modern API first using importLibrary
      if ((window.google.maps as any).importLibrary) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Attempting to use importLibrary approach');
          }
          
          // Try to get the places library first
          const places = await (window.google.maps as any).importLibrary('places');
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Places library imported:', places);
          }
          
          if (places && places.AutocompleteSuggestion) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[ModernGooglePlacesAPI] Successfully imported AutocompleteSuggestion');
            }
            
            const autocompleteSuggestion = new places.AutocompleteSuggestion();
            
            const request: any = {
              input,
              types: options.types || ['establishment', 'geocode'],
              componentRestrictions: options.country ? { country: options.country } : undefined
            };

            if (options.location && options.radius) {
              request.locationBias = {
                center: options.location,
                radius: options.radius
              };
            }

            if (process.env.NODE_ENV === 'development') {
              console.log('[ModernGooglePlacesAPI] Making request with:', request);
            }

            // Modern API uses async method
            const result = await autocompleteSuggestion.getPlacePredictionsAsync(request);
            if (result && result.predictions) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[ModernGooglePlacesAPI] Successfully got predictions from modern API:', result.predictions.length);
              }
              return result.predictions;
            }
            return [];
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[ModernGooglePlacesAPI] AutocompleteSuggestion not available in places library');
            }
          }
        } catch (modernError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ModernGooglePlacesAPI] Modern importLibrary approach failed:', modernError);
          }
        }
      }

      // Try alternative modern API approach - check if AutocompleteSuggestion is directly available
      if ((window.google.maps.places as any).AutocompleteSuggestion) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Trying direct AutocompleteSuggestion access');
          }
          
          const AutocompleteSuggestion = (window.google.maps.places as any).AutocompleteSuggestion;
          const autocompleteSuggestion = new AutocompleteSuggestion();
          
          const request: any = {
            input,
            types: options.types || ['establishment', 'geocode'],
            componentRestrictions: options.country ? { country: options.country } : undefined
          };

          if (options.location && options.radius) {
            request.locationBias = {
              center: options.location,
              radius: options.radius
            };
          }

          // Try both sync and async methods
          if (typeof autocompleteSuggestion.getPlacePredictionsAsync === 'function') {
            const result = await autocompleteSuggestion.getPlacePredictionsAsync(request);
            if (result && result.predictions) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[ModernGooglePlacesAPI] Direct access async method worked:', result.predictions.length);
              }
              return result.predictions;
            }
          } else if (typeof autocompleteSuggestion.getPlacePredictions === 'function') {
            return new Promise((resolve) => {
              autocompleteSuggestion.getPlacePredictions(request, (predictions: any[], status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[ModernGooglePlacesAPI] Direct access sync method worked:', predictions.length);
                  }
                  resolve(predictions);
                } else {
                  resolve([]);
                }
              });
            });
          }
        } catch (directError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ModernGooglePlacesAPI] Direct AutocompleteSuggestion access failed:', directError);
          }
        }
      }
      return new Promise((resolve) => {
        // Debug: log what's available in the Google Maps API
        if (process.env.NODE_ENV === 'development') {
          console.log('[ModernGooglePlacesAPI] Available in google.maps.places:', Object.keys(window.google.maps.places || {}));
          console.log('[ModernGooglePlacesAPI] AutocompleteSuggestion available:', !!(window.google.maps.places as any).AutocompleteSuggestion);
          console.log('[ModernGooglePlacesAPI] AutocompleteSuggestion type:', typeof (window.google.maps.places as any).AutocompleteSuggestion);
        }
        
        // Use the modern AutocompleteSuggestion API instead of deprecated AutocompleteService
        if ((window.google.maps.places as any).AutocompleteSuggestion && 
            typeof (window.google.maps.places as any).AutocompleteSuggestion === 'function') {
          try {
            const AutocompleteSuggestion = (window.google.maps.places as any).AutocompleteSuggestion;
            const autocompleteSuggestion = new AutocompleteSuggestion();
            
            const request: any = {
              input,
              types: options.types || ['establishment', 'geocode'],
              componentRestrictions: options.country ? { country: options.country } : undefined
            };

            if (options.location && options.radius) {
              request.locationBias = {
                center: options.location,
                radius: options.radius
              };
            }

            // Modern API uses a different method signature
            if (typeof autocompleteSuggestion.getPlacePredictions === 'function') {
              autocompleteSuggestion.getPlacePredictions(request, (predictions: any[], status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                  resolve(predictions);
                } else {
                  resolve([]);
                }
              });
            } else if (typeof autocompleteSuggestion.getPlacePredictionsAsync === 'function') {
              // Try async version if available
              autocompleteSuggestion.getPlacePredictionsAsync(request).then((result: any) => {
                if (result && result.predictions) {
                  resolve(result.predictions);
                } else {
                  resolve([]);
                }
              }).catch(() => {
                resolve([]);
              });
            } else {
              throw new Error('AutocompleteSuggestion API not properly initialized');
            }
          } catch (error) {
            console.warn('[ModernGooglePlacesAPI] Modern AutocompleteSuggestion failed, falling back to legacy:', error);
            this.tryLegacyAutocomplete(input, options, resolve);
          }
        } else {
          this.tryLegacyAutocomplete(input, options, resolve);
        }
      });
    } catch (error) {
      console.error('[ModernGooglePlacesAPI] Error in getPlacePredictions:', error);
      return [];
    }
  }

  private tryLegacyAutocomplete(input: string, options: any, resolve: (predictions: any[]) => void) {
    // Fallback to legacy AutocompleteService if modern API is not available
    if (window.google.maps.places.AutocompleteService) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ModernGooglePlacesAPI] Using legacy AutocompleteService as fallback');
      }
      
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      
      const request: any = {
        input,
        types: options.types || ['establishment', 'geocode'],
        componentRestrictions: options.country ? { country: options.country } : undefined
      };

      if (options.location && options.radius) {
        request.locationBias = {
          center: options.location,
          radius: options.radius
        };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[ModernGooglePlacesAPI] Legacy API request:', request);
      }

      autocompleteService.getPlacePredictions(request, (predictions: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Legacy API returned predictions:', predictions.length);
            console.log('[ModernGooglePlacesAPI] First prediction:', predictions[0]);
          }
          resolve(predictions);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Legacy API failed with status:', status);
          }
          resolve([]);
        }
      });
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ModernGooglePlacesAPI] No legacy AutocompleteService available');
      }
      resolve([]);
    }
  }

  async getPlaceDetails(placeId: string, fields: string[] = ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'openingHours', 'website', 'formattedPhoneNumber', 'priceLevel']): Promise<any> {
    await this.initialize();

    // Validate placeId parameter
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ModernGooglePlacesAPI] Invalid placeId provided:', { placeId, type: typeof placeId });
      }
      return null;
    }

    // Additional validation for placeId format
    const trimmedPlaceId = placeId.trim();
    if (trimmedPlaceId.length < 10) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ModernGooglePlacesAPI] PlaceId too short:', trimmedPlaceId);
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ModernGooglePlacesAPI] Getting place details for:', trimmedPlaceId, 'with fields:', fields);
    }

    try {
      // Use the modern Place API
      if ((window.google.maps.places as any).Place) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Using modern Place API');
          }
          
          const PlaceCtor = (window.google.maps.places as any).Place;
          const place = new PlaceCtor({ id: trimmedPlaceId });
          
          // Use the correct field names for the modern API
          const modernFields = fields.map(field => {
            switch (field) {
              case 'name':
                return 'displayName';
              case 'formatted_address':
                return 'formattedAddress';
              case 'formatted_phone_number':
                return 'formattedPhoneNumber';
              case 'opening_hours':
                return 'openingHours';
              case 'price_level':
                return 'priceLevel';
              case 'user_ratings_total':
                return 'userRatingCount';
              case 'geometry':
                return 'location';
              case 'address_components':
                return 'addressComponents';
              default:
                return field;
            }
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Modern fields mapped:', modernFields);
          }
          
          // Modern API: fetchFields returns a Promise with requested fields
          const result = await place.fetchFields({ fields: modernFields });
          if (result) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[ModernGooglePlacesAPI] Modern API result:', result);
            }
            
            // Map modern field names back to legacy format for compatibility
            const legacyResult = { ...result };
            if (result.displayName) {legacyResult.name = result.displayName;}
            if (result.formattedAddress) {legacyResult.formatted_address = result.formattedAddress;}
            if (result.formattedPhoneNumber) {legacyResult.formatted_phone_number = result.formattedPhoneNumber;}
            if (result.openingHours) {legacyResult.opening_hours = result.openingHours;}
            if (result.priceLevel) {legacyResult.price_level = result.priceLevel;}
            if (result.userRatingCount) {legacyResult.user_ratings_total = result.userRatingCount;}
            if (result.location) {legacyResult.geometry = result.location;}
            if (result.addressComponents) {legacyResult.address_components = result.addressComponents;}
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[ModernGooglePlacesAPI] Legacy result mapped:', legacyResult);
            }
            
            return legacyResult;
          }
          return null;
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Modern Place API failed, trying legacy fallback:', e);
          }
          
          // Try legacy PlacesService as fallback
          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('[ModernGooglePlacesAPI] Using legacy PlacesService fallback');
            }
            
            const dummyDiv = document.createElement('div');
            const placesService = new window.google.maps.places.PlacesService(dummyDiv);
            const request: google.maps.places.PlaceDetailsRequest = {
              placeId: trimmedPlaceId,
              fields
            };
            
            const legacyResult = await new Promise((resolve) => {
              placesService.getDetails(request, (result: any, status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[ModernGooglePlacesAPI] Legacy API result:', result);
                    console.log('[ModernGooglePlacesAPI] Address components:', result.address_components);
                    console.log('[ModernGooglePlacesAPI] Formatted address:', result.formatted_address);
                  }
                  resolve(result);
                } else {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[ModernGooglePlacesAPI] Legacy PlacesService status:', status);
                  }
                  resolve(null);
                }
              });
            });
            
            return legacyResult;
          } catch (legacyError) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[ModernGooglePlacesAPI] Legacy PlacesService also failed:', legacyError);
            }
            return null;
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ModernGooglePlacesAPI] Modern Place API not available, using legacy fallback');
        }
        
        // Try legacy PlacesService as fallback
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Using legacy PlacesService fallback (no modern API)');
          }
          
          const dummyDiv = document.createElement('div');
          const placesService = new window.google.maps.places.PlacesService(dummyDiv);
          const request: google.maps.places.PlaceDetailsRequest = {
            placeId: trimmedPlaceId,
            fields
          };
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Legacy request:', request);
          }
          
          const legacyResult = await new Promise((resolve) => {
            placesService.getDetails(request, (result: any, status: any) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[ModernGooglePlacesAPI] Legacy API result:', result);
                  console.log('[ModernGooglePlacesAPI] Address components:', result.address_components);
                  console.log('[ModernGooglePlacesAPI] Formatted address:', result.formatted_address);
                }
                resolve(result);
              } else {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[ModernGooglePlacesAPI] Legacy PlacesService status:', status);
                }
                resolve(null);
              }
            });
          });
          
          return legacyResult;
        } catch (legacyError) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Legacy PlacesService failed:', legacyError);
          }
          return null;
        }
      }
    } catch (_error) {
      return null;
    }
  }

  // Test method to verify API functionality
  async testAPI(): Promise<{ success: boolean; message: string; details?: any }> {
    await this.initialize();

    try {
      // Check if Google Maps and Places are properly loaded
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        return {
          success: false,
          message: 'Google Maps Places not available'
        };
      }

      // Test if modern API is available
      const hasModernAPI = !!(window.google.maps.places.AutocompleteSuggestion);
      const hasLegacyAPI = !!(window.google.maps.places.AutocompleteService);

      // Test a simple prediction request
      const testRequest: google.maps.places.AutocompletionRequest = {
        input: 'Miami',
        types: ['address'],
        componentRestrictions: { country: 'us' }
      };

      let testResult = null;
      let testError = null;

      try {
        if (hasModernAPI) {
          const autocompleteService = new window.google.maps.places.AutocompleteSuggestion();
          if (typeof autocompleteService.getPlacePredictions === 'function') {
            const response = await autocompleteService.getPlacePredictions(testRequest);
            testResult = response;
          }
        }
      } catch (error) {
        testError = error;
      }

      // Try legacy API if modern failed
      if (!testResult && hasLegacyAPI) {
        try {
          const legacy = new window.google.maps.places.AutocompleteService();
          testResult = await new Promise((resolve) => {
            legacy.getPlacePredictions(testRequest, (predictions: any, status: any) => {
              resolve({ predictions, status });
            });
          });
        } catch (error) {
          testError = error;
        }
      }

      return {
        success: true,
        message: `API test completed. Modern API: ${hasModernAPI}, Legacy API: ${hasLegacyAPI}`,
        details: {
          hasModernAPI,
          hasLegacyAPI,
          testResult,
          testError
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
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
