# TypeScript Type Replacement - Stage 2: Systematic Type Replacement

## Overview

This document outlines the completion of Stage 2 of the systematic type replacement initiative, which focused on creating proper type definitions for external libraries and systematically replacing `as any` usage throughout the codebase.

## Phase 2.1: External Library Types ✅

### Google Maps API Types

**File**: `frontend/lib/types/external-libraries.ts`

Created comprehensive type definitions for Google Maps API:

- `GoogleMapsWindow` - Extended Window interface for Google Maps
- `ModernGooglePlacesAPI` - Modern Google Places API types
- `AutocompleteSuggestionRequest` - Request interface for autocomplete
- `AutocompleteSuggestionResponse` - Response interface for autocomplete
- `GooglePlaceInstance` - Place instance interface

**Type Guards**:
- `isGoogleMapsAvailable()` - Check if Google Maps is loaded
- `safeGetGoogleMaps()` - Safe access to Google Maps instance

### Analytics API Types

**File**: `frontend/lib/types/external-libraries.ts`

Created comprehensive type definitions for Analytics:

- `AnalyticsWindow` - Extended Window interface for analytics
- Complete analytics method signatures
- Google Analytics (gtag) integration types

**Type Guards**:
- `isAnalyticsAvailable()` - Check if analytics is available
- `isGtagAvailable()` - Check if Google Analytics is available
- `safeGetAnalytics()` - Safe access to analytics instance
- `safeGetGtag()` - Safe access to Google Analytics

### Supabase Auth Types

**File**: `frontend/lib/types/external-libraries.ts`

Created comprehensive type definitions for Supabase authentication:

- `SupabaseUser` - User interface from Supabase
- `SupabaseAuthResponse` - Authentication response interface
- `SupabaseSession` - Session interface
- `SupabaseError` - Error interface
- `TransformedUser` - Transformed user interface for internal use

### Additional External Library Types

- **Sentry Error Tracking**: `SentryWindow`, `isSentryAvailable()`, `safeGetSentry()`
- **reCAPTCHA**: `ReCaptchaWindow`, `isReCaptchaAvailable()`, `safeGetReCaptcha()`
- **Performance API**: `PerformanceMemory`, `ExtendedPerformance`, `isPerformanceMemoryAvailable()`
- **Form Validation**: `ZodError`, `isZodError()`

## Phase 2.2: Replace as any Systematically ✅

### Files Updated

#### 1. Analytics Component (`frontend/components/analytics/Analytics.tsx`)

**Changes**:
- Replaced `(window as any).analytics` with `safeGetAnalytics()`
- Replaced `(window as any).gtag` with `safeGetGtag()`
- Removed local type guards in favor of centralized ones
- Updated global type declarations to extend `AnalyticsWindow`

**Before**:
```typescript
const isAnalyticsAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         'analytics' in window && 
         typeof (window as any).analytics === 'object';
};
```

**After**:
```typescript
import { isAnalyticsAvailable, safeGetAnalytics } from '@/lib/types/external-libraries';

const analytics = safeGetAnalytics();
if (analytics?.trackEvent) {
  analytics.trackEvent(eventName, properties);
}
```

#### 2. Google Places (`frontend/lib/google/places.ts`)

**Changes**:
- Replaced `(window as any).google` with `safeGetGoogleMaps()`
- Updated cache typing from `unknown` to `GooglePlacesResult[]`
- Improved type safety in diagnostics refresh

**Before**:
```typescript
const hasPlaces = !!(window as any)?.google?.maps?.places;
```

**After**:
```typescript
const googleMaps = safeGetGoogleMaps();
const hasPlaces = !!googleMaps?.maps?.places;
```

#### 3. Authentication Pages

**Signin Page** (`frontend/app/auth/signin/page.tsx`):
- Replaced `(window as any).grecaptcha` with `safeGetReCaptcha()`
- Updated type guards to use centralized `isReCaptchaAvailable()`

**Signup Page** (`frontend/app/auth/signup/page.tsx`):
- Replaced `(window as any).grecaptcha` with `safeGetReCaptcha()`
- Updated type guards to use centralized `isReCaptchaAvailable()`

#### 4. CSRF Hook (`frontend/hooks/useCSRF.ts`)

**Changes**:
- Created `CSRFWindow` interface
- Replaced `(window as any).__CSRF_TOKEN__` with typed access

**Before**:
```typescript
const token = (window as any).__CSRF_TOKEN__;
```

**After**:
```typescript
interface CSRFWindow extends Window {
  __CSRF_TOKEN__?: string;
}
const token = (window as CSRFWindow).__CSRF_TOKEN__;
```

#### 5. API Routes

**Restaurants Search** (`frontend/app/api/restaurants/search/route.ts`):
- Replaced `(data as any)` with proper type checking
- Updated filter functions to use `unknown` with type assertions

**Admin Reviews** (`frontend/app/api/admin/reviews/route.ts`):
- Replaced `(error as any).name === 'ZodError'` with `isZodError(error)`
- Updated error handling to use centralized type guards

## Phase 2.3: API Response Types ✅

### Standardized API Response Types

**File**: `frontend/lib/utils/type-safe-wrappers.ts`

