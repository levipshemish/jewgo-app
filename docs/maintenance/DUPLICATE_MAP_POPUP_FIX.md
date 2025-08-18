# Duplicate Map Popup Fix

## Problem
The map was showing duplicate popups when clicking on restaurant markers because there were two separate popup systems running simultaneously:

1. **Google Maps InfoWindow** - Created in `InteractiveRestaurantMap.tsx` and shown when markers were clicked
2. **React Card Component** - Created in `LiveMapClient.tsx` and shown when `showRestaurantCard` was true

Both were being triggered by the same marker click event, causing duplicate popups.

## Solution
Implemented a centralized popup system with the following changes:

### 1. Centralized Selection State
- Removed the Google Maps InfoWindow system entirely
- Centralized all popup logic in the parent component (`LiveMapClient.tsx`)
- Used a single `selectedRestaurant` state to control popup visibility

### 2. Single Popup Mount
- **Removed**: Google Maps InfoWindow creation and usage
- **Kept**: React card component for consistent UI/UX
- **Added**: Map click handler to close popups when clicking outside markers

### 3. Proper Event Handling
- Added map click handler to close popups: `onRestaurantSelect?.(0)`
- Updated marker click handler to prevent event propagation
- Added sentinel value (0) to handle popup closing

### 4. Cleanup and Performance
- Removed unused InfoWindow references and cleanup code
- Simplified marker click handlers
- Maintained proper event listener cleanup

## Key Changes

### InteractiveRestaurantMap.tsx
```typescript
// Removed InfoWindow creation and usage
// const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

// Added map click handler to close popups
map.addListener('click', () => {
  onRestaurantSelect?.(0); // Use sentinel value to close popups
});

// Updated marker click handler
const handleMarkerClick = (event: any) => {
  // Prevent event propagation to avoid triggering map click
  if (event.domEvent) {
    event.domEvent.stopPropagation();
  }
  
  // Call the restaurant select callback
  onRestaurantSelect?.(restaurant.id);
  
  // Zoom in to the restaurant location
  if (mapInstanceRef.current && restaurant.latitude && restaurant.longitude) {
    const position = new window.google.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude));
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setZoom(16);
  }
};
```

### LiveMapClient.tsx
```typescript
const handleRestaurantSelect = (restaurantId: number) => {
  // Handle sentinel value for closing popups
  if (restaurantId === 0) {
    setShowRestaurantCard(false);
    setSelectedRestaurant(null);
    return;
  }

  const restaurant = allRestaurants.find(r => r.id === restaurantId);
  if (restaurant) {
    setSelectedRestaurant(restaurant);
    setShowRestaurantCard(true);
  }
};
```

## Benefits
1. **No More Duplicate Popups**: Only one popup system is active at a time
2. **Consistent UI**: All popups use the same React component design
3. **Better Performance**: Removed unnecessary InfoWindow overhead
4. **Improved UX**: Clicking outside markers closes popups
5. **Cleaner Code**: Simplified event handling and state management

## Testing
- ✅ Clicking a marker shows exactly one popup
- ✅ Navigating between markers closes the previous popup before opening the new one
- ✅ Closing the popup sets `selectedRestaurant = null` and leaves no ghost listeners
- ✅ Clicking on the map (outside markers) closes any open popup
- ✅ ESC key closes popups
- ✅ No service worker cache ghost issues

## Files Modified
- `frontend/components/map/InteractiveRestaurantMap.tsx`
- `frontend/components/map/LiveMapClient.tsx`

## Commit Message
```
fix(map): enforce single popup mount and dedupe listeners

- Remove Google Maps InfoWindow to prevent duplicate popups
- Centralize popup state in parent component
- Add map click handler to close popups
- Use sentinel value (0) for popup closing
- Prevent event propagation on marker clicks
- Maintain proper cleanup and performance
```
