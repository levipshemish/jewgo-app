# GenericPageLayout

The `GenericPageLayout` component provides a responsive grid container for listing pages. It replaces the legacy `restaurant-grid` rules with a CSS‑module based layout.

## Props

- `items`: array of data to render.
- `renderItem`: render function for each item.
- `getItemKey`: optional key extractor; defaults to index when omitted.
- `emptyRenderer`: optional function to render when `items` is empty.
- `minColumnWidth`: sets the `--min-col` CSS variable to control column count (default `150px`).
- `gridClassName`: merges additional grid classes with the default module class.
- `containerClassName`: optional class for the outer wrapper.
- `ariaColCount` / `ariaRowCount`: optional accessibility hints for grid dimensions.
- `header`, `navigation`, `actions`: optional React nodes rendered in a sticky top section.
- `beforeItems`, `afterItems`: optional content placed before or after the item grid.
- `footer`: optional React node rendered after the grid (e.g., bottom navigation).
- `as`: wrapper element, defaults to `section`.

### Accessibility

The grid uses `role="grid"` and `gridcell` semantics, `aria-busy`, and a polite live region for infinite scroll announcements.

## Eatery page parity

The layout matches the existing Eatery page with the following metrics:

- Grid gap: **8 px** on both axes
- Grid inner padding: **0.25 rem**
- Outer gutters: **1 rem / 1.5 rem / 2 rem** for mobile / tablet / desktop
- Column counts: **1 / 2 / 3 / 4 / 6 / 8** across breakpoints

Tuning column counts is done via the `minColumnWidth` prop which maps to the `--min-col` CSS variable.
The Eatery page sets `minColumnWidth="150px"` and the layout caps its width at **1440 px** to preserve the `1 / 2 / 3 / 4 / 6 / 8` column pattern across breakpoints while requesting items in groups of four rows.

## Theming

The layout uses a white background by default. Override `.pageContainer` or use `containerClassName` to theme the page background. Media queries handle reduced motion preferences.

## Infinite scroll vs. pagination

When `enableInfiniteScroll` is set, a sentinel element is rendered and observed via `IntersectionObserver`. Pagination can be implemented by the consumer with separate controls.

