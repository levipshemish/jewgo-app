# Unified API System Documentation

## Overview

The unified API system provides consistent, optimized API calls across all pages in the application. It implements request deduplication, intelligent caching, error handling, and performance monitoring to ensure stable, limited API calls throughout the application.

## Key Features

### 1. Request Deduplication
- Prevents duplicate API calls for identical requests
- Reuses in-flight promises for concurrent identical requests
- Reduces server load and improves client performance

### 2. Intelligent Caching
- In-memory caching with configurable TTL
- Different cache durations for different data types:
  - **Restaurants**: 2 minutes (frequently changing)
  - **Synagogues**: 5 minutes (less frequently changing)
  - **Marketplace**: 30 seconds (very frequently changing)
  - **Mikvah**: 5 minutes (rarely changing)
- Automatic cache cleanup for expired entries

### 3. Error Handling & Retry Logic
- Automatic retry on failure (configurable attempts)
- Exponential backoff for retry delays
- Graceful fallback responses
- Comprehensive error logging

### 4. Performance Monitoring
- Request timing metrics
- Cache hit/miss tracking
- Error rate monitoring
- Performance data included in responses

## Architecture

### Core Components

#### 1. Unified API Utility (`/lib/utils/unified-api.ts`)
```typescript
// Main unified API call function
unifiedApiCall<T>(url: string, options?: UnifiedApiOptions): Promise<UnifiedApiResponse<T>>

// Specialized functions for different data types
getUnifiedRestaurantData(params: Record<string, any>): Promise<UnifiedApiResponse>
getUnifiedSynagogueData(params: Record<string, any>): Promise<UnifiedApiResponse>
getUnifiedMarketplaceData(params: Record<string, any>): Promise<UnifiedApiResponse>
getUnifiedShtelData(params: Record<string, any>): Promise<UnifiedApiResponse>
getUnifiedMikvahData(params: Record<string, any>): Promise<UnifiedApiResponse>
```

#### 2. Request Deduplication (`/lib/utils/request-deduplication.ts`)
```typescript
// Deduplicated fetch function
deduplicatedFetch<T>(url: string, options?: RequestInit): Promise<T>

// Cache management
clearDeduplicationCache(): void
getPendingRequestCount(): number
```

#### 3. Unified API Routes
- `/api/restaurants/unified` - Restaurant data with filters and pagination
- `/api/synagogues/unified` - Synagogue data with filters and pagination
- `/api/marketplace/unified` - Marketplace listings with filters and pagination
- `/api/shtel-listings/unified` - Shtel listings with filters and pagination
- `/api/mikvah/unified` - Mikvah data with filters and pagination

## Implementation Details

### Unified API Options
```typescript
interface UnifiedApiOptions {
  ttl?: number;                    // Cache TTL in milliseconds
  deduplicate?: boolean;           // Enable request deduplication
  cacheKey?: string;              // Custom cache key
  timeout?: number;               // Request timeout in milliseconds
  retry?: boolean;                // Enable retry on failure
  retryAttempts?: number;         // Number of retry attempts
  retryDelay?: number;            // Retry delay in milliseconds
}
```

### Unified API Response
```typescript
interface UnifiedApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  cached?: boolean;
  performance?: {
    requestTime: number;
    cacheHit: boolean;
    retryCount: number;
  };
}
```

## Usage Examples

### Basic Usage
```typescript
import { unifiedApiCall } from '@/lib/utils/unified-api';

const result = await unifiedApiCall('/api/restaurants/unified?limit=20', {
  ttl: 2 * 60 * 1000,
  deduplicate: true,
  retry: true,
  retryAttempts: 2,
});

if (result.success) {
  console.log('Data:', result.data);
  console.log('Cached:', result.cached);
  console.log('Performance:', result.performance);
}
```

### Specialized Functions
```typescript
import { getUnifiedRestaurantData } from '@/lib/utils/unified-api';

const result = await getUnifiedRestaurantData({
  limit: 20,
  city: 'Miami',
  kosher_category: 'dairy',
  lat: 25.7617,
  lng: -80.1918,
  max_distance_mi: 10
});
```

### Component Integration
```typescript
// In a React component
const { unifiedApiCall } = await import('@/lib/utils/unified-api');

const fetchData = useCallback(async () => {
  const result = await unifiedApiCall('/api/restaurants/unified', {
    ttl: 2 * 60 * 1000,
    deduplicate: true,
  });
  
  if (result.success) {
    setData(result.data);
  }
}, []);
```

## Updated Components

### 1. Grid Component (`/components/core/grids/Grid.tsx`)
- Updated to use unified endpoints based on data type
- Implements intelligent caching per data type
- Includes performance metrics in responses

### 2. ProductResults Component (`/components/products/ProductResults.tsx`)
- Uses unified restaurant API endpoint
- Converts filters to URL parameters
- Maintains SWR integration with unified API

