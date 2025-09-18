# Image Count Tag Implementation

## Overview
The image count tag displays the current image position in a multi-image carousel (e.g., "1/3", "2/5") and is positioned in the bottom-right corner of listing images.

## Implementation Details

### Component: `ListingImage`
**Location**: `frontend/components/listing-details-utility/listing-image.tsx`

### Key Features
- **Positioning**: Absolute positioning in bottom-right corner (`bottom-3 right-3`)
- **Conditional Display**: Only shows when `totalImages > 1` (multiple images in carousel)
- **Auto-sizing**: Uses flexbox with `whitespace-nowrap` to fit text content
- **Styling**: Glassmorphism effect matching the design system
- **Z-index**: Set to `z-20` to appear above image content

### Technical Implementation
```tsx
{/* Image Count Tag - Bottom Right */}
{totalImages > 1 && (
  <div 
    className="absolute bottom-3 right-3 text-foreground text-xs font-medium px-2 py-1 rounded-full flex items-center z-20"
    style={{
      // Glassmorphism styling
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      isolation: 'isolate',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
    }}
  >
    {/* Background layers for glassmorphism effect */}
    <span className="relative z-10 tabular-nums whitespace-nowrap">
      {currentImageIndex + 1}/{totalImages}
    </span>
  </div>
)}
```

### State Management
- `currentImageIndex`: Tracks the currently displayed image (0-based)
- `totalImages`: Total number of images in the carousel
- Updates via `handleIndexChange` callback from `ImageCarousel` component

### Styling Classes
- `absolute bottom-3 right-3`: Positioning
- `text-xs font-medium`: Typography
- `px-2 py-1 rounded-full`: Padding and shape
- `flex items-center z-20`: Layout and layering
- `tabular-nums whitespace-nowrap`: Number formatting

### Integration
The tag integrates with the `ImageCarousel` component through:
- `onIndexChange`: Updates current image index
- `onImagesProcessed`: Updates total image count

## Usage
The image count tag automatically appears when:
1. Multiple images are provided to the `ListingImage` component
2. The `ImageCarousel` successfully processes the images
3. The carousel navigation is active

## Design System Compliance
- Uses consistent glassmorphism styling matching header components
- Follows typography scale (`text-xs`)
- Maintains proper spacing (`bottom-3 right-3`)
- Uses design system colors and effects

## Browser Compatibility
- Supports `backdrop-filter` with WebKit prefix for Safari
- Fallback styling ensures visibility without backdrop support
- Responsive design works across all screen sizes

## Testing
- TypeScript: All type checks pass
- ESLint: No syntax or style warnings
- Visual: Tag appears correctly positioned and sized
- Functional: Updates properly during image navigation

## Last Updated
September 18, 2025 - Implementation completed and documented
