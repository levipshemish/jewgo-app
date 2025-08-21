# UnifiedCard Component Documentation

## Overview

The UnifiedCard component is a versatile, accessible, and performant card component designed to display both restaurant and marketplace items in a unified design system. It provides a consistent user experience across different content types while maintaining flexibility for customization.

## Features

### Visual Features
- **Responsive Design**: Automatically adapts to different screen sizes
- **Image Loading States**: Skeleton loader with smooth transitions
- **Error Handling**: Graceful fallback for failed image loads
- **Text Truncation**: Intelligent handling of long text content
- **Animations**: Smooth micro-interactions using Framer Motion
- **Theme Support**: Customizable through className prop

### Functional Features
- **Accessibility**: Full ARIA support and keyboard navigation
- **Performance**: Optimized image loading with Next.js Image component
- **Touch Support**: Enhanced mobile interactions
- **Event Handling**: Click handlers for cards, tags, and favorites
- **State Management**: Integrated with favorites system

## Usage

### Basic Example

```tsx
import EnhancedProductCard from '@/components/ui/UnifiedCard';

function MyComponent() {
  const cardData = {
    id: '1',
    imageUrl: 'https://example.com/image.jpg',
    imageTag: 'Popular',
    imageTagLink: '/popular',
    title: 'Restaurant Name',
    badge: '4.5',
    subtitle: '$$',
    additionalText: 'Italian',
    showHeart: true
  };

  const handleCardClick = (data) => {
    console.log('Card clicked:', data);
  };

  const handleLikeToggle = (id, isLiked) => {
    console.log('Like toggled:', id, isLiked);
  };

  return (
    <EnhancedProductCard
      data={cardData}
      onCardClick={handleCardClick}
      onLikeToggle={handleLikeToggle}
    />
  );
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `CardData` | Yes | - | Card data object |
| `onCardClick` | `(data: CardData) => void` | No | - | Callback when card is clicked |
| `onLikeToggle` | `(id: string, isLiked: boolean) => void` | No | - | Callback when favorite is toggled |
| `onTagClick` | `(tagLink: string, event: MouseEvent) => void` | No | - | Callback when tag is clicked |
| `className` | `string` | No | `''` | Additional CSS classes |
| `priority` | `boolean` | No | `false` | Priority loading for images |

### CardData Interface

```typescript
interface CardData {
  id: string;                // Unique identifier
  imageUrl?: string;         // Image URL
  imageTag?: string;         // Tag text (e.g., "Kosher", "Electronics")
  imageTagLink?: string;     // Tag click destination
  title: string;             // Main title
  badge?: string;            // Badge text (e.g., rating, "New")
  subtitle?: string;         // Secondary text (e.g., price range)
  additionalText?: string;   // Additional info (e.g., cuisine type)
  showHeart?: boolean;       // Show favorite button
  isLiked?: boolean;         // Initial liked state
}
```

## Accessibility

### ARIA Support
- Proper roles: `button` when clickable, `article` otherwise
- Descriptive aria-labels for all interactive elements
- aria-pressed state for favorite button
- Live region announcements for state changes

### Keyboard Navigation
- Tab navigation between interactive elements
- Enter/Space to activate buttons
- Focus indicators for all interactive elements

### Screen Reader Support
- Announces state changes (favorites)
- Descriptive labels for all content
- Proper heading hierarchy

## Testing

### Running Tests

```bash
# Run all UnifiedCard tests
npm run test:unified-card

# Run specific test suite
npm test -- components/ui/__tests__/UnifiedCard.accessibility.test.tsx
npm test -- components/ui/__tests__/UnifiedCard.functional.test.tsx
npm test -- components/ui/__tests__/UnifiedCard.edge-cases.test.tsx
```

### Test Coverage
- **Accessibility Tests**: ARIA attributes, keyboard navigation, screen reader support
- **Functional Tests**: Component behavior, event handling, state management
- **Edge Case Tests**: Error handling, performance, security, extreme values

## Performance Considerations

### Image Optimization
- Lazy loading by default
- Priority loading option for above-the-fold content
- Cloudinary integration with automatic optimizations
- Fallback handling for failed loads

### Bundle Size
- Tree-shakeable imports
- Minimal dependencies
- Efficient animation library usage

### Rendering Performance
- Memoized computations
- Efficient re-render prevention
- Optimized event handlers

## Edge Cases

### Handled Scenarios
- Missing or invalid image URLs
- Very long text content
- Special characters and Unicode
- RTL language support
- Rapid user interactions
- Component unmounting during async operations

### Security
- XSS protection for all text content
- Safe URL validation
- Sanitized user inputs

## Customization

### Styling
```tsx
// Custom styling via className
<EnhancedProductCard
  data={cardData}
  className="custom-shadow custom-border"
/>
```

### Custom Event Handlers
```tsx
// Custom tag click behavior
const handleTagClick = (tagLink, event) => {
  event.preventDefault();
  // Custom navigation logic
  router.push(tagLink);
};

<EnhancedProductCard
  data={cardData}
  onTagClick={handleTagClick}
/>
```

## Migration Guide

### From Legacy Card Components
1. Map your data to the CardData interface
2. Replace onClick with onCardClick
3. Update favorite handling to use onLikeToggle
4. Remove custom styling that conflicts with the unified design

### Example Migration
```tsx
// Before
<RestaurantCard
  restaurant={restaurant}
  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
  isFavorite={favorites.includes(restaurant.id)}
/>

// After
<EnhancedProductCard
  data={{
    id: restaurant.id,
    title: restaurant.name,
    imageUrl: restaurant.image_url,
    badge: restaurant.rating,
    subtitle: restaurant.price_range,
    showHeart: true
  }}
  onCardClick={(data) => navigate(`/restaurant/${data.id}`)}
  onLikeToggle={(id, isLiked) => updateFavorites(id, isLiked)}
/>
```

## Best Practices

### Do's
- ✅ Provide meaningful alt text via the title
- ✅ Use priority={true} for above-the-fold cards
- ✅ Handle all callback props for complete functionality
- ✅ Test with real data including edge cases
- ✅ Consider mobile touch interactions

### Don'ts
- ❌ Don't override critical accessibility styles
- ❌ Don't assume image URLs are always valid
- ❌ Don't ignore TypeScript warnings
- ❌ Don't skip error handling in callbacks
- ❌ Don't use inline styles that conflict with animations

## Troubleshooting

### Common Issues

**Images not loading**
- Check if URL is valid and accessible
- Verify CORS settings for external images
- Check console for specific error messages

**Animations not working**
- Ensure Framer Motion is properly installed
- Check for CSS conflicts
- Verify JavaScript is enabled

**Favorites not persisting**
- Implement proper state management
- Check localStorage implementation
- Verify callback handlers are connected

## Future Enhancements

### Planned Features
- [ ] Skeleton loading customization
- [ ] Additional animation variants
- [ ] Theme system integration
- [ ] Advanced image lazy loading strategies
- [ ] Built-in analytics tracking

### Contributing
See the main project contributing guide. Key areas for contribution:
- Additional test coverage
- Performance optimizations
- Accessibility improvements
- Documentation updates