### 3. Page Components
- **Marketplace Page** (`/app/marketplace/page.tsx`)
- **Shtel Page** (`/app/shtel/page.tsx`)
- **Mikvah Page** (`/app/mikvah/page.tsx`)
- All updated to use unified API endpoints

### 4. API Routes
- **Restaurants Route** (`/app/api/restaurants/route.ts`)
- Updated to use unified API call internally
- Maintains backward compatibility

## Performance Benefits

### 1. Reduced API Calls
- Request deduplication prevents duplicate calls
- Intelligent caching reduces redundant requests
- Unified endpoints combine multiple data sources

### 2. Improved Response Times
- Cache hits provide instant responses
- Retry logic handles temporary failures
- Performance monitoring identifies bottlenecks

### 3. Better User Experience
- Consistent loading states
- Graceful error handling
- Reduced network traffic

## Monitoring & Debugging

### Performance Metrics
```typescript
import { getUnifiedApiMetrics } from '@/lib/utils/unified-api';

const metrics = getUnifiedApiMetrics();
console.log('Request count:', metrics.requestCount);
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Cache size:', metrics.cacheSize);
console.log('Errors:', metrics.errors);
```

### Cache Management
```typescript
import { clearUnifiedApiCache } from '@/lib/utils/unified-api';

// Clear all cached data
clearUnifiedApiCache();
```

### Request Deduplication
```typescript
import { getPendingRequestCount } from '@/lib/utils/request-deduplication';

// Get number of pending requests
const pendingCount = getPendingRequestCount();
console.log('Pending requests:', pendingCount);
```

## Backend Integration

### Unified Backend Endpoint (Recommended)
The system is designed to work with a unified backend endpoint:
```
GET /api/v4/restaurants/unified
```

This endpoint should return:
```json
{
  "success": true,
  "restaurants": [...],
  "filterOptions": {...},
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Fallback Support
If the unified backend endpoint is not available, the system falls back to separate API calls:
- `/api/restaurants-with-images`
- `/api/restaurants/filter-options`

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app
```

### Cache Configuration
```typescript
const CACHE_CONFIG = {
  DEFAULT_TTL: 2 * 60 * 1000,    // 2 minutes
  LONG_TTL: 5 * 60 * 1000,       // 5 minutes
  SHORT_TTL: 30 * 1000,          // 30 seconds
};
```

## Best Practices

### 1. Use Appropriate Cache TTL
- Frequently changing data: 30 seconds - 2 minutes
- Moderately changing data: 2-5 minutes
- Rarely changing data: 5-10 minutes

### 2. Enable Request Deduplication
- Always enable for identical requests
- Use custom cache keys for complex scenarios

### 3. Handle Errors Gracefully
- Check `result.success` before accessing data
- Provide fallback UI for failed requests
- Log errors for debugging

### 4. Monitor Performance
- Track cache hit rates
- Monitor request times
- Identify slow endpoints

## Migration Guide

### From Direct Fetch Calls
```typescript
// Before
const response = await fetch('/api/restaurants');
const data = await response.json();

// After
const { unifiedApiCall } = await import('@/lib/utils/unified-api');
const result = await unifiedApiCall('/api/restaurants/unified');
if (result.success) {
  const data = result.data;
}
```

### From SWR with Custom Fetcher
```typescript
// Before
const fetcher = async (url: string) => {
  const response = await fetch(url);
  return response.json();
};

// After
const fetcher = async (url: string) => {
  const { unifiedApiCall } = await import('@/lib/utils/unified-api');
  const result = await unifiedApiCall(url);
  return result.success ? result.data : null;
};
```

## Troubleshooting

### Common Issues

#### 1. Cache Not Working
- Check if TTL is set correctly
- Verify cache key generation
- Clear cache if needed: `clearUnifiedApiCache()`

#### 2. Request Deduplication Not Working
- Ensure identical URLs and options
- Check if deduplication is enabled
- Verify request timing

#### 3. Performance Issues
- Monitor cache hit rates
- Check request timing metrics
- Identify slow backend endpoints

#### 4. Error Handling
- Check `result.success` before accessing data
- Review error messages in console
- Verify backend endpoint availability

## Future Enhancements

### 1. Persistent Caching
- Add localStorage/sessionStorage support
- Implement cache persistence across sessions

### 2. Advanced Retry Logic
- Implement exponential backoff
- Add circuit breaker pattern

### 3. Real-time Updates
- Add WebSocket support for live data
- Implement cache invalidation strategies

### 4. Analytics Integration
- Add detailed performance analytics
- Implement user behavior tracking

## Conclusion

The unified API system provides a robust, scalable solution for managing API calls across the application. It significantly reduces redundant requests, improves performance, and provides consistent error handling. The system is designed to be backward compatible while offering advanced features for optimal performance.

For questions or issues, refer to the troubleshooting section or check the performance metrics to identify bottlenecks.
