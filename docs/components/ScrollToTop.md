# ScrollToTop Component

Lightweight, accessible “Back to top” button used across list/grid pages.

Location: `frontend/components/ui/ScrollToTop.tsx`

Props
- `threshold?: number` — Multiplier of viewport/container height to show the button (default: `0.3`).
- `className?: string` — Additional classes for the button.
- `testMode?: boolean` — Bypass scroll listener for tests.
- `initialVisible?: boolean` — Initial visibility (primarily for tests).
- `showAfterRows?: number` — Only show after this many rows/items are loaded (default: `5`).
- `totalRows?: number` — Current number of rows/items loaded.
- `containerSelector?: string` — Optional CSS selector for a scrollable container. If omitted, window scroll is used.
- `position?: 'bottom-right' | 'right-center'` — Button position preset (default: `bottom-right`).
- `bottomOffsetPx?: number` — Bottom offset in pixels when using `bottom-right` (default: `96`).
- `size?: 'default' | 'compact'` — Visual size preset (compact is ~44–48px).
- `appearance?: 'solid' | 'translucent'` — Solid green or translucent glass button.
- `strategy?: 'fixed' | 'absolute'` — Positioning mode. Use `absolute` when rendering inside a positioned container.

Notes
- If your page uses a custom scroll container (e.g., a virtualized list with `overflow: auto`), pass `containerSelector` so visibility reacts to that container’s scroll.
- On click, the component scrolls the container (if provided) or the window to top; honors reduced motion preferences.

Example
```tsx
<ScrollToTop
  threshold={0.25}
  showAfterRows={5}
  totalRows={items.length}
  position="bottom-right"
  bottomOffsetPx={72}
  size="compact"
  appearance="translucent"
/>

Overlay inside grid (recommended for last-card overlay)

When using `GenericPageLayout`, pass the button through `overlayInGrid` to place it above the last card, not in the sentinel/trigger zone. Combine with `strategy="absolute"`:

```tsx
<GenericPageLayout
  items={items}
  overlayInGrid={
    <ScrollToTop
      threshold={0.15}
      showAfterRows={2}
      totalRows={items.length}
      position="bottom-right"
      strategy="absolute"
      bottomOffsetPx={12}
      size="compact"
      appearance="translucent"
    />
  }
  /* ...other props */
/>
```
```

Change Log
- 2025-09-02: Added `containerSelector`, `position`, and `bottomOffsetPx` props; switched default position to bottom-right for better UX on the eatery page. Added `size`, `appearance`, and `strategy` to support compact, translucent overlay anchored inside the grid.
