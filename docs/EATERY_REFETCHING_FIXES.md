# Eatery Page Refetching Fixes

## Problem Summary

The eatery page was experiencing excessive refetching due to several interconnected issues:

1. **Multiple useEffect dependencies causing cascading updates**
2. **URL state updates triggering unnecessary re-renders**
3. **Mobile optimization hook causing excessive re-renders**
4. **Location context updates triggering unnecessary re-renders**
5. **Infinite scroll state management causing unnecessary API calls**
6. **Lack of proper request deduplication and throttling**

## Implemented Fixes

### 1. Enhanced Request Deduplication

**File: `frontend/lib/hooks/useCombinedRestaurantData.ts`**

- Increased suppress window from 3000ms to 5000ms for better deduplication
- Added parameter-based deduplication to prevent identical requests
- Added `lastRequestParamsRef` to track request parameters
- Enhanced duplicate detection logic

```typescript
// Additional deduplication: check if request parameters are identical
const currentRequestParams = { page, query, filters, itemsPerPage };
const lastRequestParams = lastRequestParamsRef.current;
const isIdenticalRequest = lastRequestParams && 
  lastRequestParams.page === page &&
  lastRequestParams.query === query &&
  lastRequestParams.itemsPerPage === itemsPerPage &&
  JSON.stringify(lastRequestParams.filters) === JSON.stringify(filters);
```

### 2. Request Throttling

**File: `frontend/app/eatery/EateryPageClient.tsx`**

- Added request throttling mechanism with 30 requests per minute limit
- Implemented sliding window throttling
- Added throttling checks in main fetch effect

```typescript
const isRequestThrottled = useCallback(() => {
  const now = Date.now();
  const { lastRequest, requestCount } = requestThrottleRef.current;
  
  // Reset counter if window has passed
  if (now - lastRequest > THROTTLE_WINDOW_MS) {
    requestThrottleRef.current = { lastRequest: now, requestCount: 1 };
    return false;
  }
  
  // Check if we're over the limit
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }
  
  // Increment counter
  requestThrottleRef.current.requestCount += 1;
  return false;
}, []);
```

### 3. Enhanced Debouncing

**File: `frontend/app/eatery/EateryPageClient.tsx`**

- Increased main fetch debounce from 150ms to 300ms
- Added additional safety checks for rapid update cycles
- Enhanced debouncing logic to prevent hydration-induced calls

```typescript
// Additional safety check: prevent fetching if we're in a rapid update cycle
if (lastApiCallRef.current && Date.now() - lastApiCallRef.current.timestamp < 1000) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚫 Skipping fetch - too soon after last API call');
  }
  return;
}
```

### 4. Mobile Optimization Hook Optimization

**File: `frontend/lib/mobile-optimization.ts`**

- Increased debounce from 150ms to 300ms
- Added state change detection to prevent unnecessary updates
- Only update state when values actually change

```typescript
// Only update state if values actually changed to prevent unnecessary re-renders
const newIsMobile = isMobileDevice();
const newIsTouch = isTouchDevice();
const newPixelRatio = getDevicePixelRatio();
const newViewportHeight = window.innerHeight;
const newViewportWidth = window.innerWidth;

// Only update state if values actually changed
if (newIsMobile !== isMobile) setIsMobile(newIsMobile);
if (newIsTouch !== isTouch) setIsTouch(newIsTouch);
if (newPixelRatio !== pixelRatio) setPixelRatio(newPixelRatio);
if (newViewportHeight !== viewportHeight) setViewportHeight(newViewportHeight);
if (newViewportWidth !== viewportWidth) setViewportWidth(newViewportWidth);
```

### 5. Location Context Optimization

**File: `frontend/lib/contexts/LocationContext.tsx`**

- Added data change detection to prevent unnecessary localStorage writes
- Only save when data actually changes
- Added debug logging for skipped saves

```typescript
// Only save if the data actually changed to prevent unnecessary localStorage writes
const existingData = localStorage.getItem(LOCATION_STORAGE_KEY);
if (existingData) {
  try {
    const parsed = JSON.parse(existingData);
    // Check if data is actually different before saving
    if (JSON.stringify(parsed) === JSON.stringify(locationData)) {
      if (DEBUG) { debugLog('📍 LocationContext: Skipping save - data unchanged'); }
      return;
    }
  } catch {
    // If parsing fails, continue with save
  }
}
```

### 6. Infinite Scroll Optimization

**File: `frontend/lib/hooks/useInfiniteScroll.ts`**

- Added minimum time between requests (500ms)
- Enhanced safety checks to prevent excessive loading
- Added request throttling for rapid successive requests

```typescript
// Additional safety: prevent rapid successive requests
const now = Date.now();
if (lastAppendAtRef.current && (now - lastAppendAtRef.current) < 500) { // 500ms minimum between requests
  if (process.env.NODE_ENV === 'development') {
    console.log('🚫 Skipping request - too soon after last append:', now - lastAppendAtRef.current);
  }
  return;
}
```

## Performance Improvements

### Before Fixes
- Multiple API calls triggered by single user action
- Excessive re-renders due to mobile optimization updates
- Unnecessary localStorage writes
- Rapid successive infinite scroll requests
- No request throttling or deduplication

### After Fixes
- Single API call per user action (with proper deduplication)
- Reduced re-renders through optimized state updates
- Minimal localStorage writes (only when data changes)
- Controlled infinite scroll requests with proper throttling
- Comprehensive request throttling and deduplication

## Monitoring and Debugging

The fixes include comprehensive logging for development environments:

- Request deduplication logs
- Request throttling logs
- Infinite scroll safety logs
- Mobile optimization update logs
- Location context save logs

## Testing Recommendations

1. **Test rapid filter changes** - Ensure only one API call is made
2. **Test mobile orientation changes** - Verify reduced re-renders
3. **Test infinite scroll** - Ensure proper throttling and safety limits
4. **Test location permission changes** - Verify minimal localStorage writes
5. **Monitor API call frequency** - Should be significantly reduced

## Future Improvements

1. **Add request caching** - Implement React Query or SWR for better caching
2. **Add request queuing** - Queue requests during high-frequency periods
3. **Add performance metrics** - Track and monitor refetch frequency
4. **Add user preference settings** - Allow users to control update frequency
5. **Add offline support** - Cache data for offline viewing

## Conclusion

These fixes address the root causes of excessive refetching by implementing:

- **Request deduplication** at multiple levels
- **Request throttling** with configurable limits
- **Enhanced debouncing** for user interactions
- **Optimized state updates** to prevent unnecessary re-renders
- **Comprehensive logging** for debugging and monitoring

The eatery page should now have significantly improved performance with reduced API calls and better user experience.
