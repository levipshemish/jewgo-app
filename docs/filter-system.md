# Filter System Documentation

## Overview

The JewGo app implements a comprehensive filter system that provides entity-specific filtering capabilities across different pages (restaurants, synagogues, and mikvahs). The system is designed to be modular, reusable, and maintainable.

## Architecture

### Core Components

1. **ModernFilterPopup** - Main filter modal component
2. **FilterPreview** - Shows count of filtered results
3. **ActiveFilterChips** - Displays applied filters as removable chips
4. **useLazyFilterOptions** - Hook for fetching filter options
5. **useLocalFilters** - Hook for managing filter state

### API Structure

- **Backend Endpoints**: `/api/v5/{entityType}?include_filter_options=true`
- **Frontend API Routes**: `/api/v5/{entityType}/filter-options`
- **Entity Types**: `restaurants`, `synagogues`, `mikvahs`

## Entity-Specific Filters

### Restaurants
- **Certifying Agency** - Kosher certification agencies
- **Kosher Type** - Meat, Dairy, Pareve
- **Price Range** - $, $$, $$$, $$$$
- **Rating** - Minimum star rating
- **Hours** - Open now, morning, afternoon, evening, late night
- **Kosher Details** - Cholov Stam, Cholov Yisroel, Pas Yisroel

### Synagogues
- **Denomination** - Orthodox, Conservative, Reform, Reconstructionist
- **Shul Type** - Traditional, Chabad, Orthodox, Sephardic
- **Shul Category** - Ashkenazi, Chabad, Sephardic
- **City** - Location-based filtering
- **State** - State-based filtering
- **Rating** - Minimum star rating

### Mikvahs
- **Appointment Required** - Yes/No
- **Status** - Active, Inactive, Pending
- **City** - Location-based filtering
- **Contact Person** - Specific contact persons

## Common Filters

All entity types support:
- **Location** - Latitude/longitude with radius
- **Distance** - Maximum distance from user location
- **Sort** - Various sorting options

## Implementation Details

### Filter Options Flow

1. **Backend Service** generates filter options from database
2. **API Route** serves filter options to frontend
3. **useLazyFilterOptions** hook fetches options when needed
4. **ModernFilterPopup** displays entity-specific filters
5. **Filter Preview** shows result count

### State Management

- **Draft Filters** - Temporary filter state in modal
- **Active Filters** - Applied filters shown as chips
- **Filter Options** - Available options for each filter type

### Fallback System

The system includes fallback filter options when:
- Backend is unavailable
- API calls fail
- Filter options are empty

## Usage Examples

### Adding New Filter Types

1. Add filter option to backend service
2. Update API response structure
3. Add filter section to ModernFilterPopup
4. Update TypeScript interfaces

### Customizing Filter Display

```typescript
// Entity-specific filter rendering
{entityType === 'synagogues' && (
  <div className="space-y-3">
    <label>Denomination</label>
    <CustomDropdown
      value={draftFilters.denomination || ""}
      onChange={(value) => setDraftFilter('denomination', value)}
      options={filterOptions?.denominations?.map(denomination => ({
        value: denomination,
        label: denomination.charAt(0).toUpperCase() + denomination.slice(1)
      })) || []}
    />
  </div>
)}
```

## API Endpoints

### Backend Endpoints

- `GET /api/v5/restaurants?include_filter_options=true`
- `GET /api/v5/synagogues?include_filter_options=true`
- `GET /api/v5/mikvahs?include_filter_options=true`

### Frontend API Routes

- `GET /api/restaurants/filter-options`
- `GET /api/v5/synagogues/filter-options`
- `GET /api/v5/mikvahs/filter-options`

## Error Handling

- Graceful fallback to static options
- Loading states for async operations
- Error boundaries for component failures
- Retry mechanisms for failed API calls

## Performance Considerations

- Lazy loading of filter options
- Caching of filter data
- Debounced filter preview updates
- Optimized re-renders

## Testing

- Unit tests for filter logic
- Integration tests for API endpoints
- E2E tests for filter workflows
- Accessibility testing for filter UI

## Future Enhancements

- Advanced filter combinations
- Saved filter presets
- Filter analytics
- Real-time filter updates
