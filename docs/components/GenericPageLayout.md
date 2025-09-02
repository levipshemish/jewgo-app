# GenericPageLayout

Location: `frontend/components/layout/GenericPageLayout.tsx`

Key props
- `items`: array to render.
- `renderItem`: function rendering each grid cell.
- `enableInfiniteScroll`, `hasNextPage`, `sentinelRef`: control infinite scrolling.
- `beforeItems`, `afterItems`, `header`, `navigation`, `actions`, `footer`: layout slots.
- `overlayInGrid?: React.ReactNode`: absolutely positioned overlay rendered inside the grid container. Useful for floating UI (e.g., a back-to-top button) that should sit over the last row of cards rather than in the sentinel area.

Overlay usage
```tsx
<GenericPageLayout
  items={items}
  overlayInGrid={
    <ScrollToTop strategy="absolute" bottomOffsetPx={12} size="compact" appearance="translucent" />
  }
  /* ... */
/>
```

Notes
- The grid container is `position: relative` so overlays can be anchored with `position: absolute`.
- The overlay wrapper disables pointer events except on its children, so only the overlay content is clickable.
