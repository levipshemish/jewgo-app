# Phase 3 — Virtualized Rendering Plan (Eatery Infinite Scroll)

Status: Planned • Scope: Frontend-only integration • Owner: Web

---

## Objectives
- Memory-stable long scroll sessions (≥20 min) without layout thrash.
- Render only visible rows + small overscan while preserving accessibility.
- Gate activation by real usage/perf signals; keep pagination fallback intact.

## Activation Gates
- Item count ≥ 200 OR measured render cost ≥ 12ms per append.
- User device class low/medium (based on UA heuristics or `navigator.hardwareConcurrency ≤ 4`).
- No devtools throttling detected; disabled when `prefers-reduced-motion` is set to reduce motion side-effects.

## Library & Approach
- Library: TanStack Virtual (react-virtual v3) `@tanstack/react-virtual@^3`.
- Strategy: Parent container virtualizer with fixed-estimate item height + LRU height cache for stabilization.
- SSR: Render first screen worth of skeleton rows; hydrate virtualizer without shifting (CLS ≤ 0.10).

## New File(s)
- `frontend/components/eatery/VirtualizedRestaurantList.tsx`
  - Props: `{ items: Restaurant[], renderItem(row: Restaurant), itemKey(r: Restaurant): Key }`
  - Internals: `useVirtualizer({ estimateSize, overscan: 6, getScrollElement })`
  - Height Cache: in-memory LRU keyed by `itemKey`, cap 300 entries, evict FIFO.
  - Dynamic import fallback to non-virtual list to avoid breaking builds before dependency is installed.

## Integration Points
- `frontend/app/eatery/EateryPageClient.tsx`
  - When `ENABLE_EATERY_INFINITE_SCROLL` is true and activation gates pass, render `VirtualizedRestaurantList` with `allRestaurants`.
  - Preserve existing sentinel at list end; only the row container becomes virtualized.
  - Keep BackToTopButton and analytics hooks unchanged.

## Height Cache Details
- Store: `Map<string, number>` with simple LRU metadata `{h, t}`; update on `onResize` using `ResizeObserver` per row.
- Seed: Use median of last 20 measured heights as `estimateSize` to reduce initial error.
- Breakpoints: Invalidate cache when `(width breakpoint)` changes (e.g., <768, 768–1024, >1024).

## Skeletons & SSR
- Server: Render `N = ceil(viewportHeight / estimateSize) + overscan` skeleton rows.
- Client: Hydrate virtualizer with same `estimateSize` to avoid reflow; replace skeletons as data arrives.

## Analytics & Telemetry
- Add IS Virtual metrics to existing analytics service:
  - `is.virtual.enabled` (bool), `is.virtual.overscan`, `is.virtual.estimate`
  - `is.virtual.measure.error` (px, p50/p95), `is.memory.mb` at 1/5/10/20 min
  - `is.append.ms` (p95) with virtualization vs non-virtual baseline

## Accessibility
- Rows are standard DOM elements in a scroll container; ensure focusable children remain tabbable.
- Maintain aria-live for “loading more” announcements.
- Respect `prefers-reduced-motion`; disable virtualization if it introduces perceptible jumpiness under reduced motion.

## Acceptance Criteria
- 20-minute scroll session shows ≤ 5% memory growth (steady-state GC observed).
- CLS ≤ 0.10 during initial hydration and subsequent appends.
- P95 append time ≤ 16ms on mid-tier mobile with virtualization enabled.
- No keyboard navigation regressions (Tab/Shift+Tab across visible items).

## Rollback Plan
- Feature flag `ENABLE_EATERY_INFINITE_SCROLL=false` reverts to pagination.
- Add `ENABLE_EATERY_VIRTUALIZATION` (new, default false) to disable virtualization only.
- Keep code paths side-by-side for one release; remove after metrics confirm stability.

## Step-by-Step Checklist
1) Add flag constant(s)
   - `frontend/lib/config/infiniteScroll.constants.ts`
     - `export const ENABLE_EATERY_VIRTUALIZATION = false;`
     - `export const IS_VIRTUAL_OVERSCAN = 6;`
2) Create `VirtualizedRestaurantList.tsx`
   - Container with `useVirtualizer`
   - Row wrapper that measures and updates LRU cache
3) Wire into `EateryPageClient.tsx`
   - If flags + activation gates true, render virtualized list; else fallback to existing list
4) Add analytics fields in `frontend/lib/services/analytics-service.ts`
   - Emit metrics listed above on enable/disable and periodically (throttled)
5) Add SSR skeletons
   - Reuse existing skeleton component or add minimal placeholder
6) Test scenarios
   - Mobile (≤768px), long session (≥20min), filter changes, back/forward, reduced-motion

## Tasks for Documentation (this PR)
- Link this plan from:
  - `docs/features/infinite-scroll/README.md`
  - `QUICK_REFERENCE.md` under Key Documentation
  - `TASKS.md` Phase 3 bullets

## Dependency Install (user-run; G‑OPS‑1)
Per G‑OPS‑1 (≤90s & no npm), install TanStack Virtual locally:

cd frontend && npm i @tanstack/react-virtual@^3

TypeScript note: An ambient declaration is included at `frontend/types/virtual-ambient.d.ts` to satisfy type-checks prior to install.

## User-Run Validation (per G-OPS-1)
- After implementation, locally run frontend build/tests (user-run):
  - `cd frontend && npm run build && npm run type-check && npm run lint`

---

This plan keeps Phase 3 additive and reversible, aligns with performance and a11y budgets, and minimizes risk via gating and flags.
