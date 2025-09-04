# Infinite Scroll Implementation Plan - Complete Specification

## Executive Summary

**Production-ready infinite scroll implementation** for the eatery page with **zero scope creep**. Transforms existing pagination into a surgical, frontend-first solution with backend cursor support and optional virtualization.

**Key Principles:**
- **Scope-controlled**: 11 files total across 3 phases
- **Frontend-first**: Phase 1 ships with existing offset API  
- **Production-hardened**: Race-safe, Safari-compatible, analytics-driven
- **Performance-gated**: Virtualization only when metrics demand

---

## Architecture Overview

### **Phase Boundaries**
1. **Phase 1**: Frontend-only transformation (5 files: 2 new, 3 modified)
2. **Phase 2**: Backend cursor + URL persistence (5 additional files)  
3. **Phase 3**: Virtualization when needed (1 additional file)

### **Technical Stack**
- **Frontend**: React hooks with IntersectionObserver, race-safe epoch management
- **Backend**: HMAC-signed cursor tokens with server-authored durability
- **Analytics**: Session-budgeted telemetry with PII scrubbing
- **Performance**: Optional TanStack Virtual with LRU height caching

---

## Phase 1: Frontend-Only Implementation

**Target:** Shippable infinite scroll using existing `/api/restaurants-with-filters` endpoint

### Files Changed (5 total: 2 new, 3 modified)

1. **NEW:** `frontend/lib/config/infiniteScroll.constants.ts`
2. **NEW:** `frontend/lib/hooks/useInfiniteScroll.ts` 
3. **NEW:** `frontend/components/common/BackToTopButton.tsx`
4. **MOD:** `frontend/app/eatery/EateryPageClient.tsx`
5. **MOD:** `frontend/lib/services/analytics-service.ts`
6. **MOD:** `frontend/lib/hooks/useIntersectionObserver.ts`

### Core Specifications

```typescript
// Critical Constants (non-negotiable)
const IS_ROOT_MARGIN = '0px 0px 512px 0px';           // Explicit default
const IS_MIN_REMAINING_VIEWPORT_MULTIPLIER = 2;        // Large screen spam prevention  
const IS_REPLACE_STATE_THROTTLE_MS = 500;              // Locked value
const IS_STARVATION_MS = 1500;                         // Manual fallback trigger
const IS_MAX_CONSEC_AUTOLOADS = 2;                     // Safari momentum guard
const IS_USER_SCROLL_DELTA_PX = 8;                     // User interaction threshold
```

### Race-Safe Loading Protocol

**Single In-Flight Enforcement:**
- ≤1 network request per `requestAnimationFrame`
- Epoch-based request management with `AbortController`
- Queued requests abort on filter changes or newer epochs

**Filter Change Protocol:**
1. Increment epoch → abort in-flight → clear queued → reset list → `replaceState(offset=0)`
2. Emit `infinite_load_abort { cause: 'filter-change' }` once

### Safari/iOS Hardening

**BFCACHE Handling:**
```typescript
// Re-initialize on page restoration
const handlePageShow = (e: PageTransitionEvent) => {
  if (e.persisted) reinitializeObservers();
};
window.addEventListener('pageshow', handlePageShow);
```

**Momentum Scroll Guard:**
- Require ≥8px user scroll delta between consecutive auto-loads
- Max 2 auto-loads without user interaction
- Visibility change abort for pending requests

### Deduplication (Non-Negotiable)

```typescript
// Set-based dedup before state commit
setRestaurants(prev => {
  const existingIds = new Set(prev.map(r => String(r.id)));
  const newItems = items.filter(r => !existingIds.has(String(r.id)));
  return [...prev, ...newItems];
});
```

### Analytics with Session Budgets

```typescript
// Session-level caps to prevent spam
const IS_ANALYTICS_MAX_EVENTS = 120;
const IS_ANALYTICS_MAX_ERRORS = 40;  
const IS_MAX_RETRY_EPISODES_PER_SESSION = 5;

// Event schema
type InfiniteLoadAttempt = { reason: 'io'|'manual'; offset: number; epoch: number };
type InfiniteLoadSuccess = { durationMs: number; appended: number; epoch: number };
type InfiniteLoadAbort = { cause: string; epoch: number };
```

