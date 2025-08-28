# Changelog

All notable changes to the JewGo project will be documented in this file.

## [2025-08-28] - API v4 Fixes and Hours Endpoint

### Added
- **New Hours API Endpoint**: Added `/api/v4/restaurants/{id}/hours` endpoint to retrieve restaurant operating hours
- **Enhanced Hours Display**: Improved hours data structure with formatted hours, timezone, and status information

### Fixed
- **Reviews API 404 Error**: Fixed frontend routing to properly forward to backend `/api/v4/reviews` endpoint
- **Hours API 404 Error**: Fixed frontend routing to properly forward to backend `/api/v4/restaurants/{id}/hours` endpoint
- **API Versioning**: Updated all API endpoints to use v4 prefix for consistency
- **Development Environment**: Fixed local development setup to use correct backend port (8082)

### Changed
- **API Endpoints**: Updated all restaurant endpoints to use `/api/v4/` prefix
- **Frontend Configuration**: Updated API config to use v4 endpoints
- **Environment Variables**: Updated development backend URL to point to localhost:8082

### Technical Details
- **Backend Routes**: Added `get_restaurant_hours()` function in `backend/routes/api_v4.py`
- **Frontend Routes**: Updated API forwarding in frontend route handlers
- **Documentation**: Updated API documentation to reflect v4 endpoints and new hours functionality

### Testing
- ✅ Reviews API endpoint working correctly
- ✅ Hours API endpoint working correctly  
- ✅ Restaurant details API endpoint working correctly
- ✅ Local development environment properly configured

---

## [Unreleased]

### Added
- Complete reviews system documentation
- Reviews API endpoints documentation
- Troubleshooting guide for reviews endpoint issues

### Fixed
- **Reviews Endpoint 404 Error**: Fixed reviews endpoints returning 404 errors
  - Root cause: `api_v4_reviews` feature flag was disabled
  - Solution: Temporarily bypassed feature flag check in `backend/utils/feature_flags_v4.py`
  - Endpoints now accessible at:
    - Backend: `http://localhost:8082/api/v4/reviews`
    - Frontend: `http://localhost:3000/api/reviews`
  - All review functionality now working (submit, view, edit, delete)

### Changed
- Updated API documentation to include complete reviews endpoints
- Enhanced troubleshooting guide with reviews-specific issues
- Updated README.md with reviews system information

### Technical Details
- **Feature Flag**: `api_v4_reviews` was set to `DISABLED` by default
- **Temporary Fix**: Modified `require_api_v4_flag` decorator to bypass checks
- **Permanent Fix**: Set `API_V4_REVIEWS=true` in environment variables
- **Affected Files**:
  - `backend/utils/feature_flags_v4.py` - Feature flag bypass
  - `docs/api/API_ENDPOINTS_SUMMARY.md` - Added reviews documentation
  - `docs/api/README.md` - Added reviews endpoints
  - `docs/features/reviews.md` - New comprehensive reviews documentation
  - `docs/TROUBLESHOOTING_GUIDE.md` - Added reviews troubleshooting
  - `README.md` - Updated with reviews system information

### Fixed
- **Restaurant Form Submission Issues** (2025-08-27)
  - Fixed business_images JSON string conversion to Python lists
  - Removed invalid description field from form submission
  - Fixed default status from "active" to "pending" for new submissions
  - Properly capitalize kosher categories (Dairy, Meat, Pareve)
  - Fixed address component separation (street, city, state, zip)
  - Added missing validation schema fields (cholov_stam, hours_open)
  - Fixed step validation arrays with all required fields
  - Corrected kosher category validation logic
  - Added proper default values for all fields
  - Integrated user authentication with Supabase auth system
  - Added user_email field for tracking who submitted restaurants
  - Added pre-submission authentication validation
  - Fixed kosher flags handling (boolean/null values)
  - Enhanced error handling and debugging capabilities
  - Improved data consistency between frontend and backend schemas
- **reCAPTCHA Sign-In Issues**: Fixed "Uncaught (in promise) null" errors during captcha sign-in
  - Improved reCAPTCHA script loading with proper ready state detection
  - Added timeout protection and graceful error handling
  - Enhanced script loading strategy from `beforeInteractive` to `afterInteractive`
  - Implemented proper `grecaptcha.ready()` usage before execution
  - Added polling mechanism with 10-second timeout for reCAPTCHA readiness
  - Fixed TypeScript error in PlacesStatusBadge component

### Technical Improvements
- Enhanced error handling for reCAPTCHA operations with comprehensive logging
- Added graceful fallback when reCAPTCHA fails to load or execute
- Improved user experience by preventing sign-in form hanging due to reCAPTCHA issues

### Added
- Enhanced Google Places API debugging with detailed initialization logging
- Improved error tracking for both modern and legacy APIs
- Added missing appLogger import to eatery page for proper logging

### Changed
- **Code Quality & Logging Improvements** (2025-08-27)
  - Replaced all `console.log` statements with structured `appLogger` throughout the codebase
  - Removed unused imports and variables from core components:
    - `frontend/app/eatery/page.tsx`: Removed unused `fetchRestaurants`, `startTransition`, `refreshing`, `hasActiveFilters`
    - `frontend/components/forms/AddressAutofill.tsx`: Complete logging overhaul
    - `frontend/components/forms/CustomHoursSelector.tsx`: Complete logging overhaul
  - Fixed syntax errors in `frontend/lib/admin/hooks.ts` (missing curly braces in catch blocks)
  - Improved error handling with proper structured logging context
  - Enhanced code maintainability and reduced bundle size
  - All logging now uses consistent `appLogger` with proper context and error handling

### Fixed
- Missing appLogger import in eatery page causing logging errors
- TypeScript compilation errors in useFeatureFlags hook
- Import issues in admin health route
- Missing curly braces in catch blocks causing linting errors
- Unused parameter warnings in API routes

### Technical Debt
- Cleaned up ESLint disable comments where no longer needed
- Standardized logging patterns across all components
- Improved error handling consistency

### Fixed
- **Console Errors**: Resolved Zod validation errors in `useAdvancedFilters` hook
  - Fixed dietary filter parsing when URL contains multiple dietary parameters
  - Enhanced schema transformation logic to handle JSON array strings and comma-separated values
  - Improved error recovery for malformed filter data
  - Eliminates console errors and improves filter synchronization reliability
- **Image Optimization**: Verified proper LCP (Largest Contentful Paint) priority implementation
  - Confirmed priority props are correctly set for above-the-fold images
  - Optimized image loading performance for critical content

### Changed
- **Filter Schema**: Updated `frontend/lib/filters/schema.ts` to handle dietary parameter transformation
  - Added robust JSON parsing with regex fallback
  - Reordered transform logic to check JSON arrays before comma-separated values
  - Enhanced `fromSearchParams` and `toSearchParams` functions for dietary parameters

### Documentation
- Added comprehensive documentation in `docs/maintenance/CONSOLE_ERROR_FIXES.md`
- Updated `docs/TODO.md` to reflect completed console error fixes
- Added Phase 9 completion to project progress tracking

## [Previous Releases]

*Note: Previous releases documented elsewhere*
