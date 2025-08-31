# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-08-31

### Added
- **Enhanced Restaurant Listing Page**: Complete redesign with improved visual elements and functionality
  - Updated action button text to "View Gallery" on listing images
  - Added prominent view count icon with white background on bottom-left of images
  - Implemented yellow star rating system with hover effects
  - Added proper rating and distance mapping in content section
- **Reviews System Enhancement**: Comprehensive review display and management
  - Connected reviews popup to database for real review data
  - Implemented combined display of user reviews and Google reviews
  - Added pagination support with "Load More" functionality
  - Prioritized user reviews over Google reviews in display order
  - Added Google review badges and profile photo support
- **Profile Image Handling**: Robust image loading with fallbacks
  - Created `useImageLoader` custom hook with retry logic
  - Implemented `ProfileImage` component with graceful error handling
  - Added automatic fallback to User icon when images fail to load
  - Support for different image sizes (sm, md, lg)
- **Database Schema Updates**: Enhanced review storage and retrieval
  - Added `place_id` column to restaurants table for Google Places integration
  - Created `google_reviews` table for structured Google review storage
  - Added `google_reviews` JSONB field to restaurants table for legacy data
  - Implemented `GoogleReviewRepository` for database operations
- **Backend Services**: New and improved review management
  - Enhanced `ReviewServiceV4` with combined review fetching
  - Created `GoogleReviewSyncService` for syncing Google reviews
  - Improved `GooglePlacesService` with proper API key management
  - Added comprehensive error handling and logging

### Changed
- **Frontend Architecture**: Improved component structure and reusability
  - Moved listing components to `listing-details-utility` directory
  - Created reusable UI components in `ui-listing-utility`
  - Implemented proper TypeScript interfaces and type safety
  - Enhanced error handling and loading states
- **Database Migration**: Complete transition from SQLite to PostgreSQL
  - Removed all SQLite dependencies and configurations
  - Updated all database connection managers to use PostgreSQL
  - Migrated existing data and schema to PostgreSQL
  - Updated all maintenance scripts for PostgreSQL compatibility
- **API Endpoints**: Enhanced review and restaurant endpoints
  - Added pagination support to `/api/v4/reviews` endpoint
  - Implemented combined review fetching with user and Google reviews
  - Added proper error handling and response formatting
  - Enhanced CORS and security configurations

### Fixed
- **Image Loading Issues**: Resolved CORS and loading problems
  - Fixed Google profile image loading with proper fallbacks
  - Implemented retry logic for failed image loads
  - Added graceful degradation for unavailable images
- **Review Data Integration**: Fixed data flow and display issues
  - Resolved JSON parsing issues with Google review data
  - Fixed review mapping and sorting logic
  - Corrected pagination metadata and total counts
- **Database Connection**: Improved connection management
  - Fixed decorator implementation for database operations
  - Enhanced error handling in database managers
  - Improved connection pooling and timeout handling

### Removed
- **Legacy Code**: Cleaned up obsolete files and configurations
  - Removed SQLite database files and configurations
  - Deleted duplicate listing utility directories
  - Cleaned up unused migration scripts
  - Removed deprecated API endpoints

## [Previous Versions]

### [v1.0.0] - 2025-08-15
- Initial release with basic restaurant listing functionality
- User authentication and role management
- Basic review system implementation
- Google Places integration foundation

---

## Contributing

When adding new entries to this changelog, please follow the format above and include:
- A clear description of what was added, changed, or fixed
- The impact on users and developers
- Any breaking changes or migration requirements
