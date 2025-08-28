/**
 * Comprehensive Google Places API Type Definitions
 * 
 * This module provides complete type safety for Google Places API operations,
 * including search, autocomplete, and place details functionality.
 */

// Core Google Places API Response Types
export interface GooglePlacesApiResponse<T> {
  status: GooglePlacesStatus;
  error_message?: string;
  html_attributions?: string[];
  next_page_token?: string;
  results?: T[];
  result?: T;
}

export type GooglePlacesStatus = 
  | 'OK'
  | 'ZERO_RESULTS'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

// Place Search Result Types
export interface GooglePlacesSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  opening_hours?: GooglePlacesHours;
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
  photos?: GooglePlacesPhoto[];
  reviews?: GooglePlacesReview[];
  url?: string;
  vicinity?: string;
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  permanently_closed?: boolean;
  plus_code?: {
    compound_code?: string;
    global_code: string;
  };
  scope?: 'APP' | 'GOOGLE';
  reference?: string;
  id?: string;
}

// Place Details Result Types
export interface GooglePlacesDetailsResult extends GooglePlacesSearchResult {
  address_components?: GooglePlacesAddressComponent[];
  adr_address?: string;
  editorial_summary?: {
    language: string;
    overview: string;
  };
  formatted_phone_number?: string;
  geometry: {
    location: { lat: number; lng: number };
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  international_phone_number?: string;
  name: string;
  opening_hours?: GooglePlacesHours;
  photos?: GooglePlacesPhoto[];
  place_id: string;
  plus_code?: {
    compound_code?: string;
    global_code: string;
  };
  price_level?: number;
  rating?: number;
  reviews?: GooglePlacesReview[];
  types: string[];
  url?: string;
  user_ratings_total?: number;
  utc_offset_minutes?: number;
  vicinity?: string;
  website?: string;
  wheelchair_accessible_entrance?: boolean;
}

// Autocomplete Prediction Types
export interface GooglePlacesAutocompletePrediction {
  description: string;
  matched_substrings: Array<{
    length: number;
    offset: number;
  }>;
  place_id: string;
  reference: string;
  structured_formatting: {
    main_text: string;
    main_text_matched_substrings: Array<{
      length: number;
      offset: number;
    }>;
    secondary_text: string;
  };
  terms: Array<{
    offset: number;
    value: string;
  }>;
  types: string[];
}

// Hours and Schedule Types
export interface GooglePlacesHours {
  open_now: boolean;
  periods: GooglePlacesPeriod[];
  weekday_text: string[];
  special_days?: GooglePlacesSpecialDay[];
}

export interface GooglePlacesPeriod {
  close: {
    day: number;
    time: string;
  };
  open: {
    day: number;
    time: string;
  };
}

export interface GooglePlacesSpecialDay {
  date: string;
  exceptional_hours: boolean;
}

// Photo Types
export interface GooglePlacesPhoto {
  height: number;
  html_attributions: string[];
  photo_reference: string;
  width: number;
}

// Review Types
export interface GooglePlacesReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  translated?: boolean;
}

// Address Component Types
export interface GooglePlacesAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Search Request Types
export interface GooglePlacesSearchRequest {
  location?: { lat: number; lng: number };
  radius?: number;
  keyword?: string;
  language?: string;
  minprice?: number;
  maxprice?: number;
  name?: string;
  opennow?: boolean;
  rankby?: 'prominence' | 'distance';
  type?: string;
  types?: string[];
  pagetoken?: string;
}

export interface GooglePlacesTextSearchRequest {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
  language?: string;
  minprice?: number;
  maxprice?: number;
  opennow?: boolean;
  type?: string;
  types?: string[];
  pagetoken?: string;
}

export interface GooglePlacesNearbySearchRequest {
  location: { lat: number; lng: number };
  radius?: number;
  keyword?: string;
  language?: string;
  minprice?: number;
  maxprice?: number;
  name?: string;
  opennow?: boolean;
  rankby?: 'prominence' | 'distance';
  type?: string;
  types?: string[];
  pagetoken?: string;
}

// Details Request Types
export interface GooglePlacesDetailsRequest {
  place_id: string;
  fields?: string[];
  language?: string;
  region?: string;
  sessiontoken?: string;
  reviews_no_translations?: boolean;
  reviews_sort?: 'most_relevant' | 'newest';
}

// Autocomplete Request Types
export interface GooglePlacesAutocompleteRequest {
  input: string;
  sessiontoken?: string;
  offset?: number;
  location?: { lat: number; lng: number };
  radius?: number;
  language?: string;
  types?: string[];
  components?: string[];
  strictbounds?: boolean;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
}

// Find Place Request Types
export interface GooglePlacesFindPlaceRequest {
  input: string;
  inputtype: 'textquery' | 'phonenumber';
  fields: string[];
  locationbias?: 'ipbias' | 'point' | 'circle' | 'rectangle';
  location?: { lat: number; lng: number };
  radius?: number;
  language?: string;
}

// API Client Configuration Types
export interface GooglePlacesApiConfig {
  apiKey: string;
  libraries?: string[];
  version?: string;
  language?: string;
  region?: string;
}

// Error Types
export interface GooglePlacesApiError {
  status: GooglePlacesStatus;
  error_message: string;
  code?: number;
}

