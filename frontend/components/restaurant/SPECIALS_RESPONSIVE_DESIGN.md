# Specials Section Responsive Design System

## 📐 Consistent 3-Column Grid Layout

The Specials section now uses a consistent 3-column grid layout across all screen sizes for a uniform experience:

### All Screen Sizes (Mobile, Tablet, Desktop)
- **Layout**: 3-column grid (`grid-cols-3`)
- **Gap Spacing**: `gap-2` (mobile) → `gap-3` (tablet) → `gap-4` (desktop)
- **Card Structure**: Flexible cards that adapt to container width
- **Responsive Elements**: Typography and spacing scale with screen size

## 🎨 Responsive Design Features

### Typography Scaling
- **Title Text**: `text-xs` (mobile) → `text-sm` (tablet) → `text-base` (desktop)
- **Deal Text**: `text-xs` (mobile/tablet) → `text-sm` (desktop)
- **Font Weight**: `font-medium` for titles, `font-bold` for deals

### Image Heights
- **Mobile**: `h-20` (80px)
- **Small Tablet**: `h-24` (96px)
- **Large Tablet**: `h-28` (112px)
- **Desktop**: `h-32` (128px)

### Spacing & Padding
- **Card Padding**: `p-1.5` (mobile) → `p-2` (tablet) → `p-3` (desktop)
- **Title Margin**: `mt-1` (mobile) → `mt-2` (tablet+)
- **Grid Gaps**: `gap-2` (mobile) → `gap-3` (tablet) → `gap-4` (desktop)

## 🧩 Component Structure

```tsx
<SpecialsSection specials={specials} restaurantName={name} />
```

### Props
- `specials`: Array of RestaurantSpecial objects
- `restaurantName`: String for accessibility and alt text

### CSS Classes Used
- `.specials-card`: Card animations and hover effects
- `.grid-cols-3`: Consistent 3-column layout
- Responsive utilities: `sm:`, `md:`, `lg:` prefixes

## 📱 Responsive Breakpoints

| Breakpoint | Grid | Gap | Image Height | Title Size | Padding |
|------------|------|-----|--------------|------------|---------|
| Mobile (≤640px) | 3 cols | gap-2 | h-20 | text-xs | p-1.5 |
| Tablet (641-1024px) | 3 cols | gap-3 | h-24/h-28 | text-sm | p-2 |
| Desktop (≥1024px) | 3 cols | gap-4 | h-32 | text-base | p-3 |

## 🎯 Design Benefits

### Consistency
- **Uniform Layout**: Same 3-column structure across all devices
- **Predictable UX**: Users see the same layout regardless of device
- **Simplified Code**: Single layout approach reduces complexity

### Responsive Elements
- **Scalable Typography**: Text sizes adapt to screen size
- **Flexible Images**: Image heights scale appropriately
- **Adaptive Spacing**: Gaps and padding adjust for optimal viewing

### Performance
- **Efficient Rendering**: Single layout reduces DOM complexity
- **Optimized Images**: Proper sizing for each breakpoint
- **Smooth Animations**: Hardware-accelerated hover effects

## 🎨 Visual Features

### Card Design
- **Rounded Corners**: `rounded-xl` for modern appearance
- **Subtle Shadows**: `shadow-sm` with hover enhancement
- **Clean Borders**: `border-gray-100` for definition
- **Hover Effects**: Scale and shadow transitions

### Color System
- **Deal Text**: `text-red-500` for emphasis
- **Background**: `bg-white` for clean appearance
- **Fallback Colors**: Dynamic color overlays based on special type

## 🚀 Performance Optimizations

- **Image Optimization**: Next.js Image component with responsive sizing
- **Efficient Grid**: CSS Grid for optimal layout performance
- **Conditional Rendering**: Only renders active specials
- **Lazy Loading**: Images load as needed
- **Hardware Acceleration**: GPU-accelerated hover effects

## 🔧 Customization

The design system can be easily customized by modifying:

1. **Grid Columns**: Change `grid-cols-3` to different values
2. **Gap Sizing**: Adjust gap values for different spacing
3. **Typography**: Modify text size classes
4. **Image Heights**: Update height classes for different proportions
5. **Colors**: Customize color classes for branding

## 📋 Testing Checklist

- [ ] 3-column grid displays correctly on all screen sizes
- [ ] Typography scales appropriately across breakpoints
- [ ] Images maintain proper aspect ratios
- [ ] Hover effects work smoothly
- [ ] Accessibility features function properly
- [ ] Performance is optimal on all devices
- [ ] Touch interactions work on mobile devices
- [ ] Keyboard navigation functions correctly 