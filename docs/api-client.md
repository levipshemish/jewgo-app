# API Client Documentation

## Overview

The JewGo app uses a comprehensive API client system built on top of the v5 backend API. The client provides type-safe, cached, and optimized access to all entity endpoints with built-in error handling and retry logic.

## Architecture

### Core Components

1. **V5ApiClient** - Main API client class
2. **Entity-specific clients** - Restaurant, Synagogue, Mikvah clients
3. **Unified API utilities** - Common API functions
4. **Error handling** - Comprehensive error management
5. **Caching layer** - Request deduplication and caching

## API Client Classes

### V5ApiClient

The main API client that handles all v5 API requests.

```typescript
import { V5ApiClient } from '@/lib/api/v5-api-client';

const client = new V5ApiClient({
  baseUrl: 'https://api.jewgo.app',
  timeout: 10000,
  retries: 3
});
```

#### Methods

##### getEntities(entityType, filters, pagination)
Generic method for fetching entities with filtering and pagination.

```typescript
const restaurants = await client.getEntities('restaurants', {
  kosher_category: 'Meat',
  city: 'Miami'
}, {
  limit: 20,
  page: 1,
  includeFilterOptions: true
});
```

##### getRestaurants(filters, pagination)
Restaurant-specific method with normalized filters.

```typescript
const restaurants = await client.getRestaurants({
  kosher_category: 'Meat',
  hoursFilter: 'openNow',
  userLocation: { latitude: 25.7617, longitude: -80.1918 }
}, {
  limit: 20,
  includeFilterOptions: true
});
```

### Entity-Specific Clients

#### Restaurant Client
```typescript
import { restaurantApi } from '@/lib/api/restaurants';

// Get restaurants with filters
const restaurants = await restaurantApi.getRestaurants({
  kosher_category: 'Meat',
  agency: 'Kosher Miami',
  priceRange: [1, 2]
});

// Get filter options
const filterOptions = await restaurantApi.getFilterOptions();
```

#### Synagogue Client
```typescript
import { synagogueApi } from '@/lib/api/synagogues';

// Get synagogues with filters
const synagogues = await synagogueApi.getSynagogues({
  denomination: 'orthodox',
  shulType: 'traditional',
  has_daily_minyan: true
});
```

#### Mikvah Client
```typescript
import { mikvahApi } from '@/lib/api/mikvahs';

// Get mikvahs with filters
const mikvahs = await mikvahApi.getMikvahs({
  appointment_required: true,
  status: 'active'
});
```

## Filter System

### Filter Types

#### Restaurant Filters
```typescript
interface RestaurantFilters {
  // Kosher filters
  kosher_category?: 'Meat' | 'Dairy' | 'Pareve';
  agency?: string;
  kosherDetails?: string;
  
  // Business filters
  priceRange?: [number, number];
  hoursFilter?: 'openNow' | 'morning' | 'afternoon' | 'evening' | 'lateNight';
  
  // Location filters
  latitude?: number;
  longitude?: number;
  radius?: number;
  
  // Common filters
  city?: string;
  state?: string;
  ratingMin?: number;
}
```

#### Synagogue Filters
```typescript
interface SynagogueFilters {
  // Religious filters
  denomination?: 'orthodox' | 'conservative' | 'reform' | 'reconstructionist';
  shulType?: 'traditional' | 'chabad' | 'orthodox' | 'sephardic';
  shulCategory?: 'ashkenazi' | 'chabad' | 'sephardic';
  
  // Service filters
  has_daily_minyan?: boolean;
  has_shabbat_services?: boolean;
  has_holiday_services?: boolean;
  
  // Facility filters
  has_parking?: boolean;
  has_kiddush_facilities?: boolean;
  has_social_hall?: boolean;
  has_library?: boolean;
  has_hebrew_school?: boolean;
  has_disabled_access?: boolean;
}
```

#### Mikvah Filters
```typescript
interface MikvahFilters {
  // Appointment filters
  appointment_required?: boolean;
  walk_in_available?: boolean;
  
  // Status filters
  status?: 'active' | 'inactive' | 'pending';
  
  // Contact filters
  contact_person?: string;
  
  // Facility filters
  is_currently_open?: boolean;
  private_entrance?: boolean;
}
```

### Filter Options

All entity types return filter options that can be used to populate filter UI components.