// Cache Types for Google Places
export interface GooglePlacesCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// Utility Types
export type GooglePlacesSearchType = 
  | 'accounting'
  | 'airport'
  | 'amusement_park'
  | 'aquarium'
  | 'art_gallery'
  | 'atm'
  | 'bakery'
  | 'bank'
  | 'bar'
  | 'beauty_salon'
  | 'bicycle_store'
  | 'book_store'
  | 'bowling_alley'
  | 'bus_station'
  | 'cafe'
  | 'car_dealer'
  | 'car_rental'
  | 'car_repair'
  | 'car_wash'
  | 'casino'
  | 'cemetery'
  | 'church'
  | 'city_hall'
  | 'clothing_store'
  | 'convenience_store'
  | 'courthouse'
  | 'dentist'
  | 'department_store'
  | 'doctor'
  | 'drugstore'
  | 'electrician'
  | 'electronics_store'
  | 'embassy'
  | 'fire_station'
  | 'florist'
  | 'funeral_home'
  | 'furniture_store'
  | 'gas_station'
  | 'gym'
  | 'hair_care'
  | 'hardware_store'
  | 'hindu_temple'
  | 'home_goods_store'
  | 'hospital'
  | 'insurance_agency'
  | 'jewelry_store'
  | 'laundry'
  | 'lawyer'
  | 'library'
  | 'light_rail_station'
  | 'liquor_store'
  | 'local_government_office'
  | 'locksmith'
  | 'lodging'
  | 'meal_delivery'
  | 'meal_takeaway'
  | 'mosque'
  | 'movie_rental'
  | 'movie_theater'
  | 'moving_company'
  | 'museum'
  | 'night_club'
  | 'painter'
  | 'park'
  | 'parking'
  | 'pet_store'
  | 'pharmacy'
  | 'physiotherapist'
  | 'plumber'
  | 'police'
  | 'post_office'
  | 'primary_school'
  | 'real_estate_agency'
  | 'restaurant'
  | 'roofing_contractor'
  | 'rv_park'
  | 'school'
  | 'secondary_school'
  | 'shoe_store'
  | 'shopping_mall'
  | 'spa'
  | 'stadium'
  | 'storage'
  | 'store'
  | 'subway_station'
  | 'supermarket'
  | 'synagogue'
  | 'taxi_stand'
  | 'tourist_attraction'
  | 'train_station'
  | 'transit_station'
  | 'travel_agency'
  | 'university'
  | 'veterinary_care'
  | 'zoo';

// Enhanced Result Types for JewGo Specific Use Cases
export interface JewGoPlacesResult extends GooglePlacesSearchResult {
  kosher_rating?: number;
  kosher_certification?: string;
  dietary_restrictions?: string[];
  is_kosher?: boolean;
  distance_from_user?: number;
  formatted_distance?: string;
}

// API Response Wrapper Types
export interface GooglePlacesSearchResponse extends GooglePlacesApiResponse<GooglePlacesSearchResult> {
  results: GooglePlacesSearchResult[];
}

export interface GooglePlacesDetailsResponse extends GooglePlacesApiResponse<GooglePlacesDetailsResult> {
  result: GooglePlacesDetailsResult;
}

export interface GooglePlacesAutocompleteResponse extends GooglePlacesApiResponse<GooglePlacesAutocompletePrediction> {
  predictions: GooglePlacesAutocompletePrediction[];
}

// Modern Places API Types (for the new Places API)
export interface ModernPlacesApiPlace {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  types: string[];
  photos?: ModernPlacesApiPhoto[];
  editorialSummary?: {
    text: string;
    languageCode: string;
  };
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  priceLevel?: 'FREE' | 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE';
  websiteUri?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  addressComponents?: ModernPlacesApiAddressComponent[];
  plusCode?: {
    compoundCode?: string;
    globalCode: string;
  };
  utcOffsetMinutes?: number;
  viewport?: {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };
}

export interface ModernPlacesApiPhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export interface ModernPlacesApiAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
  languageCode: string;
}

// Conversion utilities for backward compatibility
export function convertModernPlaceToLegacy(modernPlace: ModernPlacesApiPlace): GooglePlacesSearchResult {
  return {
    place_id: modernPlace.id,
    name: modernPlace.displayName.text,
    formatted_address: modernPlace.formattedAddress,
    geometry: {
      location: {
        lat: modernPlace.location?.latitude || 0,
        lng: modernPlace.location?.longitude || 0
      }
    },
    rating: modernPlace.rating,
    user_ratings_total: modernPlace.userRatingCount,
    types: modernPlace.types,
    website: modernPlace.websiteUri,
    formatted_phone_number: modernPlace.nationalPhoneNumber,
    international_phone_number: modernPlace.internationalPhoneNumber,
    price_level: modernPlace.priceLevel ? 
      (modernPlace.priceLevel === 'FREE' ? 0 :
       modernPlace.priceLevel === 'INEXPENSIVE' ? 1 :
       modernPlace.priceLevel === 'MODERATE' ? 2 :
       modernPlace.priceLevel === 'EXPENSIVE' ? 3 : 4) : undefined,
    business_status: modernPlace.businessStatus,
    // utc_offset_minutes: modernPlace.utcOffsetMinutes // Not available in base interface
  };
}
