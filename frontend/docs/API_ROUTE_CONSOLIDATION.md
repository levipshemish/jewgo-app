# API Route Consolidation Summary

## Overview
This document summarizes the consolidation of API routes from v4 endpoints to standard endpoints to simplify the API architecture and eliminate duplication.

## Problem
The application had two sets of API endpoints:
- **Legacy endpoints**: `/api/restaurants`, `/api/synagogues`, etc.
- **V4 endpoints**: `/api/v4/restaurants`, `/api/v4/synagogues`, etc.

This created confusion and maintenance overhead with duplicate functionality.

## Solution
Consolidated all API usage to use the standard endpoints (without v4 prefix) since the current API is working well and the v4 routes should be deprecated.

## Changes Made

### 1. API Configuration Updates ✅

**File**: `lib/api-config.ts`
- Updated `RESTAURANTS` from `/api/v4/restaurants` to `/api/restaurants`
- Updated `RESTAURANT_DETAILS` from `/api/v4/restaurants/${id}` to `/api/restaurants/${id}`
- Updated `REVIEWS` from `/api/v4/reviews` to `/api/reviews`
- Updated `STATISTICS` from `/api/v4/statistics` to `/api/statistics`

### 2. Cursor Pagination Updates ✅

**File**: `lib/config/cursorPagination.constants.ts`
- Updated `RESTAURANTS` from `/api/v4/restaurants/keyset/list` to `/api/restaurants/keyset/list`
- Updated `HEALTH` from `/api/v4/restaurants/keyset/health` to `/api/restaurants/keyset/health`

**File**: `lib/hooks/useCursorPagination.ts`
- Updated hook documentation to reference standard routes
- Updated API call URL from `/api/v4/restaurants/keyset/list` to `/api/restaurants/keyset/list`

### 3. Unified API Updates ✅

**File**: `lib/utils/unified-api.ts`
- Updated synagogues URL from `/api/v4/synagogues/unified` to `/api/synagogues/unified`
- Updated mikvah URL from `/api/v4/mikvah` to `/api/mikvah`

### 4. Service Layer Updates ✅

**File**: `services/dataManager.ts`
- Updated restaurant API call from `/api/v4/restaurants` to `/api/restaurants`

### 5. Page Component Updates ✅

**File**: `app/mikvah/page.tsx`
- Updated mikvah API call from `/api/v4/mikvah/unified` to `/api/mikvah/unified`

**File**: `app/shuls/[id]/page.tsx`
- Updated reviews API call from `/api/v4/reviews` to `/api/reviews`
- Updated synagogue details API call from `/api/v4/synagogues/${id}` to `/api/synagogues/${id}`

**File**: `app/eatery/[id]/page.tsx`
- Updated reviews API call from `/api/v4/reviews` to `/api/reviews`

## API Route Architecture

### Current Standard Routes (Recommended)
```
/api/restaurants              - Restaurant listings and CRUD
/api/restaurants/{id}         - Individual restaurant details
/api/restaurants/{id}/view    - Track restaurant views
/api/restaurants/filter-options - Restaurant filter options
/api/restaurants/unified      - Unified restaurant data
/api/synagogues               - Synagogue listings and CRUD
/api/synagogues/{id}          - Individual synagogue details
/api/synagogues/unified       - Unified synagogue data
/api/mikvah                   - Mikvah listings and CRUD
/api/mikvah/{id}              - Individual mikvah details
/api/mikvah/unified           - Unified mikvah data
/api/reviews                  - Reviews for restaurants/synagogues
/api/marketplace              - Marketplace listings
/api/stores                   - Store listings
```

### Deprecated V4 Routes (To be removed)
```
/api/v4/restaurants           - ❌ Deprecated
/api/v4/synagogues            - ❌ Deprecated
/api/v4/mikvah                - ❌ Deprecated
/api/v4/reviews               - ❌ Deprecated
/api/v4/marketplace           - ❌ Deprecated
```

## Benefits of Consolidation

1. **Simplified Architecture**: Single set of API endpoints instead of duplicates
2. **Reduced Maintenance**: No need to maintain two sets of similar endpoints
3. **Clearer Documentation**: One clear API structure to document
4. **Better Performance**: No confusion about which endpoint to use
5. **Easier Debugging**: Single code path for each functionality

## Next Steps

1. **Backend Cleanup**: Remove v4 route implementations from backend
2. **Documentation Update**: Update API documentation to reflect standard routes only
3. **Testing**: Ensure all functionality works with standard routes
4. **Monitoring**: Monitor for any remaining v4 route usage

## Files Modified

### Configuration Files
- `lib/api-config.ts`
- `lib/config/cursorPagination.constants.ts`

### Utility Files
- `lib/hooks/useCursorPagination.ts`
- `lib/utils/unified-api.ts`
- `services/dataManager.ts`

### Page Components
- `app/mikvah/page.tsx`
- `app/shuls/[id]/page.tsx`
- `app/eatery/[id]/page.tsx`

## Verification

To verify the consolidation is working:

1. **Check API calls**: All frontend components should now use standard routes
2. **Test functionality**: Ensure all features work as expected
3. **Monitor logs**: Check for any remaining v4 route calls
4. **Performance**: Verify no performance degradation

## Migration Complete ✅

All frontend components have been updated to use standard API routes. The v4 routes are now deprecated and should be removed from the backend in a future cleanup.
