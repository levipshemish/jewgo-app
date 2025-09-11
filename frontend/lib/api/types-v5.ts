/**
 * Comprehensive TypeScript type definitions for v5 API.
 * 
 * This file consolidates all type definitions for the v5 API client,
 * providing strong typing for all entities, responses, and operations.
 */

// ============================================================================
// Core API Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  status: number;
  headers?: Record<string, string>;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    cursor?: string;
    next_cursor?: string;
    has_more: boolean;
    total_count?: number;
    page?: number;
    per_page?: number;
  };
  metadata?: {
    total_count?: number;
    filters_applied?: Record<string, any>;
    sort_key?: string;
    entity_type?: string;
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTtl?: number;
  headers?: Record<string, string>;
  body?: any;
  retry?: boolean;
  idempotencyKey?: string;
  abortSignal?: AbortSignal;
}

export interface SortOptions {
  key: string;
  direction: 'asc' | 'desc';
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'restaurants' | 'synagogues' | 'mikvahs' | 'stores';

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
  sort?: string;
}

export interface EntityFilters {
  search?: string;
  status?: string;
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  createdAfter?: string;
  updatedAfter?: string;
  // Entity-specific filters
  cuisine_type?: string;
  price_range?: number;
  kosher_certification?: string;
  denomination?: string;
  services?: string;
  store_type?: string;
  specialties?: string;
  appointment_required?: boolean;
  // Custom filters for extensibility
  customFilters?: Record<string, string | number | boolean>;
}

export interface BaseEntity {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  status: 'active' | 'inactive' | 'pending' | 'deleted';
  created_at: string;
  updated_at: string;
  entity_type?: EntityType;
  api_version?: string;
  distance_km?: number;
}

// ============================================================================
// Restaurant Types
// ============================================================================

