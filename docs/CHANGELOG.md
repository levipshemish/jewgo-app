# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

<!-- Add previous release notes here -->
