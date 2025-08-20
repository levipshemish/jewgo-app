# Enhanced Marketplace Components

This directory contains enhanced marketplace card components that merge the best features from both the original `MarketplaceListingCard` and modern design patterns.

## Components

### EnhancedMarketplaceCard

A modern, feature-rich marketplace listing card with:

**Features:**
- ✅ Modern design with hover effects and smooth transitions
- ✅ Image loading with fallback to emoji icons
- ✅ Like/heart functionality with state management
- ✅ Endorsement system (👍/👎 counts)
- ✅ Condition badges (new, used_like_new, used_good, used_fair)
- ✅ Category badges positioned on images
- ✅ Rating display with star icons
- ✅ View count and time posted indicators
- ✅ Responsive design with proper image optimization
- ✅ Multiple variants (default, compact, featured)
- ✅ Original price display with strikethrough
- ✅ Location and seller information

**Props:**
```typescript
interface EnhancedMarketplaceCardProps {
  listing: MarketplaceListing;
  onClick?: () => void;
  className?: string;
  showEndorsements?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  onLike?: (listing: MarketplaceListing) => void;
  isLiked?: boolean;
}
```

### EnhancedMarketplaceCardSkeleton

A skeleton loading component that matches the card design:

**Features:**
- ✅ Realistic loading placeholders
- ✅ Matches the exact layout of the actual card
- ✅ Supports different variants
- ✅ Smooth pulse animation

**Props:**
```typescript
interface EnhancedMarketplaceCardSkeletonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
}
```

### EnhancedMarketplaceGrid

A responsive grid component for displaying marketplace listings:

**Features:**
- ✅ Responsive grid layout (2-6 columns)
- ✅ Loading states with skeleton components
- ✅ Empty state with helpful messaging
- ✅ Like functionality with state management
- ✅ Configurable grid columns and variants
- ✅ Automatic navigation to listing details

**Props:**
```typescript
interface EnhancedMarketplaceGridProps {
  listings?: MarketplaceListing[];
  loading?: boolean;
  className?: string;
  gridCols?: '2' | '3' | '4' | '5' | '6';
  variant?: 'default' | 'compact' | 'featured';
  showEndorsements?: boolean;
  onLike?: (listing: MarketplaceListing) => void;
  likedListings?: Set<string>;
  skeletonCount?: number;
}
```

## Usage Examples

### Basic Usage
```tsx
import { EnhancedMarketplaceGrid } from '@/components/marketplace';

function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <EnhancedMarketplaceGrid
      listings={listings}
      loading={loading}
      gridCols="4"
      variant="default"
      showEndorsements={true}
    />
  );
}
```

### With Like Functionality
```tsx
import { EnhancedMarketplaceGrid } from '@/components/marketplace';

function MarketplacePage() {
  const [likedListings, setLikedListings] = useState<Set<string>>(new Set());

  const handleLike = (listing: MarketplaceListing) => {
    setLikedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listing.id)) {
        newSet.delete(listing.id);
      } else {
        newSet.add(listing.id);
      }
      return newSet;
    });
  };

  return (
    <EnhancedMarketplaceGrid
      listings={listings}
      onLike={handleLike}
      likedListings={likedListings}
    />
  );
}
```

### Individual Card Usage
```tsx
import { EnhancedMarketplaceCard } from '@/components/marketplace';

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <EnhancedMarketplaceCard
      listing={listing}
      variant="featured"
      showEndorsements={false}
      onLike={(listing) => console.log('Liked:', listing.id)}
    />
  );
}
```

## Demo

Visit `/marketplace/enhanced-demo` to see the components in action with:
- Different variants (default, compact, featured)
- Various grid layouts (2-6 columns)
- Toggle endorsements on/off
- Like functionality
- Loading states
- Sample marketplace data

## Key Improvements Over Original

1. **Better Performance**: Optimized image loading and reduced re-renders
2. **Modern Design**: Clean, consistent UI with proper spacing and typography
3. **Enhanced UX**: Smooth animations, hover effects, and better loading states
4. **Accessibility**: Proper ARIA labels, keyboard navigation, and semantic HTML
5. **Responsive**: Better mobile experience with adaptive layouts
6. **Maintainable**: Cleaner code structure and better separation of concerns
7. **Extensible**: Easy to customize and extend with new features

## Migration Guide

To migrate from the original `MarketplaceListingCard`:

1. Replace imports:
   ```tsx
   // Old
   import MarketplaceListingCard from './MarketplaceListingCard';
   
   // New
   import { EnhancedMarketplaceCard } from '@/components/marketplace';
   ```

2. Update props:
   ```tsx
   // Old
   <MarketplaceListingCard listing={listing} onClick={handleClick} />
   
   // New
   <EnhancedMarketplaceCard 
     listing={listing} 
     onClick={handleClick}
     variant="default"
     showEndorsements={true}
   />
   ```

3. For grids, use the new grid component:
   ```tsx
   // Old
   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
     {listings.map(listing => (
       <MarketplaceListingCard key={listing.id} listing={listing} />
     ))}
   </div>
   
   // New
   <EnhancedMarketplaceGrid 
     listings={listings}
     gridCols="4"
     variant="default"
   />
   ```
