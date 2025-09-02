# Card Flickering Fixes - Implementation Guide

## Problem Description

Cards were experiencing flickering during scroll due to several performance and rendering issues:

1. **Multiple scroll listeners** - Each card component was creating its own scroll detection
2. **CSS transitions during scroll** - Animations were running while scrolling, causing visual jumps
3. **Transform conflicts** - Multiple transform properties were being applied simultaneously
4. **Inefficient scroll detection** - Scroll events were firing too frequently with poor debouncing

## Implemented Solutions

### 1. Optimized Scroll Detection Hook (`useScrollDetection`)

**File**: `frontend/lib/hooks/useScrollDetection.ts`

**Improvements**:
- Increased debounce from 100ms to 150ms for smoother transitions
- Added scroll threshold (5px) to prevent micro-movements from triggering
- Implemented shared scroll context to prevent multiple listeners
- Added `disabled` option for performance optimization
- Used passive scroll listeners for better performance

**Key Changes**:
```typescript
// Before: 100ms debounce, no threshold
const { isScrolling } = useScrollDetection({ debounceMs: 100 });

// After: 150ms debounce, 5px threshold, shared context
const { isScrolling } = useScrollDetection({ 
  debounceMs: 150, 
  threshold: 5,
  disabled: typeof isScrollingProp === 'boolean'
});
```

### 2. Enhanced UnifiedCard Component

**File**: `frontend/components/ui/UnifiedCard.tsx`

**Improvements**:
- Reduced animation duration from 200ms to 150ms
- Added hardware acceleration properties (`backface-visibility`, `perspective`, `transform-style`)
- Optimized scroll state handling to prevent unnecessary re-renders
- Disabled local scroll detection when external state is provided

**Key Changes**:
```typescript
// Hardware acceleration properties
style={{ 
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  transformStyle: 'preserve-3d',
  willChange: 'transform'
}}

// Optimized scroll detection
const { isScrolling: localIsScrolling } = useScrollDetection({ 
  debounceMs: 150, 
  enableBodyClass: false,
  disabled: typeof isScrollingProp === 'boolean'
});
```

### 3. CSS Optimizations

**File**: `frontend/components/ui/UnifiedCard.module.css`

**Improvements**:
- Added hardware acceleration for all card elements
- Implemented scroll-aware transition disabling
- Added `contain: layout style paint` for better performance
- Optimized image rendering during scroll

**Key CSS Rules**:
```css
.unified-card {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  will-change: transform;
  contain: layout style paint;
}

/* Disable transitions during scroll */
.scrolling .unified-card,
.scrolling .unified-card * {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}
```

### 4. Global Scroll Optimizations

**File**: `frontend/app/globals.css`

**Improvements**:
- Added hardware acceleration to HTML and body elements
- Implemented `overscroll-behavior: contain` to prevent scroll chaining
- Added scroll-aware transition disabling globally
- Optimized image rendering during scroll

**Key CSS Rules**:
```css
html, body {
  transform: translateZ(0);
  backface-visibility: hidden;
}

body {
  overscroll-behavior: contain;
}

.scrolling * {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}
```

### 5. Shared Scroll Context

**File**: `frontend/app/layout.tsx`

**Improvements**:
- Added `ScrollProvider` to provide shared scroll state
- Prevents multiple scroll listeners across components
- Improves performance by centralizing scroll detection

**Implementation**:
```tsx
<ScrollProvider>
  <div className="min-h-full flex flex-col">
    {children}
  </div>
</ScrollProvider>
```

## Testing the Fixes

### 1. Visual Inspection

1. **Navigate to any page with cards** (eatery, marketplace, stores, etc.)
2. **Scroll slowly** - cards should not flicker or jump
3. **Scroll quickly** - cards should remain stable without visual artifacts
4. **Hover over cards** - smooth transitions should work when not scrolling

### 2. Developer Tools

1. **Open DevTools** and go to the Console
2. **Look for scroll detection indicator** in the bottom-right dev navigation
3. **Scroll state should show**: 🔄 (scrolling) or ⏸️ (not scrolling)
4. **Check Performance tab** - scroll events should be less frequent

### 3. Performance Testing

1. **Open DevTools Performance tab**
2. **Start recording** and scroll for 10-15 seconds
3. **Stop recording** and analyze:
   - Scroll events should be grouped and less frequent
   - Layout thrashing should be minimal
   - Paint operations should be smooth

### 4. Mobile Testing

1. **Test on mobile devices** or use DevTools device simulation
2. **Touch scroll** should be smooth without flickering
3. **Momentum scrolling** should work naturally
4. **No visual jumps** during scroll deceleration

## Expected Results

After implementing these fixes:

✅ **No more card flickering** during scroll  
✅ **Smoother scroll performance** with fewer events  
✅ **Better mobile experience** with touch scrolling  
✅ **Reduced CPU usage** during scroll operations  
✅ **Consistent visual behavior** across all card components  

## Troubleshooting

### If flickering persists:

1. **Check browser console** for errors
2. **Verify ScrollProvider** is wrapping the app correctly
3. **Check for conflicting CSS** that might override our optimizations
4. **Test with different scroll speeds** to identify edge cases

### Performance issues:

1. **Reduce debounce time** if scroll feels sluggish
2. **Increase threshold** if micro-movements still trigger
3. **Check for heavy components** that might be causing layout thrashing

## Browser Compatibility

These fixes work on all modern browsers:
- ✅ Chrome/Edge (Chromium-based)
- ✅ Firefox
- ✅ Safari (iOS/macOS)
- ✅ Mobile browsers

## Future Improvements

1. **Virtual scrolling** for very long lists
2. **Intersection Observer** for more efficient scroll detection
3. **CSS Container Queries** for responsive card layouts
4. **Web Animations API** for more performant animations

## Related Files

- `frontend/lib/hooks/useScrollDetection.ts` - Core scroll detection logic
- `frontend/components/ui/UnifiedCard.tsx` - Main card component
- `frontend/components/ui/UnifiedCard.module.css` - Card-specific styles
- `frontend/app/globals.css` - Global scroll optimizations
- `frontend/app/layout.tsx` - ScrollProvider integration
- `frontend/components/dev/DevNavigation.tsx` - Scroll state debugging
