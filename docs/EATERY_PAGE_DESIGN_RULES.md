# Eatery Page Design Rules

## Overview
This document captures the eatery page design requirements. The eatery page should match the marketplace page layout exactly for consistency across the application.

## Core Design Requirements

### 1. Grid Layout Structure
- **Mobile (≤640px)**: 2-column grid layout (`grid-cols-2`)
- **Small tablet (641px-768px)**: 3-column grid layout
- **Large tablet (769px-1024px)**: 4-column grid layout
- **Desktop (1025px-1440px)**: 5-column grid layout
- **Large desktop (≥1441px)**: 6-column grid layout
- **All screen sizes**: Uses the same responsive grid system as marketplace page

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
  - Small tablet: 12 items (4 rows × 3 columns)
  - Large tablet: 16 items (4 rows × 4 columns)
  - Desktop: 20 items (4 rows × 5 columns)
  - Large desktop: 24 items (4 rows × 6 columns)
- **Infinite scroll**: Enabled only on mobile devices
- **Desktop pagination**: Traditional pagination controls
- **Touch gestures**: Swipe left/right/up/down for navigation

### 4. Component Structure
- **Main component**: `EateryPageClient` (client component)
- **Wrapper**: `EateryPage` with Suspense fallback
- **Key components**:
  - `Header` with search functionality
  - `CategoryTabs` for navigation
  - `ActionButtons` for quick actions
  - `UnifiedCard` for restaurant cards
  - `Pagination` for desktop pagination

### 5. State Management
- **Filter state**: Local state management
- **Loading states**: Separate states for initial load vs pagination
- **Error handling**: User-friendly error messages with retry options

### 6. Performance Optimizations
- **Image priority**: First 4 images get priority loading
- **Scroll detection**: Disables animations during scroll
- **Memoized computations**: Card data transformation
- **Hardware acceleration**: CSS transforms for smooth scrolling

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
- **Background**: Uses `bg-[#f4f4f4]` to match marketplace page
- **Grid system**: Uses `.restaurant-grid` class with responsive CSS
- **Touch targets**: Minimum 44px for mobile interactions

### 10. Layout Consistency
- **Must match marketplace page**: Same grid system, spacing, and visual design
- **Same CSS classes**: Uses `.restaurant-grid` with marketplace responsive rules
- **Same background**: `bg-[#f4f4f4]` background color
- **Same pagination**: Desktop pagination with item count display

## Implementation Notes

### Critical Dependencies
- `UnifiedCard` component for restaurant cards
- `restaurant-grid` CSS class for responsive grid layout
- Same responsive breakpoints as marketplace page

### API Requirements
- Must support pagination with `page` and `limit` parameters
- Must return data in the expected format
- Must support search functionality

### CSS Requirements
- `.restaurant-grid` class for grid layout (same as marketplace)
- Mobile-specific styles for touch interactions
- Performance optimizations for scroll behavior
- Consistent spacing and typography

## Migration Checklist
When updating the eatery page, ensure:
1. ✅ Grid layout matches marketplace page exactly
2. ✅ API endpoint uses `/api/restaurants-with-images`
3. ✅ Mobile optimization logic is preserved
4. ✅ Component structure matches marketplace page
5. ✅ Background color matches marketplace page (`bg-[#f4f4f4]`)
6. ✅ Performance optimizations are maintained
7. ✅ Accessibility features are preserved
8. ✅ Error handling follows the established patterns
9. ✅ Responsive design works across all screen sizes
10. ✅ Pagination matches marketplace page structure

## Breaking Changes
Any changes that deviate from marketplace page design must be:
1. Documented in the changelog
2. Tested across all device types
3. Validated for performance impact
4. Reviewed for accessibility compliance
5. Approved by the development team

## Design Consistency
- **Eatery page must look identical to marketplace page** in terms of:
  - Grid layout and responsive behavior
  - Background colors and spacing
  - Card styling and animations
  - Pagination structure
  - Loading and error states
  - Overall visual hierarchy

---
*Last Updated: 2025-01-27*
*Source: Updated to match marketplace page design*
