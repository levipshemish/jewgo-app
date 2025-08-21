# UnifiedCard Component - Final Version

## Overview

The `UnifiedCard` component is a comprehensive, production-ready card component designed to work across all versions of your website. It provides a unified API with multiple variants, comprehensive accessibility features, and robust error handling.

## Access

- **URL**: `/test-unified-card`
- **Component**: `frontend/components/ui/UnifiedCard.tsx`

## Features

### 🎨 Visual Variants

The component supports three distinct visual variants:

1. **Minimal** (`variant="minimal"`)
   - Compact design: 160px width
   - Smaller text and spacing
   - Ideal for dense layouts

2. **Default** (`variant="default"`)
   - Standard design: 180px width
   - Balanced proportions
   - Recommended for most use cases

3. **Enhanced** (`variant="enhanced"`)
   - Premium design: 200px width
   - Larger text and spacing
   - Perfect for featured content

### ❤️ Heart Button Features

- **Default State**: White outline with grey fill (`#9ca3af`)
- **Hover State**: White outline with red fill (`#ef4444`)
- **Liked State**: White outline with red fill (`#ef4444`)
- **Position**: Moved up to `top: 4px` for better visibility
- **Animation**: Smooth scale and color transitions

### 🎯 Core Features

#### Visual & Animation
- Smooth loading animations with skeleton placeholders
- Graceful image error handling with fallbacks
- Text truncation for long content
- Responsive design across all screen sizes
- Hover effects and micro-interactions
- Support for RTL languages and special characters
- **Transparent background** for seamless integration

#### Functionality
- Click handlers for cards, tags, and favorites
- Keyboard navigation support (Tab, Enter, Space)
- Accessibility compliance (ARIA labels, roles)
- Screen reader announcements
- Event propagation control
- Performance optimizations with React.memo

#### Image Handling
- Next.js Image optimization
- Cloudinary URL normalization
- Fallback to default restaurant image
- Loading states with skeleton placeholders
- Error handling with graceful degradation

## API Reference

### Props

```typescript
interface UnifiedCardProps {
  data: CardData;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCardClick?: (data: CardData) => void;
  onTagClick?: (tagLink: string, event: React.MouseEvent) => void;
  className?: string;
  priority?: boolean;
  variant?: 'default' | 'minimal' | 'enhanced';
}
```

### Data Structure

```typescript
interface CardData {
  id: string;
  imageUrl?: string;
  imageTag?: string;
  imageTagLink?: string;
  title: string;
  badge?: string;
  subtitle?: string;
  additionalText?: string;
  showHeart?: boolean;
  isLiked?: boolean;
}
```

## Usage Examples

### Basic Usage
```tsx
<UnifiedCard
  data={restaurantData}
  onCardClick={handleClick}
  onLikeToggle={handleLike}
/>
```

### With Variants
```tsx
<UnifiedCard
  variant="minimal"
  data={restaurantData}
  onCardClick={handleClick}
/>

<UnifiedCard
  variant="enhanced"
  data={restaurantData}
  onCardClick={handleClick}
/>
```

### Complete Example
```tsx
<UnifiedCard
  data={restaurantData}
  onCardClick={handleCardClick}
  onLikeToggle={handleLikeToggle}
  onTagClick={handleTagClick}
  className="custom-class"
  priority={true}
  variant="default"
/>
```

## Testing Features

### Interactive Testing
- **Card Clicks**: Test navigation callbacks
- **Heart Toggle**: Test favorites functionality (red hover state)
- **Tag Clicks**: Test tag navigation
- **Keyboard Navigation**: Tab, Enter, Space key support
- **Responsive Design**: Resize browser to test behavior
- **Variant Comparison**: Test all three variants side-by-side

### Edge Case Testing
- **Long Text**: Verify truncation behavior
- **Special Characters**: Test rendering of symbols and emojis
- **RTL Support**: Test right-to-left text alignment
- **Error Images**: Confirm fallback behavior
- **Transparent Background**: Test seamless integration
- **Console Monitoring**: Check for errors and warnings

## Design System Integration

### Color Scheme
- **Background**: Transparent (seamless integration)
- **Text**: Gray scale (800, 700, 600, 500)
- **Accents**: Red for heart hover (`#ef4444`)
- **Borders**: Subtle grays for tags and badges

### Typography
- **Minimal**: `text-xs` for titles
- **Default**: `text-sm` for titles
- **Enhanced**: `text-base` for titles
- **Consistent**: Font weights and line heights

### Spacing
- **Minimal**: `p-2` padding
- **Default**: `p-3` padding
- **Enhanced**: `p-4` padding
- **Consistent**: Gap and margin ratios

## Accessibility Features

### ARIA Support
- `role="button"` for clickable cards
- `aria-label` for descriptive labels
- `aria-pressed` for heart button state
- `aria-live` for screen reader announcements

### Keyboard Navigation
- Tab focus management
- Enter/Space key activation
- Escape key handling
- Focus indicators

### Screen Reader Support
- Descriptive announcements for actions
- Contextual information for images
- State changes communicated clearly
- Error states properly announced

## Performance Optimizations

### React Optimizations
- `React.memo` for component memoization
- `useCallback` for stable function references
- `useMemo` for expensive computations
- Optimized re-render patterns

### Image Optimizations
- Next.js Image component
- Lazy loading with priority option
- Responsive image sizing
- WebP format support

### Animation Performance
- CSS transforms for smooth animations
- Hardware acceleration where possible
- Optimized transition timing
- Reduced layout thrashing

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Support
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

### Features
- CSS Grid and Flexbox
- CSS Custom Properties
- Intersection Observer API
- Web Animations API

## Migration Guide

### From Previous Versions

1. **Replace Component Name**
   ```tsx
   // Old
   import EnhancedProductCard from '@/components/ui/UnifiedCard'
   
   // New
   import UnifiedCard from '@/components/ui/UnifiedCard'
   ```

2. **Add Variant Prop** (optional)
   ```tsx
   // Old
   <EnhancedProductCard data={data} />
   
   // New
   <UnifiedCard variant="default" data={data} />
   ```

3. **Update Props Interface**
   ```tsx
   // Old
   interface EnhancedProductCardProps
   
   // New
   interface UnifiedCardProps
   ```

### Breaking Changes
- Component renamed from `EnhancedProductCard` to `UnifiedCard`
- Removed `UnifiedCardConsistent` component (merged into main component)
- Added `variant` prop for different visual styles
- Improved TypeScript types and interfaces

## Future Enhancements

### Planned Features
- Additional variants (compact, premium)
- Custom theme support
- Advanced animation options
- Enhanced accessibility features
- Performance monitoring integration

### Roadmap
- Q1: Additional variants
- Q2: Theme system
- Q3: Animation library
- Q4: Performance optimization

## Support

For questions, issues, or feature requests:
- Check the test page at `/test-unified-card`
- Review the component code in `frontend/components/ui/UnifiedCard.tsx`
- Test edge cases and accessibility features
- Monitor console for errors and warnings

---

**Last Updated**: January 2025
**Version**: 1.0.0 (Final)
**Status**: Production Ready ✅
