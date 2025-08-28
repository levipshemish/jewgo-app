// Google Places API Type Definitions
export interface GooglePlaceResult {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GooglePlaceDetails {
  place_id: string;
  name?: string;
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  // Legacy/alternative property names
  formattedAddress?: string;
  displayName?: string;
  addressComponents?: GoogleAddressComponent[];
}

export interface GooglePlacesAPI {
  getPlaceDetails: (placeId: string, fields: string[]) => Promise<GooglePlaceDetails | null>;
  getAutocompletePredictions: (input: string, options: {
    types: string[];
    country: string;
  }) => Promise<GooglePlaceResult[]>;
}

// Type guard functions
export function isGooglePlaceResult(obj: unknown): obj is GooglePlaceResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'place_id' in obj &&
    'description' in obj &&
    typeof (obj as GooglePlaceResult).place_id === 'string' &&
    typeof (obj as GooglePlaceResult).description === 'string'
  );
}

export function isGooglePlaceDetails(obj: unknown): obj is GooglePlaceDetails {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'place_id' in obj &&
    typeof (obj as GooglePlaceDetails).place_id === 'string'
  );
}

export function isGoogleAddressComponent(obj: unknown): obj is GoogleAddressComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'long_name' in obj &&
    'short_name' in obj &&
    'types' in obj &&
    Array.isArray((obj as GoogleAddressComponent).types)
  );
}
