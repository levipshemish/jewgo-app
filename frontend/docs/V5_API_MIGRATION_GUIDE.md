# V5 API Migration Guide

## Overview

This guide explains how to migrate frontend code from legacy API endpoints to the new V5 unified API endpoints. The V5 API consolidates all entity types (restaurants, synagogues, mikvah, stores) into unified endpoints with improved performance, caching, and consistency.

## Key Changes

### 1. Unified Entity Endpoints

**Before (Legacy):**
```typescript
// Separate endpoints for each entity type
fetch('/api/restaurants')
fetch('/api/synagogues')
fetch('/api/mikvah')
fetch('/api/stores')
```

**After (V5):**
```typescript
// Single unified endpoint with entity type parameter
// Prefer explicit entity endpoints
fetch('/api/v5/restaurants')
fetch('/api/v5/synagogues')
fetch('/api/v5/mikvahs')
fetch('/api/v5/stores')
```

### 2. Unified Search

**Before (Legacy):**
```typescript
// Separate search endpoints
fetch('/api/restaurants/search?q=pizza')
fetch('/api/synagogues/search?q=orthodox')
```

**After (V5):**
```typescript
// Single search endpoint with entity type filter (backend expects q and types)
fetch('/v5/search?q=pizza&types=restaurants')
fetch('/v5/search?q=orthodox&types=synagogues')
```

### 3. Unified Admin Endpoints

**Before (Legacy):**
```typescript
// Separate admin endpoints
fetch('/api/admin/restaurants')
fetch('/api/admin/synagogues')
fetch('/api/admin/users')
```

**After (V5):**
```typescript
// Unified admin endpoints
fetch('/v5/admin/entities/restaurants')
fetch('/v5/admin/entities/synagogues')
fetch('/v5/admin/users')
```

## Migration Steps

### Step 1: Update API Configuration

The V5 API configuration is already set up in `frontend/lib/api/v5-api-config.ts`. This includes:

- V5 API endpoints
- Entity types
- Migration mapping
- Feature flags

### Step 2: Use V5 API Client

Replace direct fetch calls with the V5 API client:

```typescript
// Before
const response = await fetch('/api/restaurants');

// After
import { v5ApiClient } from '@/lib/api/v5-api-client';
const response = await v5ApiClient.getRestaurants();
```

### Step 3: Update Response Handling

V5 API responses have a consistent format:

```typescript
interface V5ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}
```

### Step 4: Update Existing API Files

#### Restaurants API (`frontend/lib/api/restaurants.ts`)

✅ **Already Updated** - Now uses V5 API with fallback to legacy

#### Synagogues API

Create or update `frontend/lib/api/synagogues.ts`:

```typescript
import { v5ApiClient, V5ApiResponse } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

export async function fetchSynagogues(params: any = {}): Promise<V5ApiResponse> {
  try {
    return await v5ApiClient.getSynagogues(params);
  } catch (error) {
    // Fallback to legacy API
    console.error('V5 API error, falling back to legacy API:', error);
    // ... legacy implementation
  }
}
```

#### Mikvah API

Create or update `frontend/lib/api/mikvah.ts`:

```typescript
import { v5ApiClient, V5ApiResponse } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

export async function fetchMikvah(params: any = {}): Promise<V5ApiResponse> {
  try {
    return await v5ApiClient.getMikvah(params);
  } catch (error) {
    // Fallback to legacy API
    console.error('V5 API error, falling back to legacy API:', error);
    // ... legacy implementation
  }
}
```

#### Stores API

Create or update `frontend/lib/api/stores.ts`:

```typescript
import { v5ApiClient, V5ApiResponse } from './v5-api-client';
import { V5_ENTITY_TYPES } from './v5-api-config';

export async function fetchStores(params: any = {}): Promise<V5ApiResponse> {
  try {
    return await v5ApiClient.getStores(params);
  } catch (error) {
    // Fallback to legacy API
    console.error('V5 API error, falling back to legacy API:', error);
    // ... legacy implementation
  }
}
```

### Step 5: Update Components

#### Using V5 API Client in Components

```typescript
// Before
const [restaurants, setRestaurants] = useState([]);
useEffect(() => {
  fetch('/api/restaurants')
    .then(res => res.json())
    .then(data => setRestaurants(data.restaurants));
}, []);

// After
import { v5ApiClient } from '@/lib/api/v5-api-client';
const [restaurants, setRestaurants] = useState([]);
useEffect(() => {
  v5ApiClient.getRestaurants()
    .then(response => {
      if (response.success) {
        setRestaurants(response.data.restaurants || response.data);
      }
    });
}, []);
```