Created comprehensive API response type definitions:

- `ApiResponseWrapper<T>` - Base API response interface
- `PaginatedApiResponse<T>` - Paginated response interface

### Type-Safe API Data Extraction

**Functions Created**:
- `safeExtractApiData<T>()` - Safely extract data from various API response shapes
- `safeExtractSingleItem<T>()` - Safely extract single items from API responses

**Usage Example**:
```typescript
const { data, total } = safeExtractApiData(response, []);
const restaurant = safeExtractSingleItem(response, null);
```

## Type-Safe Wrappers Created ✅

### Window Object Wrappers

**AnalyticsWrapper**:
- `isAvailable()` - Check availability
- `getInstance()` - Get analytics instance
- `trackEvent()`, `trackError()`, `trackPerformance()` - Type-safe methods

**GtagWrapper**:
- `isAvailable()` - Check availability
- `getInstance()` - Get gtag instance
- `track()`, `event()` - Type-safe methods

**SentryWrapper**:
- `isAvailable()` - Check availability
- `getInstance()` - Get Sentry instance
- `captureException()`, `captureMessage()` - Type-safe methods

**ReCaptchaWrapper**:
- `isAvailable()` - Check availability
- `getInstance()` - Get reCAPTCHA instance
- `execute()`, `ready()` - Type-safe methods

**PerformanceWrapper**:
- `isMemoryAvailable()` - Check memory API availability
- `getMemoryInfo()` - Get memory information
- `getUsedMemory()` - Get used memory

### Error Handling Wrappers

**ErrorWrapper**:
- `isZodError()` - Check if error is ZodError
- `getErrorMessage()` - Extract error message
- `getErrorCode()` - Extract error code
- `isPrismaError()` - Check if error is Prisma error

### Validation Wrappers

**ValidationWrapper**:
- `validateEmail()` - Email validation
- `validatePhone()` - Phone validation
- `validateUrl()` - URL validation
- `validateRequired()` - Required field validation

### Array and Object Wrappers

**ArrayWrapper**:
- `safeFilter()` - Type-safe array filtering
- `safeMap()` - Type-safe array mapping
- `safeFind()` - Type-safe array finding
- `safeLength()` - Type-safe length checking
- `safeIncludes()` - Type-safe includes checking

**ObjectWrapper**:
- `safeGet()` - Safe object property access
- `safeSet()` - Safe object property setting
- `safeHas()` - Safe object property checking

## Benefits Achieved

### 1. Type Safety
- Eliminated runtime type errors through compile-time checking
- Improved IntelliSense and autocomplete
- Better error detection during development

### 2. Code Maintainability
- Centralized type definitions for external libraries
- Consistent error handling patterns
- Reusable type-safe wrappers

### 3. Developer Experience
- Better IDE support with proper type information
- Clear interfaces for external library usage
- Reduced cognitive load when working with external APIs

### 4. Runtime Safety
- Type guards prevent runtime errors
- Safe access patterns for window objects
- Graceful fallbacks when external libraries are unavailable

## Migration Statistics

### Files Updated: 8
1. `frontend/components/analytics/Analytics.tsx`
2. `frontend/lib/google/places.ts`
3. `frontend/app/auth/signin/page.tsx`
4. `frontend/app/auth/signup/page.tsx`
5. `frontend/hooks/useCSRF.ts`
6. `frontend/app/api/restaurants/search/route.ts`
7. `frontend/app/api/admin/reviews/route.ts`
8. `frontend/types/index.ts`

### New Files Created: 2
1. `frontend/lib/types/external-libraries.ts` - External library type definitions
2. `frontend/lib/utils/type-safe-wrappers.ts` - Type-safe wrapper utilities

### `as any` Usages Replaced: 15+
- Window object access patterns
- API response handling
- Error type checking
- External library integration

## Best Practices Implemented

### 1. Type Guards
- Centralized type checking functions
- Runtime safety with compile-time benefits
- Consistent patterns across the codebase

### 2. Safe Access Patterns
- Null-safe property access
- Graceful fallbacks for missing functionality
- Error handling for external library failures

### 3. Interface Composition
- Extended Window interface for external libraries
- Reusable type definitions
- Clear separation of concerns

### 4. Error Handling
- Type-safe error checking
- Consistent error message extraction
- Proper error type identification

## Future Recommendations

### 1. Continuous Monitoring
- Regular audits for new `as any` usage
- ESLint rules to prevent regression
- Type coverage monitoring

### 2. Documentation
- Keep this document updated as new types are added
- Document external library integration patterns
- Maintain type definition examples

### 3. Team Training
- Educate team on type-safe patterns
- Share best practices for external library integration
- Encourage use of type-safe wrappers

### 4. Testing
- Add type checking to CI/CD pipeline
- Test type-safe wrappers with various scenarios
- Validate external library integration

## Conclusion

Stage 2 of the systematic type replacement has been successfully completed. The codebase now has:

- Comprehensive type definitions for all external libraries
- Type-safe wrappers for common patterns
- Systematic replacement of `as any` usage
- Improved developer experience and code maintainability

The foundation is now in place for continued type safety improvements and the elimination of remaining `as any` usage throughout the codebase.