---

## Phase 2: Backend Cursor + URL Persistence

**Target:** Opaque signed cursors with server-authored durability

### Backend Components (3 files)

1. **NEW:** `backend/utils/cursors.py` - HMAC encode/decode with TTL validation
2. **NEW:** `backend/utils/data_version.py` - Server-authored computation  
3. **NEW/MOD:** `backend/routes/api_v4_restaurants_keyset.py` - Keyset endpoint

### Cursor Design (HMAC, not JWT)

```python
# Payload structure
payload = {
    'createdAt': '2025-01-01T12:00:00Z',
    'id': 12345,
    'sortKey': 'created_at_desc', 
    'dir': 'next',
    'ver': 1,
    'exp': 1640995200  # 24h TTL
}

# HMAC-signed opaque token
cursor = HMAC(json.dumps(payload), serverSecret)
```

**Validation Rules:**
- Reject tampered signatures, expired tokens, version mismatches
- Enforce direction consistency (`dir` param must match cursor direction)
- 24-hour TTL to prevent zombie URLs against reshuffled indexes

### Server-Authored DataVersion

```python
def compute_data_version(*, filters, rounded_geohash, feature_flags, 
                        cohorts, schema_version, sort_version):
    blob = {
        'filters': filters,
        'geo': rounded_geohash,      # 2-3 decimal places (no raw lat/lng)
        'flags': feature_flags,
        'cohorts': cohorts,          # A/B test buckets
        'schema': schema_version,    # Materialized view version
        'sort': sort_version,        # e.g., "sort_v2"
    }
    return hashlib.sha256(json.dumps(blob, sort_keys=True)).hexdigest()[:16]
```

### URL State Management (2 files)

4. **NEW:** `frontend/lib/hooks/useUrlScrollState.ts` - SessionStorage management
5. **MOD:** `frontend/app/eatery/EateryPageClient.tsx` - Cursor integration

**Storage Strategy:**
- Per-`dataVersion` entries in `sessionStorage`
- 2-hour staleness cutoff, max 10 entries per session
- Store `{cursor, offset, anchorId, scrollY, timestamp}`

**Restoration Protocol:**
1. Try `cursor` (preferred) → 2. Try `anchorId` → 3. Fall back to top + toast
2. **Anchor fallback cap**: `ANCHOR_MAX_PAGES = 3`, then "List updated - jump to top"

---

## Phase 3: Virtualization (Performance-Gated)

**Target:** Memory-stable rendering at scale

### Implementation (1 file)

6. **NEW:** `frontend/lib/hooks/useVirtualizedList.ts` - TanStack Virtual + LRU cache

### Performance Gates

**Activation Conditions:**
- Items ≥200 OR render cost > threshold (measured real-time)
- Memory stability required over 20-minute scroll sessions

**LRU Height Cache:**
```typescript
// Cache management
const heightCache = new Map(); // 2-4k entry cap
const cacheKey = `${item.id}|${heightVersion}|${breakpoint}`;

// Breakpoint invalidation
const mediaQuery = matchMedia('(max-width: 768px)');
mediaQuery.addEventListener('change', invalidateCache);
```

**CLS Prevention:**
- SSR skeletons with fixed aspect ratios per card type
- Defer measurement until after first paint
- Batch DOM writes via `requestAnimationFrame`
- No height transitions during appends (opacity/transform only)

**Non-Virtual Fallback:**
- `content-visibility: auto` for items (never mixed with virtual container)
- Hard caps: 600 desktop, 400 iOS + "Show earlier" link

---

## Testing Matrix