#### Using Unified API Functions

```typescript
// Before
import { getUnifiedRestaurantData } from '@/lib/utils/unified-api';
const data = await getUnifiedRestaurantData({ page: 1, limit: 20 });

// After (already updated to use V5 endpoints)
import { getUnifiedRestaurantData } from '@/lib/utils/unified-api';
const data = await getUnifiedRestaurantData({ page: 1, limit: 20 });
```

### Step 6: Update Admin Components

#### Admin User Management

```typescript
// Before
fetch('/api/admin/users')

// After
import { v5ApiClient } from '@/lib/api/v5-api-client';
v5ApiClient.getAdminUsers()
```

#### Admin Entity Management

```typescript
// Before
fetch('/api/admin/restaurants')
fetch('/api/admin/synagogues')

// After
import { v5ApiClient } from '@/lib/api/v5-api-client';
v5ApiClient.getAdminEntities('restaurants')
v5ApiClient.getAdminEntities('synagogues')
```

### Step 7: Update Search Components

```typescript
// Before
fetch('/api/search?q=pizza')

// After
import { v5ApiClient } from '@/lib/api/v5-api-client';
v5ApiClient.search({ query: 'pizza' })
```

## Feature Flags

The V5 API migration uses feature flags for gradual rollout:

```typescript
// Environment variable
NEXT_PUBLIC_V5_API_ENABLED=true

// Or automatic in production
process.env.NODE_ENV === 'production'
```

## Error Handling

All V5 API calls include automatic fallback to legacy endpoints:

```typescript
try {
  // Try V5 API first
  const response = await v5ApiClient.getRestaurants();
  return response;
} catch (error) {
  console.error('V5 API error, falling back to legacy API:', error);
  // Fallback to legacy API
  return legacyApiCall();
}
```

## Testing

### 1. Test V5 API Endpoints

```bash
# Test entity endpoints
curl "https://api.jewgo.app/api/v5/restaurants"

# Test search endpoints
curl "https://api.jewgo.app/v5/search?q=pizza&types=restaurants"

# Test admin endpoints
curl "https://api.jewgo.app/v5/admin/entities/restaurants"

# Test monitoring endpoints
curl "https://api.jewgo.app/v5/monitoring/health"
```

### 2. Test Frontend Integration

1. Enable V5 API: `NEXT_PUBLIC_V5_API_ENABLED=true`
2. Test all entity pages (restaurants, synagogues, mikvah, stores)
3. Test search functionality
4. Test admin pages
5. Verify fallback behavior when V5 API is disabled

## Performance Benefits

The V5 API provides several performance improvements:

1. **Unified Caching**: Single cache layer for all entity types
2. **Reduced API Calls**: Consolidated endpoints reduce network requests
3. **Better Pagination**: Cursor-based pagination for large datasets
4. **ETag Caching**: Watermark-based ETag caching for better cache efficiency
5. **Request Deduplication**: Automatic deduplication of identical requests

## Monitoring

Monitor V5 API usage through:

1. **Backend Monitoring**: V5 monitoring endpoints provide real-time metrics
2. **Frontend Metrics**: Unified API client tracks performance metrics
3. **Error Tracking**: Automatic error reporting and fallback logging

## Rollback Plan

If issues arise with V5 API:

1. **Disable Feature Flag**: Set `NEXT_PUBLIC_V5_API_ENABLED=false`
2. **Automatic Fallback**: All components automatically fall back to legacy APIs
3. **Backend Rollback**: Use the rollout management system to disable V5 APIs

## Next Steps

1. ✅ Update restaurants API (completed)
2. 🔄 Update synagogues API
3. 🔄 Update mikvah API  
4. 🔄 Update stores API
5. 🔄 Update search components
6. 🔄 Update admin components
7. 🔄 Update monitoring components
8. 🔄 Test all functionality
9. 🔄 Enable V5 API in production

## Support

For questions or issues with the V5 API migration:

1. Check the V5 API configuration in `frontend/lib/api/v5-api-config.ts`
2. Review the V5 API client in `frontend/lib/api/v5-api-client.ts`
3. Test endpoints directly using the backend monitoring system
4. Check error logs for fallback behavior
