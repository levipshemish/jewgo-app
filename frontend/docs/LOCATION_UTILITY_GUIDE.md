# Location Utility System Guide

This guide explains how to use the comprehensive location utility system across the entire application.

## Overview

The location utility system provides:
- **Reusable location utilities** for distance calculations and data transformation
- **Custom hooks** for easy integration with React components
- **Higher-order components** for pages that need location functionality
- **Automatic location permission handling** and user prompts

## Core Components

### 1. Location Utilities (`/lib/utils/location.ts`)

Core utility functions for location-based operations:

```typescript
import {
  calculateLocationDistance,
  addDistanceToItems,
  sortByDistance,
  filterByDistance,
  getLocationDisplayText,
  formatLocationForDisplay
} from '@/lib/utils/location';
```

### 2. Location Hooks (`/hooks/useLocationData.ts`)

Custom hooks for React components:

```typescript
import { useLocationData, useLocationDisplay } from '@/hooks/useLocationData';
```

### 3. Location-Aware Page Component (`/components/LocationAwarePage.tsx`)

HOC for pages that need location functionality:

```typescript
import LocationAwarePage from '@/components/LocationAwarePage';
```

## Usage Examples

### Basic Usage with Hook

```tsx
import { useLocationData } from '@/hooks/useLocationData';

function RestaurantList({ restaurants }) {
  const {
    userLocation,
    permissionStatus,
    isLoading,
    requestLocation,
    transformItems,
    sortItems,
    getItemDisplayText
  } = useLocationData({
    sortByDistance: true,
    fallbackText: 'Distance unavailable'
  });

  // Transform and sort restaurants
  const processedRestaurants = useMemo(() => {
    return sortItems(transformItems(restaurants));
  }, [restaurants, transformItems, sortItems]);

  return (
    <div>
      {processedRestaurants.map(restaurant => (
        <div key={restaurant.id}>
          <h3>{restaurant.name}</h3>
          <p>{getItemDisplayText(restaurant)}</p>
        </div>
      ))}
    </div>
  );
}
```

### Simple Display Usage

```tsx
import { useLocationDisplay } from '@/hooks/useLocationData';

function RestaurantCard({ restaurant }) {
  const { getItemDisplayText } = useLocationDisplay('Get Location');
  
  return (
    <div>
      <h3>{restaurant.name}</h3>
      <p>{getItemDisplayText(restaurant)}</p>
    </div>
  );
}
```

### Page-Level Integration

```tsx
import LocationAwarePage from '@/components/LocationAwarePage';

function MyPage() {
  return (
    <LocationAwarePage showLocationPrompt={true}>
      <div>
        <h1>My Location-Aware Page</h1>
        <RestaurantList />
      </div>
    </LocationAwarePage>
  );
}
```

### Required Location Page

```tsx
import LocationAwarePage from '@/components/LocationAwarePage';

function LocationRequiredPage() {
  return (
    <LocationAwarePage requireLocation={true}>
      <div>
        <h1>This page requires location</h1>
        <RestaurantList />
      </div>
    </LocationAwarePage>
  );
}
```

## Data Structure Requirements

Your data items need to implement the `LocationWithDistance` interface:

```typescript
interface LocationWithDistance {
  id: string | number;
  latitude?: number;
  longitude?: number;
  distance?: string;
  zip_code?: string;
  [key: string]: any;
}
```

Example restaurant data:
```typescript
const restaurant = {
  id: 1,
  name: "Kosher Deli",
  latitude: 25.7617,
  longitude: -80.1918,
  zip_code: "33101",
  // ... other properties
};
```

## Available Utility Functions

### Distance Calculations
- `calculateLocationDistance()` - Calculate distance between two points
- `addDistanceToItems()` - Add distance calculations to array of items
- `getLocationDisplayText()` - Get display text for a single item

### Data Processing
- `sortByDistance()` - Sort items by distance from user location
- `filterByDistance()` - Filter items within distance radius
- `formatLocationForDisplay()` - Format location for UI display

