// Barrel file for types exports
// This provides stable entry points for commonly used types

export * from '../lib/types/restaurant';
export * from '../lib/types/marketplace';
export * from '../lib/validators/review';

// Analytics and tracking types
export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  url: string;
  referrer?: string;
  userAgent?: string;
  props?: Record<string, string | number | boolean>;
  domain?: string;
}

// Feedback types
export interface FeedbackData {
  id: string;
  type: 'bug' | 'feature' | 'general' | 'restaurant';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userEmail?: string;
  restaurantId?: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'general' | 'restaurant';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userEmail?: string;
  restaurantId?: number;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter types - moved to lib/filters/filters.types.ts
// export interface FilterState {
//   agency?: string;
//   dietary?: string;
//   openNow?: boolean;
//   category?: string;
//   nearMe?: boolean;
//   distanceRadius?: number;
//   maxDistance?: number;
//   priceRange?: string;
//   rating?: number;
//   searchQuery?: string;
//   userLocation?: UserLocation;
// }

// export type FilterValue = string | boolean | number | undefined;

// Location types
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

// Google Places types
export interface GooglePlacesHours {
  open_now: boolean;
  periods: Array<{
    close: { day: number; time: string };
    open: { day: number; time: string };
  }>;
  weekday_text: string[];
}

export interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: GooglePlacesHours;
  website?: string;
  formatted_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
}

export interface GooglePlacesResponse {
  results: GooglePlacesResult[];
  status: string;
  next_page_token?: string;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Performance monitoring types
export interface PerformanceEvent {
  id: string;
  category: 'navigation' | 'component' | 'api' | 'database' | 'error';
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Notification types
export interface NotificationPreference {
  id: string;
  category: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  enabled: boolean;
}

// Order types
export interface OrderData {
  restaurantId: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  pickupTime?: string;
  specialInstructions?: string;
}

// Utility types
export interface SafeArrayResult<T> {
  data: T[];
  error?: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
} 