export interface Restaurant extends BaseEntity {
  description?: string;
  cuisine_type?: string;
  price_range?: 1 | 2 | 3 | 4;
  kosher_certification?: string;
  operating_hours?: OperatingHours;
  features?: string[];
  menu_url?: string;
  reservation_url?: string;
  delivery_options?: DeliveryOption[];
  average_rating?: number;
  total_reviews?: number;
  is_currently_open?: boolean;
  next_opening?: string;
  google_places_id?: string;
  photos?: RestaurantPhoto[];
  review_summary?: ReviewSummary;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface DeliveryOption {
  provider: string;
  url?: string;
  minimum_order?: number;
  delivery_fee?: number;
  estimated_time?: string;
}

export interface RestaurantPhoto {
  id: number;
  url: string;
  alt_text?: string;
  is_primary?: boolean;
  source?: 'user' | 'google' | 'restaurant';
}

// ============================================================================
// Synagogue Types
// ============================================================================

export interface Synagogue extends BaseEntity {
  description?: string;
  denomination?: string;
  rabbi_name?: string;
  services?: string[];
  operating_hours?: OperatingHours;
  accessibility_features?: string[];
  languages?: string[];
  programs?: SynagogueProgram[];
  is_currently_open?: boolean;
  prayer_times?: PrayerTimes;
  jewish_calendar?: JewishCalendarInfo;
  contact_person?: string;
}

export interface SynagogueProgram {
  name: string;
  description?: string;
  schedule?: string;
  contact?: string;
}

export interface PrayerTimes {
  date: string;
  shacharit?: string;
  mincha?: string;
  maariv?: string;
  shabbat_start?: string;
  shabbat_end?: string;
  candle_lighting?: string;
  havdalah?: string;
  jewish_calendar?: JewishCalendarInfo;
}

export interface JewishCalendarInfo {
  hebrew_date?: string;
  hebrew_year?: number;
  hebrew_month?: number;
  hebrew_day?: number;
  hebrew_month_name?: string;
  is_holiday?: boolean;
  events?: string[];
}

// ============================================================================
// Mikvah Types
// ============================================================================

export interface Mikvah extends BaseEntity {
  contact_person?: string;
  operating_hours?: OperatingHours;
  features?: string[];
  supervision?: string;
  appointment_required?: boolean;
  is_currently_open?: boolean;
  next_opening?: string;
  available_slots?: TimeSlot[];
  jewish_calendar?: JewishCalendarInfo;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  available: boolean;
}

// ============================================================================
// Store Types
// ============================================================================

export interface Store extends BaseEntity {
  description?: string;
  owner_name?: string;
  owner_email?: string;
  store_type?: 'marketplace' | 'grocery' | 'bakery' | 'butcher' | 'judaica';
  operating_hours?: OperatingHours;
  specialties?: string[];
  kosher_certification?: string;
  payment_methods?: string[];
  shipping_options?: string[];
  enable_ecommerce?: boolean;
  ecommerce_settings?: EcommerceSettings;
  is_currently_open?: boolean;
  inventory_summary?: InventorySummary;
  review_summary?: ReviewSummary;
}

export interface EcommerceSettings {
  currency?: string;
  tax_rate?: string;
  free_shipping_threshold?: string;
  inventory_notifications?: boolean;
  order_notifications?: boolean;
  payment_processing?: boolean;
  shipping_zones?: string[];
  return_policy_days?: number;
}

export interface InventorySummary {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  categories: string[];
}

// ============================================================================
// Review Types
// ============================================================================

export interface Review {
  id: number;
  rating: number;
  content: string;
  title?: string;
  user_name?: string;
  user_id?: number;
  is_verified?: boolean;
  visit_date?: string;
  tags?: string[];
  would_recommend?: boolean;
  helpful_votes: number;
  total_votes: number;
  is_edited?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  created_at: string;
  updated_at?: string;
  user_vote?: 'helpful' | 'not_helpful';
}

export interface ReviewSummary {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  verified_reviews: number;
  recent_reviews: number;
}

export interface CreateReviewData {
  rating: number;
  content: string;
  title?: string;
  visit_date?: string;
  tags?: string[];
  would_recommend?: boolean;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResponse {
  query?: string;
  total_results: number;
  returned_results: number;
  results_by_type?: Record<EntityType, any[]>;
  all_results: any[];
  search_metadata: {
    entity_types_searched: EntityType[];
    location?: LocationFilter;
    search_radius_km?: number;
    timestamp: string;
  };
  facets?: Record<string, SearchFacet[]>;
}

export interface SearchSuggestion {
  value: string;
  entity_type?: EntityType;
  score?: number;
}

export interface SearchFacet {
  value?: string;
  count?: number;
  range?: string;
}

export interface LocationFilter {
  latitude: number;
  longitude: number;
  radius?: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
  id: number;
  email: string;
  name: string;
  roles: string[];
  is_verified: boolean;
  email_verified: boolean;
  created_at?: string;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  session_id?: string;
  message?: string;
  password_strength?: 'weak' | 'medium' | 'strong';
}

// ============================================================================
// Admin Types
// ============================================================================

export interface SystemHealth {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealth>;
  database: DatabaseHealth;
  redis: RedisHealth;
  performance: PerformanceMetrics;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  error?: string;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  connection_count?: number;
  query_performance?: number;
  storage_usage?: number;
  error?: string;
}

export interface RedisHealth {
  status: 'healthy' | 'unhealthy';
  memory_usage?: string;
  connected_clients?: number;
  ops_per_sec?: number;
  error?: string;
}

export interface PerformanceMetrics {
  request_count_last_hour: number;
  error_rate_last_hour: number;
  avg_response_time_ms: number;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface MetricsResponse {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'slow' | 'unhealthy';
  uptime_seconds?: number;
  version: string;
  metrics: {
    requests_last_minute: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
    cache_hit_rate_percent: number;
  };
  error?: string;
}

export interface MetricsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  topErrors: Array<{ error: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  timeRange: { start: number; end: number };
}

export interface PublicStats {
  total_entities: Record<EntityType, number>;
  activity_last_24h: {
    api_requests: number;
    search_queries: number;
    unique_visitors: number;
  };
  performance: {
    avg_response_time_ms: number;
    uptime_percent: number;
  };
  last_updated: string;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

export interface CacheOptions {
  ttl?: number;
  etag?: string;
  tags?: string[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
  details?: any;
  retry_after?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ============================================================================
// Feature Flag Types
// ============================================================================

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rollout_percentage?: number;
  user_targeting?: {
    roles?: string[];
    user_ids?: number[];
  };
  dependencies?: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export type SortKey = 
  | 'created_at_desc' 
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'name_asc'
  | 'name_desc'
  | 'rating_desc'
  | 'rating_asc'
  | 'distance_asc'
  | 'relevance_desc';

export interface FilterOptions {
  search?: string;
  status?: string;
  category?: string;
  location?: LocationFilter;
  created_after?: string;
  updated_after?: string;
  rating_min?: number;
  rating_max?: number;
  price_range?: number[];
  features?: string[];
  [key: string]: any;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  sort?: SortKey;
  page?: number;
  per_page?: number;
}

// ============================================================================
// Request/Response Helpers
// ============================================================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  method?: ApiMethod;
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  cacheTtl?: number;
  retry?: boolean;
  timeout?: number;
  idempotencyKey?: string;
  abortSignal?: AbortSignal;
}

export interface ApiClientMetric {
  type: 'success' | 'error' | 'cache_hit';
  endpoint: string;
  duration: number;
  statusCode?: number;
  error?: string;
  timestamp: number;
  method?: string;
  outcome?: string;
  userId?: number;
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Core types are already exported above
};

// Common type exports for convenience
const CommonTypes = {
  // Types are already exported above as interfaces/types
  // This is just for convenience if needed
};

export default CommonTypes;