```typescript
interface FilterOptions {
  // Common options
  cities: string[];
  states: string[];
  ratings: number[];
  
  // Entity-specific options
  agencies?: string[];           // Restaurants
  kosherCategories?: string[];   // Restaurants
  denominations?: string[];      // Synagogues
  shulTypes?: string[];         // Synagogues
  appointmentRequired?: string[]; // Mikvahs
  statuses?: string[];          // Mikvahs
}
```

## Pagination

### Page-based Pagination
```typescript
const pagination = {
  page: 1,
  limit: 20,
  includeFilterOptions: true
};
```

### Cursor-based Pagination
```typescript
const pagination = {
  cursor: 'eyJpZCI6MTIzfQ==',
  limit: 20,
  includeFilterOptions: true
};
```

## Error Handling

### Error Types
```typescript
enum V5ApiErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  RATE_LIMITED = 'rate_limited'
}
```

### Error Handling Example
```typescript
try {
  const restaurants = await client.getRestaurants(filters);
} catch (error) {
  if (error instanceof V5ApiError) {
    switch (error.type) {
      case V5ApiErrorType.NETWORK:
        // Handle network error
        break;
      case V5ApiErrorType.RATE_LIMITED:
        // Handle rate limiting
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Caching

### Request Deduplication
The API client automatically deduplicates identical requests to prevent unnecessary API calls.

### Cache Configuration
```typescript
const client = new V5ApiClient({
  baseUrl: 'https://api.jewgo.app',
  cache: {
    ttl: 300000, // 5 minutes
    maxSize: 100
  }
});
```

## Performance Optimization

### Lazy Loading
Filter options are loaded on-demand to improve initial page load performance.

### Background Prefetching
The client can prefetch data in the background for better user experience.

### Request Batching
Multiple requests can be batched together to reduce network overhead.

## Usage Examples

### Basic Entity Fetching
```typescript
import { apiClient } from '@/lib/api/index-v5';

// Get restaurants
const restaurants = await apiClient.getEntities('restaurants', {}, {
  limit: 20,
  includeFilterOptions: true
});

// Get synagogues with filters
const synagogues = await apiClient.getEntities('synagogues', {
  denomination: 'orthodox',
  city: 'Miami'
}, {
  limit: 10
});
```

### Advanced Filtering
```typescript
// Complex restaurant filters
const restaurantFilters = {
  kosher_category: 'Meat',
  agency: 'Kosher Miami',
  hoursFilter: 'openNow',
  priceRange: [1, 2],
  ratingMin: 4.0,
  userLocation: {
    latitude: 25.7617,
    longitude: -80.1918
  }
};

const restaurants = await apiClient.getRestaurants(restaurantFilters, {
  limit: 20,
  includeFilterOptions: true
});
```

### Filter Options
```typescript
// Get filter options for UI
const filterOptions = await apiClient.getEntities('restaurants', {}, {
  limit: 1,
  includeFilterOptions: true
});

console.log(filterOptions.filterOptions);
// {
//   agencies: ['Kosher Miami', 'ORB'],
//   kosherCategories: ['Meat', 'Dairy', 'Pareve'],
//   cities: ['Miami', 'Fort Lauderdale'],
//   states: ['FL']
// }
```

## Best Practices

### 1. Use Entity-Specific Methods
Prefer entity-specific methods over generic `getEntities` when possible for better type safety.

### 2. Handle Errors Gracefully
Always wrap API calls in try-catch blocks and provide fallback behavior.

### 3. Use Filter Options
Fetch filter options when needed to populate UI components.

### 4. Implement Loading States
Show loading indicators while API calls are in progress.

### 5. Cache Results
Use the built-in caching to avoid unnecessary API calls.

### 6. Optimize Pagination
Use appropriate pagination strategies based on your use case.

## Testing

### Mock API Client
```typescript
import { MockV5ApiClient } from '@/lib/api/__mocks__/v5-api-client';

const mockClient = new MockV5ApiClient();
mockClient.mockGetRestaurants(mockRestaurantData);
```

### Integration Tests
```typescript
import { apiClient } from '@/lib/api/index-v5';

describe('API Client', () => {
  it('should fetch restaurants with filters', async () => {
    const restaurants = await apiClient.getRestaurants({
      kosher_category: 'Meat'
    });
    
    expect(restaurants.data).toBeDefined();
    expect(restaurants.data.length).toBeGreaterThan(0);
  });
});
```

## Migration Guide

### From v4 to v5
1. Update import paths to use v5 API client
2. Update filter parameter names
3. Update response structure handling
4. Update error handling for new error types

### Breaking Changes
- Filter parameter names have changed
- Response structure has been updated
- Error types have been reorganized
- Pagination format has changed
