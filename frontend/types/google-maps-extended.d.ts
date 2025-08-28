// Extended Google Maps type definitions to replace `any` usage
// This extends the existing google-maps.d.ts with more specific types

declare global {
  interface Window {
    google: typeof google;
    analytics?: {
      track?: (event: string, properties?: Record<string, unknown>) => void;
      trackUserEngagement?: (action: string, properties?: Record<string, unknown>) => void;
      trackEvent?: (event: string, properties?: Record<string, unknown>) => void;
      trackFeedbackSubmission?: (type: string, restaurantId: string, properties?: Record<string, unknown>) => void;
    };
    gtag?: (command: string, event: string, properties?: Record<string, unknown>) => void;
    Sentry?: {
      captureException?: (error: Error, context?: Record<string, unknown>) => void;
      captureMessage?: (message: string, context?: Record<string, unknown>) => void;
    };
  }
}

// Extend existing Google Maps API types
declare namespace google.maps {
  // Extend the existing Maps interface to include importLibrary
  interface Maps {
    importLibrary?: (library: string) => Promise<unknown>;
  }

  // Extend PlaceResult with additional properties
  interface PlaceResult {
    rating?: number;
    user_ratings_total?: number;
    // Additional properties that might be present
    [key: string]: unknown;
  }
}

declare namespace google.maps.places {
  // Extend the existing Places interface
  interface Places {
    AutocompleteSuggestion?: {
      new(): AutocompleteSuggestion;
      fetchAutocompleteSuggestions(request: AutocompleteSuggestionRequest): Promise<AutocompleteSuggestionResult>;
    };
    AutocompleteSessionToken?: {
      new(): AutocompleteSessionToken;
    };
    Place?: {
      new(placeId: string): Place;
    };
  }

  // Add new interfaces for modern API
  interface AutocompleteSessionToken {
    // Session token for rate limiting
  }

  interface AutocompleteSuggestion {
    placePrediction?: {
      placeId: string;
      text?: string;
      mainText?: {
        text: string;
      };
      secondaryText?: {
        text: string;
      };
    };
  }

  interface AutocompleteSuggestionRequest {
    input: string;
    includedRegionCodes?: string[];
    sessionToken: AutocompleteSessionToken;
    locationBias?: {
      center: { lat: number; lng: number };
      radius: number;
    };
  }

  interface AutocompleteSuggestionResult {
    suggestions: AutocompleteSuggestion[];
  }

  interface Place {
    displayName?: {
      text: string;
    };
    formattedAddress?: string;
    formattedPhoneNumber?: string;
    regularOpeningHours?: {
      periods: Array<{
        open: {
          day: number;
          time: string;
        };
        close: {
          day: number;
          time: string;
        };
      }>;
    };
    priceLevel?: string;
    userRatingCount?: number;
    location?: {
      latitude: number;
      longitude: number;
    };
    addressComponents?: Array<{
      longText?: string;
      shortText?: string;
      long_name?: string;
      short_name?: string;
      types: string[];
    }>;
  }
}

// Performance API extensions
interface Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Navigator API extensions
interface Navigator {
  getBattery?: () => Promise<BatteryManager>;
  connection?: NetworkInformation;
}

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface NetworkInformation {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export {};
