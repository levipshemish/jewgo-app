# Eatery Page Design Rules

## Overview
This document captures the working eatery page design from commit e015e9d as the required design specification for the eatery page.

## Core Design Requirements

### 1. Grid Layout Structure
- **Mobile (≤768px)**: 2-column grid layout (`grid-cols-2`)
- **Tablet (769px-1024px)**: 3-4 column grid layout
- **Desktop (≥1025px)**: 4-6 column grid layout
- **All screen sizes**: Must maintain exactly 4 rows of content for consistent pagination

### 2. API Endpoint
- **Primary API**: `/api/restaurants-with-images` (not `/api/restaurants`)
- **Response Format**: 
  ```json
  {
    "success": true,
    "data": [...],
    "total": number,
    "error": null
  }
  ```

### 3. Mobile Optimization
- **Items per page calculation**: 
  - Mobile: 8 items (4 rows × 2 columns)
  - Tablet: 12-16 items (4 rows × 3-4 columns)
  - Desktop: 20-24 items (4 rows × 5-6 columns)
- **Infinite scroll**: Enabled only on mobile devices
- **Desktop pagination**: Traditional pagination controls
- **Touch gestures**: Swipe left/right/up/down for navigation

### 4. Component Structure
- **Main component**: `EateryPageContent` (client component)
- **Wrapper**: `EateryPage` with Suspense fallback
- **Key components**:
  - `Header` with search functionality
  - `CategoryTabs` for navigation
  - `ActionButtons` for quick actions
  - `EateryFilters` for filtering
  - `UnifiedCard` for restaurant cards
  - `BottomNavigation` for mobile navigation

### 5. State Management
- **Filter state**: URL-backed using `useAdvancedFilters`
- **Location state**: Context-based with `useLocation`
- **Mobile detection**: Multiple detection methods for reliability
- **Loading states**: Separate states for initial load vs pagination

### 6. Performance Optimizations
- **Image priority**: First 4 images get priority loading
- **Scroll detection**: Disables animations during scroll
- **Debounced API calls**: 300ms debounce for filter changes
- **Memoized computations**: Card data transformation and responsive styles

### 7. Accessibility Features
- **ARIA labels**: Proper grid and gridcell roles
- **Live regions**: Status updates for loading states
- **Keyboard navigation**: Full keyboard support
- **Screen reader**: Proper semantic structure

### 8. Error Handling
- **Connection errors**: User-friendly error messages with retry options
- **Empty states**: Clear messaging when no restaurants found
- **Loading states**: Appropriate loading indicators

### 9. Responsive Design
- **Container styles**: Consistent padding across screen sizes
- **Mobile-specific**: Fixed positioning for filters on mobile
- **Desktop-specific**: Traditional layout for larger screens
- **Touch targets**: Minimum 44px for mobile interactions

### 10. Real-time Features
- **WebSocket support**: For real-time updates (currently disabled)
- **Location updates**: Automatic filter updates when location changes
- **Filter synchronization**: URL state sync with filter changes

## Implementation Notes

### Critical Dependencies
- `useAdvancedFilters` hook for filter state management
- `useLocation` context for location services
- `useMobileOptimization` for responsive behavior
- `useInfiniteScroll` for mobile pagination
- `useScrollDetection` for performance optimization

### API Requirements
- Must support `mobile_optimized=true` parameter
- Must return data in the expected format
- Must support pagination with `page` and `limit` parameters
- Must support all filter parameters from the filter schema

### CSS Requirements
- `.restaurant-grid` class for grid layout
- Mobile-specific styles for touch interactions
- Performance optimizations for scroll behavior
- Consistent spacing and typography

## Migration Checklist
When updating the eatery page, ensure:
1. ✅ Grid layout matches the 2-column mobile requirement
2. ✅ API endpoint uses `/api/restaurants-with-images`
3. ✅ Mobile optimization logic is preserved
4. ✅ Component structure matches the working design
5. ✅ State management uses the correct hooks
6. ✅ Performance optimizations are maintained
7. ✅ Accessibility features are preserved
8. ✅ Error handling follows the established patterns
9. ✅ Responsive design works across all screen sizes
10. ✅ Real-time features are properly implemented

## Breaking Changes
Any changes that deviate from this design specification must be:
1. Documented in the changelog
2. Tested across all device types
3. Validated for performance impact
4. Reviewed for accessibility compliance
5. Approved by the development team

---
*Last Updated: 2025-08-29*
*Source: Commit e015e9d - Working eatery page design*
