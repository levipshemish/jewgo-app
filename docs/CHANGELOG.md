# Changelog

All notable changes to the Jewgo project will be documented in this file.

## [Unreleased]

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
