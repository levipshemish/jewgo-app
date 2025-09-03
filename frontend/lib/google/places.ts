/* eslint-disable no-console */
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

  // const res = await fetch(
  //   `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id.trim()}&fields=opening_hours,utc_offset_minutes&key=${process.env['GOOGLE_API_KEY']}`
  // );
  // const data = await res.json();
  // const periods = data.result.opening_hours?.periods || [];
  // const weekdayText = data.result.opening_hours?.weekday_text || [];
  // const offset = data.result.utc_offset_minutes;
  return {
    hoursText: '', // weekdayText.join("\n"),
    hoursJson: [], // periods,
    timezone: 'UTC' // offsetToTimezone(offset)
  };
}

// TODO: Implement timezone conversion when needed
// function offsetToTimezone(offset: number): string {
//   // Simple mapping for common US timezones
//   switch (offset) {
//     case -300: return 'America/New_York';
//     case -360: return 'America/Chicago';
//     case -420: return 'America/Denver';
//     case -480: return 'America/Los_Angeles';
//     default: return 'UTC';
//   }
// }

// Modern Google Places API wrapper using the new Place API
export class ModernGooglePlacesAPI {
  private static instance: ModernGooglePlacesAPI;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private lastInitAttempt = 0;
  private readonly INIT_RETRY_DELAY = 60000; // 1 minute between retry attempts
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 300000; // 5 minutes default cache time
  private lastDiagnosticsRefresh = 0; // Throttle diagnostics logging
  // Lightweight diagnostics to help QA understand which path was used
  private diagnostics: {
    ready: boolean;
    hasPlaces: boolean;
    hasAutocompleteSuggestion: boolean;
    predictionStrategy: 'none' | 'modern-async' | 'modern-sync';
    detailsStrategy: 'none' | 'modern';
    timestamp: number;
  } = {
    ready: false,
    hasPlaces: false,
    hasAutocompleteSuggestion: false,
    predictionStrategy: 'none',
    detailsStrategy: 'none',
    timestamp: 0,
  };

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

