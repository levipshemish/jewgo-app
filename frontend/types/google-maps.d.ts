declare global {
  interface Window {
    google: any;
  }
}

declare namespace google {
  namespace maps {
    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletionRequest,
        callback: (predictions: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
      ): void;
    }

    class PlacesService {
      constructor(attrContainer: HTMLDivElement | google.maps.Map);
      getDetails(
        request: PlaceDetailsRequest,
        callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void
      ): void;
    }

    interface AutocompletionRequest {
      input: string;
      types?: string[];
      componentRestrictions?: ComponentRestrictions;
    }

    interface ComponentRestrictions {
      country: string | string[];
    }

    interface AutocompletePrediction {
      place_id: string;
      description: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
    }

    interface PlaceDetailsRequest {
      placeId: string;
      fields: string[];
    }

    interface PlaceResult {
      address_components?: AddressComponent[];
      formatted_address?: string;
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      NOT_FOUND = 'NOT_FOUND',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }
  }
}

export {};
