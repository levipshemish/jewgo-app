# Grid Layout Standards for Category Pages

## Overview
This document outlines the standardized grid layout and navigation structure that should be applied to all category pages in the Jewgo application.

## Key Changes Applied

### 1. Sticky Navigation Structure
All category pages should use a unified sticky navigation container:

```tsx
<div className="sticky top-0 z-50 bg-white">
  <Header 
    onSearch={handleSearch}
    placeholder="Search [category]..."
    showFilters={true}
    onShowFilters={handleShowFilters}
  />
  
  <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
    <CategoryTabs activeTab="[category]" />
  </div>
  
  <ActionButtons 
    onShowFilters={handleShowFilters}
    onShowMap={() => router.push('/live-map')}
    onAddEatery={() => router.push('/add-eatery')}
  />
</div>
```

### 2. CSS Grid Layout Standards
The `.restaurant-grid` class (used for all category grids) enforces:

- **4-row limit**: Exactly 4 rows displayed per page
- **Responsive columns**: 
  - Mobile (≤640px): 2 columns
  - Tablet (641-768px): 3 columns  
  - Large tablet (769-1024px): 4 columns
  - Desktop (1025-1440px): 6 columns
  - Large desktop (≥1441px): 8 columns
- **Card height**: 220px (reduced for tighter spacing)
- **Overflow behavior**:
  - Mobile/tablet: `overflow: hidden` for infinite scroll
  - Desktop: `overflow: visible` for pagination

### 3. UnifiedCard Component Updates
All cards should use the updated UnifiedCard with:

- **Title truncation**: 10 characters max with ellipsis
- **Reduced spacing**: Tighter layout between elements
- **Consistent data mapping**: Standardized prop structure
- **Star ratings**: Yellow star icon in front of rating numbers (`showStarInBadge={true}`)

### 4. Data Interface Standards
All category pages should use consistent data interfaces:

```tsx
interface Restaurant {
  id: string | number;
  name: string;
  address: string;
  phone?: string;
  phone_number?: string;
  website: string;
  cuisine?: string;
  kosher_category?: string;
  rating?: number | string;
  google_rating?: number | string;
  price_range: string;
  image_url: string;
  is_open: boolean;
  distance?: number;
}
```

### 5. API Integration Standards
- Use consistent API endpoint patterns
- Implement proper error handling
- Support both real API and fallback sample data
- Maintain mobile vs desktop pagination logic

## Pages to Update

### ✅ Completed
- `frontend/app/eatery/EateryPageClient.tsx` - Fully updated with new standards
- `frontend/app/marketplace/page.tsx` - Updated with sticky navigation
- `frontend/app/stores/page.tsx` - Updated with sticky navigation  
- `frontend/app/shuls/page.tsx` - Updated with sticky navigation
- `frontend/app/mikvah/page.tsx` - Updated with sticky navigation
- `frontend/app/shtel/page.tsx` - Updated with sticky navigation

### 🔄 Pending Updates
- All category pages have been updated with the new grid layout standards

## Implementation Checklist

For each category page, ensure:

- [ ] Sticky navigation container wraps Header, CategoryTabs, and ActionButtons
- [ ] Remove individual sticky positioning from components
- [ ] Use `.restaurant-grid` class for grid layout
- [ ] Implement 4-row limit with responsive column counts
- [ ] Update data interfaces to match standards
- [ ] Use updated UnifiedCard component
- [ ] Implement proper mobile vs desktop pagination
- [ ] Add proper error handling and loading states
- [ ] Test responsive behavior across all screen sizes

## CSS Classes Reference

### Grid Layout
```css
.restaurant-grid {
  --card-height: 220px;
  display: grid !important;
  align-items: start !important;
  width: 100% !important;
  box-sizing: border-box !important;
  grid-template-rows: repeat(4, 1fr) !important;
  max-height: calc(4 * (var(--card-height) + 1rem)) !important;
}
```

### Responsive Breakpoints
- Mobile (≤640px): 2 columns × 4 rows = 8 items
- Tablet (641-768px): 3 columns × 4 rows = 12 items  
- Large tablet (769-1024px): 4 columns × 4 rows = 16 items
- Desktop (1025-1440px): 6 columns × 4 rows = 24 items
- Large desktop (≥1441px): 8 columns × 4 rows = 32 items

## Testing Requirements

- [ ] Verify sticky navigation works on all screen sizes
- [ ] Confirm 4-row limit is enforced across all breakpoints
- [ ] Test infinite scroll on mobile devices
- [ ] Test pagination on desktop devices
- [ ] Verify card spacing and truncation
- [ ] Test responsive column counts
- [ ] Confirm proper overflow behavior

## Notes

- The marketplace page has a different structure with additional components (MarketplaceActionBar, MarketplaceCategoriesDropdown)
- Some pages may have category-specific filters that should be preserved
- All pages should maintain their existing functionality while adopting the new layout standards

## Location Access Standards

### Permission Handling
- **Browser Permission Check**: Always check actual browser permission status before showing location prompts
- **Permission States**: 
  - `'granted'`: User has granted location access
  - `'denied'`: User has denied location access
  - `'prompt'`: User hasn't been asked yet
  - `'unsupported'`: Browser doesn't support geolocation
- **Smart Prompts**: Only show location prompts when permission status is 'prompt'
- **Permission Listeners**: Listen for permission changes and update UI accordingly

### Implementation
- Use `checkPermissionStatus()` function to verify actual browser permissions
- Don't rely solely on localStorage saved permission status
- Show appropriate banners based on actual permission state
- Handle permission changes gracefully across page navigation