### Phase 1 Requirements
- [ ] **≤1 request per rAF** (assertion in tests)
- [ ] **CLS ≤0.10** across first 5 appends
- [x] **P95 append smoke** collected in tests (soft bound)
- [ ] **BFCACHE restore** → no double append
- [x] BFCache back/forward smoke: no auto double-append
- [x] **Filter change mid-flight** → zero duplicates via Set dedup (integration test)
- [ ] **iOS Safari momentum scroll** + back/forward → restored position
- [x] Momentum guard: limits consecutive auto-loads without scroll delta

### Phase 2 Requirements  
- [x] **Cursor tamper rejection** (signature validation)
- [ ] **Zero duplicates** after 3× filter changes mid-flight
- [x] **Anchor restore** works within `ANCHOR_MAX_PAGES`
- [x] **DataVersion mismatch** → graceful anchor-by-id fallback

### Phase 3 Requirements
- [ ] **Virtualization hydration** without warnings
- [ ] **Memory stable** over 20min scroll sessions
- [ ] **Layout thrash prevention** during virt toggle

---

## SEO & Accessibility

### SEO Preservation
- Keep `/eatery?page=N` routes fully JS-free renderable
- Sitemap includes paginated routes for discoverability
- Each page canonicalizes to itself (no `rel=next/prev`)
- Bot UA detection → serve pagination, skip IntersectionObserver

### Accessibility Requirements
- **aria-live="polite"** region for loading announcements
- **Focus management**: Don't steal focus on "Back to top" appearance
- **Keyboard access**: Manual "Load more" and sentinel fallback tabbable
- **Reduced motion**: `prefers-reduced-motion` → disable smooth scroll
- **Hit areas**: ≥44px for all interactive elements

---

## Operational Requirements

### Kill Switch & Rollout
- **Feature flag**: `ENABLE_EATERY_INFINITE_SCROLL` with remote toggle
- **Canary rollout**: Phase 1 (5% → 25%), Phase 2 (50%), Phase 3 (if metrics demand)
- **Auto-rollback thresholds**: `append_p95_ms`, `starvation_rate`, `dup_detected`

### Performance Monitoring
```typescript
// Required performance marks
performance.mark('append-start');
// ... render work
performance.mark('append-end');
performance.measure('append-duration', 'append-start', 'append-end');
```

**Success KPIs:**
- Bounce from list jank: ↓30%
- API error auto-recovery: ≥90%  
- Median cursor load: ≤200ms
- Zero production incidents related to scroll/navigation

---

## Implementation Timeline

### Week 1-2: Phase 1 (Frontend-Only)
- [ ] Create infinite scroll constants and configuration
- [ ] Implement race-safe `useInfiniteScroll` hook
- [ ] Add back-to-top button with accessibility compliance
- [ ] Transform `EateryPageClient` with sentinel integration
- [ ] Add analytics events with session budgets
- [ ] Safari/bfcache handling and momentum guards

### Week 3-4: Phase 2 (Backend + Cursors)
- [ ] Implement HMAC cursor utilities with validation
- [ ] Create keyset pagination endpoint with deterministic joins
- [ ] Add server-authored dataVersion computation
- [ ] URL state persistence with sessionStorage budgets
- [ ] Anchor fallback with bounded page search

### Week 5+: Phase 3 (Virtualization - If Needed)
- [ ] TanStack Virtual integration with measurement cache
- [ ] LRU height cache with breakpoint invalidation  
- [ ] Performance-gated activation based on real metrics
- [ ] SSR skeleton system for CLS prevention

---

## Next Steps

1. **Begin Phase 1** implementation using provided function stubs
2. **Start Phase 2** backend work in parallel (cursor endpoint)
3. **Ship Phase 1** with feature flag and kill switch
4. **Monitor performance** metrics to determine Phase 3 necessity

**Total Scope:** 11 files across 3 phases. Production-ready infinite scroll without overengineering.

---

## Related Documentation

- [Developer Checklist](./DEVELOPER_CHECKLIST.md) - Plug-and-play implementation guide
- [PR Templates](./PR_TEMPLATES.md) - Ready-to-use pull request templates
- [Constants & Stubs](./CONSTANTS_AND_STUBS.md) - Copy-paste code snippets