  // Legacy fallbacks removed; modern-only implementation

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
      // Refresh diagnostics snapshot after load
      this.refreshDiagnostics('init');
    } catch (error) {
      console.error('[ModernGooglePlacesAPI] Failed to initialize:', error);
      throw error;
    }
  }

  // Update diagnostics snapshot based on current window.google
  private refreshDiagnostics(source: string = 'refresh'): void {
    try {
      const hasPlaces = !!(window as any)?.google?.maps?.places;
      const hasSuggestion = !!(window as any)?.google?.maps?.places?.AutocompleteSuggestion;
      this.diagnostics = {
        ...this.diagnostics,
        ready: !!(window as any)?.google?.maps,
        hasPlaces,
        hasAutocompleteSuggestion: hasSuggestion,
        timestamp: Date.now(),
      };
      // Only log diagnostics in development when explicitly enabled and not too frequently
      if (process.env.NODE_ENV === 'development' && 
          process.env.NEXT_PUBLIC_DEBUG_PLACES === 'true' && 
          source !== 'get') { // Skip logging for frequent 'get' calls
        // eslint-disable-next-line no-console

      }
    } catch {
      // ignore
    }
  }

  // Public getter for diagnostics
  getDiagnostics(): Readonly<typeof this.diagnostics> {
    // Throttle diagnostics refresh to avoid excessive logging
    const now = Date.now();
    if (!this.lastDiagnosticsRefresh || now - this.lastDiagnosticsRefresh > 1000) {
      this.refreshDiagnostics('get');
      this.lastDiagnosticsRefresh = now;
    }
    return this.diagnostics;
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
      
      const searchResults = await new Promise<google.maps.PlaceResult[]>((resolve, _reject) => {
        placesService.textSearch(searchRequest, (placeResults, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && placeResults) {
            resolve(placeResults);
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
          hasAutocompleteSuggestion: !!(window.google.maps.places as any)?.AutocompleteSuggestion
        });
      }
      
      // Try modern API first using importLibrary
      if ((window.google.maps as any).importLibrary) {
        try {
          if (process.env.NODE_ENV === 'development') {

          }
          
          // Try to get the places library first
          const places = await (window.google.maps as any).importLibrary('places');
          if (process.env.NODE_ENV === 'development') {

          }
          
          if (places && places.AutocompleteSuggestion) {
            if (process.env.NODE_ENV === 'development') {

            }
            
            // Create a session token for the request
            const sessionToken = new places.AutocompleteSessionToken();
            
            const request: any = {
              input,
              includedRegionCodes: options.country ? [options.country] : undefined,
              sessionToken
            };

            if (options.location && options.radius) {
              request.locationBias = {
                center: options.location,
                radius: options.radius
              };
            }

            if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PLACES === 'true') {

            }

            // Use the static fetchAutocompleteSuggestions method
            const result = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            const suggestions = result?.suggestions || [];
            
            if (suggestions.length > 0) {
              if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PLACES === 'true') {

              }
              
              // Convert modern suggestions to legacy format for compatibility
              const predictions = suggestions.map((suggestion: any) => {
                const placePrediction = suggestion.placePrediction;
                if (placePrediction) {
                  return {
                    place_id: placePrediction.placeId,
                    description: placePrediction.text || '',
                    structured_formatting: {
                      main_text: placePrediction.mainText?.text || '',
                      secondary_text: placePrediction.secondaryText?.text || ''
                    }
                  };
                }
                return null;
              }).filter(Boolean);
              
              this.diagnostics.predictionStrategy = 'modern-async';
              this.refreshDiagnostics('pred.modern-async');
              return predictions;
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

          }
          
          const AutocompleteSuggestion = (window.google.maps.places as any).AutocompleteSuggestion;
          const AutocompleteSessionToken = (window.google.maps.places as any).AutocompleteSessionToken;
          
          // Create a session token for the request
          const sessionToken = new AutocompleteSessionToken();
          
          const request: any = {
            input,
            includedRegionCodes: options.country ? [options.country] : undefined,
            sessionToken
          };

          if (options.location && options.radius) {
            request.locationBias = {
              center: options.location,
              radius: options.radius
            };
          }

          // Use the static fetchAutocompleteSuggestions method
          const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          const suggestions = result?.suggestions || [];
          
          if (suggestions.length > 0) {
            if (process.env.NODE_ENV === 'development') {

            }
            
            // Convert modern suggestions to legacy format for compatibility
            const predictions = suggestions.map((suggestion: any) => {
              const placePrediction = suggestion.placePrediction;
              if (placePrediction) {
                return {
                  place_id: placePrediction.placeId,
                  description: placePrediction.text || '',
                  structured_formatting: {
                    main_text: placePrediction.mainText?.text || '',
                    secondary_text: placePrediction.secondaryText?.text || ''
                  }
                };
              }
              return null;
            }).filter(Boolean);
            
            this.diagnostics.predictionStrategy = 'modern-async';
            this.refreshDiagnostics('pred.direct-async');
            return predictions;
          }
          return [];
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
            const AutocompleteSessionToken = (window.google.maps.places as any).AutocompleteSessionToken;
            
            // Create a session token for the request
            const sessionToken = new AutocompleteSessionToken();
            
            const request: any = {
              input,
              includedRegionCodes: options.country ? [options.country] : undefined,
              sessionToken
            };

            if (options.location && options.radius) {
              request.locationBias = {
                center: options.location,
                radius: options.radius
              };
            }

            // Use the static fetchAutocompleteSuggestions method
            AutocompleteSuggestion.fetchAutocompleteSuggestions(request).then((result: any) => {
              const suggestions = result?.suggestions || [];
              
              if (suggestions.length > 0) {
                // Convert modern suggestions to legacy format for compatibility
                const predictions = suggestions.map((suggestion: any) => {
                  const placePrediction = suggestion.placePrediction;
                  if (placePrediction) {
                    return {
                      place_id: placePrediction.placeId,
                      description: placePrediction.text || '',
                      structured_formatting: {
                        main_text: placePrediction.mainText?.text || '',
                        secondary_text: placePrediction.secondaryText?.text || ''
                      }
                    };
                  }
                  return null;
                }).filter(Boolean);
                
                this.diagnostics.predictionStrategy = 'modern-async';
                this.refreshDiagnostics('pred.modern-async-2');
                resolve(predictions);
              } else {
                resolve([]);
              }
            }).catch((error: any) => {
              console.warn('[ModernGooglePlacesAPI] Modern AutocompleteSuggestion failed:', error);
              resolve([]);
            });
          } catch (error) {
            console.warn('[ModernGooglePlacesAPI] Modern AutocompleteSuggestion failed:', error);
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    } catch (error) {
      console.error('[ModernGooglePlacesAPI] Error in getPlacePredictions:', error);
      return [];
    }
  }

  // Legacy autocomplete removed

  async getPlaceDetails(placeId: string, fields: string[] = ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'regularOpeningHours', 'website', 'formattedPhoneNumber', 'priceLevel']): Promise<any> {
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

    }

    try {
      // Use the modern Place API
      if ((window.google.maps.places as any).Place) {
        try {
          if (process.env.NODE_ENV === 'development') {

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
                return 'regularOpeningHours';
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

          }
          
          // Modern API: fetchFields populates the place instance; it does not return data
          await place.fetchFields({ fields: modernFields });

          const legacyResult: any = {};
          const displayName: any = (place as any).displayName;
          const formattedAddress: any = (place as any).formattedAddress;
          const formattedPhoneNumber: any = (place as any).formattedPhoneNumber;
          const regularOpeningHours: any = (place as any).regularOpeningHours;
          const priceLevel: any = (place as any).priceLevel;
          const userRatingCount: any = (place as any).userRatingCount;
          const location: any = (place as any).location;
          const addressComponents: any[] = (place as any).addressComponents;

          // Map fields to legacy-like keys
          if (displayName) { legacyResult.name = (displayName.text ?? displayName).toString(); }
          if (formattedAddress) { legacyResult.formatted_address = formattedAddress; }
          if (formattedPhoneNumber) { legacyResult.formatted_phone_number = formattedPhoneNumber; }
          if (regularOpeningHours) { legacyResult.opening_hours = regularOpeningHours; }
          if (priceLevel !== undefined) { legacyResult.price_level = priceLevel; }
          if (userRatingCount !== undefined) { legacyResult.user_ratings_total = userRatingCount; }
          if (location) { legacyResult.geometry = { location }; }

          if (addressComponents && Array.isArray(addressComponents)) {
            legacyResult.address_components = addressComponents.map((c: any) => ({
              long_name: c.long_name ?? c.longText ?? c.name ?? '',
              short_name: c.short_name ?? c.shortText ?? c.abbreviation ?? '',
              types: c.types ?? []
            }));
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[ModernGooglePlacesAPI] Result mapped from Place instance (modern):', legacyResult);
          }
          this.diagnostics.detailsStrategy = 'modern';
          this.refreshDiagnostics('details.modern');
          return legacyResult;
        } catch (_e) {
          if (process.env.NODE_ENV === 'development') {

          }
          return null;
        }
      } else {
        if (process.env.NODE_ENV === 'development') {

        }
        return null;
      }
    } catch (_error) {
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