### Location Services
- `isLocationSupported()` - Check if geolocation is supported
- `getLocationPermissionStatus()` - Get current permission status
- `requestCurrentLocation()` - Request current location with timeout

## Hook Options

### useLocationData Options
```typescript
interface UseLocationDataOptions {
  sortByDistance?: boolean;        // Auto-sort by distance
  maxDistanceMiles?: number;       // Filter by max distance
  fallbackText?: string;           // Text when no location
}
```

### useLocationDisplay Options
```typescript
// Simple hook with just fallback text
const { getItemDisplayText } = useLocationDisplay('Distance unavailable');
```

## Page Component Options

### LocationAwarePage Props
```typescript
interface LocationAwarePageProps {
  children: ReactNode;
  showLocationPrompt?: boolean;     // Show permission prompt
  locationPromptComponent?: ReactNode; // Custom prompt component
  requireLocation?: boolean;        // Require location to proceed
}
```

## Migration Guide

### From Old EateryGrid to New System

**Old way:**
```tsx
// Manual distance calculation
const distance = calculateDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng);
const distanceText = formatDistance(distance);
```

**New way:**
```tsx
// Using utility hook
const { getItemDisplayText } = useLocationData();
const distanceText = getItemDisplayText(restaurant);
```

### From Manual Location Handling

**Old way:**
```tsx
// Manual location context usage
const { userLocation, requestLocation } = useLocation();
// Manual permission handling
// Manual distance calculations
```

**New way:**
```tsx
// Using location-aware page
<LocationAwarePage>
  <YourContent />
</LocationAwarePage>
```

## Best Practices

### 1. Use the Right Hook
- `useLocationData()` - For complex data processing
- `useLocationDisplay()` - For simple display needs

### 2. Implement Required Interface
Make sure your data implements `LocationWithDistance`:
```typescript
interface MyItem extends LocationWithDistance {
  // Your additional properties
}
```

### 3. Use Page-Level Integration
Wrap pages that need location in `LocationAwarePage`:
```tsx
<LocationAwarePage showLocationPrompt={true}>
  <YourPageContent />
</LocationAwarePage>
```

### 4. Handle Loading States
```tsx
const { isLoading, userLocation } = useLocationData();

if (isLoading) {
  return <LoadingSpinner />;
}
```

### 5. Provide Fallbacks
Always provide meaningful fallback text:
```tsx
const { getItemDisplayText } = useLocationDisplay('Distance unavailable');
```

## Error Handling

The system handles common errors automatically:
- **Permission denied** - Shows appropriate message
- **Location timeout** - Retries with fallback
- **Unsupported browser** - Graceful degradation
- **Network errors** - Fallback to cached data

## Performance Considerations

- **Memoization** - All utility functions are memoized
- **Lazy loading** - Location is only requested when needed
- **Caching** - Location data is cached for 1 hour
- **Debouncing** - Multiple requests are debounced

## Testing

The utilities are designed to be easily testable:

```typescript
// Mock location data for tests
const mockLocation = {
  latitude: 25.7617,
  longitude: -80.1918,
  timestamp: Date.now()
};

// Test utility functions
const distance = calculateLocationDistance(mockLocation, 25.7907, -80.1300);
expect(distance).toBe('2.1mi');
```

## Troubleshooting

### Common Issues

1. **Distance not showing**
   - Check if data has `latitude` and `longitude` properties
   - Verify location permission is granted
   - Check browser console for errors

2. **Permission prompt not appearing**
   - Ensure `LocationAwarePage` is used
   - Check if `showLocationPrompt` is true
   - Verify `LocationProvider` is in the component tree

3. **Location not updating**
   - Check if `useLocationData` dependencies are correct
   - Verify location context is properly memoized
   - Check for infinite re-render loops

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your environment:
```typescript
// In LocationContext
const DEBUG = process.env.NODE_ENV === 'development';
```

This will log all location-related operations to the console.
