# Infinite Scroll - Developer Execution Checklist

**Ready-to-paste implementation guide with function stubs and exact file changes.**

---

## Phase 1: Frontend-Only (Offset API)

**Files (5: 2 new, 3 modified) - No backend changes required**

### 1. Create Constants File

**File:** `frontend/lib/config/infiniteScroll.constants.ts` ✅ **NEW**

```typescript
// Constants used across IS implementation

export const IS_ROOT_MARGIN = '0px 0px 512px 0px';
export const IS_THRESHOLD = 0; // Safari-safe (no fractional thresholds)
export const IS_MIN_REMAINING_VIEWPORT_MULTIPLIER = 2; // 2 * viewport height
export const IS_REPLACE_STATE_THROTTLE_MS = 500; // locked
export const IS_STARVATION_MS = 1500; // show "Load more" if sentinel starves
export const IS_MAX_CONSEC_AUTOLOADS = 2; // momentum guard
export const IS_USER_SCROLL_DELTA_PX = 8; // require user delta between bursts

export const ENABLE_EATERY_INFINITE_SCROLL = true; // wire to your flag system

// Analytics budgets
export const IS_ANALYTICS_MAX_EVENTS = 120;
export const IS_ANALYTICS_MAX_ERRORS = 40;
export const IS_MAX_RETRY_EPISODES_PER_SESSION = 5;
```

**TODO:**
- [ ] Wire `ENABLE_EATERY_INFINITE_SCROLL` to your feature flag system

---

### 2. Create Infinite Scroll Hook

**File:** `frontend/lib/hooks/useInfiniteScroll.ts` ✅ **NEW**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';
import {
  IS_MIN_REMAINING_VIEWPORT_MULTIPLIER,
  IS_STARVATION_MS,
  IS_MAX_CONSEC_AUTOLOADS,
  IS_USER_SCROLL_DELTA_PX,
} from '@/lib/config/infiniteScroll.constants';

export type LoadMoreArgs = { signal: AbortSignal; offset: number; limit: number };
export type LoadResult = { appended: number };
export type LoadFn = (args: LoadMoreArgs) => Promise<LoadResult>;

export type UseInfiniteScrollOpts = {
  limit: number;
  initialOffset?: number;
  reinitOnPageShow?: boolean;
  onAttempt?: (meta: { offset: number; epoch: number }) => void;
  onSuccess?: (meta: { appended: number; offset: number; epoch: number; durationMs: number }) => void;
  onAbort?: (meta: { cause: string; epoch: number }) => void;
  isBot?: boolean;
};

export function useInfiniteScroll(loadMore: LoadFn, opts: UseInfiniteScrollOpts) {
  const { limit, initialOffset = 0, reinitOnPageShow, onAttempt, onSuccess, onAbort, isBot } = opts;

  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  const [showManualLoad, setShowManualLoad] = useState(false);

  const epochRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastAppendAtRef = useRef<number>(performance.now());
  const consecAutoLoadsRef = useRef(0);
  const lastScrollYRef = useRef<number>(window.scrollY);
  const starvationTimerRef = useRef<number | null>(null);

  const clearStarvation = () => {
    if (starvationTimerRef.current) {
      window.clearTimeout(starvationTimerRef.current);
      starvationTimerRef.current = null;
    }
  };

  const queueStarvation = () => {
    clearStarvation();
    starvationTimerRef.current = window.setTimeout(() => {
      setShowManualLoad(true);
    }, IS_STARVATION_MS);
  };

  const canRequestAnother = () => {
    const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    return remaining < IS_MIN_REMAINING_VIEWPORT_MULTIPLIER * window.innerHeight;
  };

  const request = useCallback((reason: 'io'|'manual') => {
    if (!hasMore || isBot) return;
    if (!canRequestAnother()) return;

    // momentum guard: require user delta between bursts
    if (reason === 'io') {
      const dy = Math.abs(window.scrollY - lastScrollYRef.current);
      if (dy < IS_USER_SCROLL_DELTA_PX) {
        if (consecAutoLoadsRef.current >= IS_MAX_CONSEC_AUTOLOADS) return;
        consecAutoLoadsRef.current += 1;
      } else {
        consecAutoLoadsRef.current = 0;
        lastScrollYRef.current = window.scrollY;
      }
    }

    // enforce ≤1 pending request
    if (inFlightRef.current) return;

    const start = performance.now();
    const currentEpoch = epochRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;

    onAttempt?.({ offset, epoch: currentEpoch });

    inFlightRef.current = (async () => {
      try {
        const { appended } = await loadMore({ signal: controller.signal, offset, limit });
        const dur = performance.now() - start;
        lastAppendAtRef.current = performance.now();
        setOffset(o => o + appended);
        setHasMore(appended >= limit); // heuristic
        setShowManualLoad(false);
        onSuccess?.({ appended, offset, epoch: currentEpoch, durationMs: dur });
      } catch (e: any) {
        if (controller.signal.aborted) {
          onAbort?.({ cause: String(controller.signal.reason ?? 'aborted'), epoch: currentEpoch });
        } else {
          setShowManualLoad(true);
          onAbort?.({ cause: e?.message ?? 'error', epoch: currentEpoch });
        }
      } finally {
        inFlightRef.current = null;
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, limit, hasMore, isBot]);

  const { setTarget } = useIntersectionObserver(
    () => {
      queueStarvation();
      request('io');
    },
    { reinitOnPageShow, onHiddenAbort: controllerRef.current }
  );

  useEffect(() => {
    // starvation timer lifecycle
    return () => clearStarvation();
  }, []);

  // public API
  const manualLoad = () => { request('manual'); };
  const resetForFilters = () => {
    epochRef.current += 1;
    controllerRef.current?.abort('filter-change');
    consecAutoLoadsRef.current = 0;
    setShowManualLoad(false);
    setOffset(0);
    setHasMore(true);
    // URL replace handled by caller (>=500ms throttle)
  };

  const attachSentinel = (el: HTMLElement | null) => setTarget(el!);

  return {
    state: { offset, hasMore, showManualLoad, epoch: epochRef.current },
    actions: { manualLoad, resetForFilters, attachSentinel },
  };
}
```

**TODO:**
- [ ] Test epoch increment on filter changes
- [ ] Verify ≤1 request per rAF enforcement
- [ ] Test starvation fallback timing

---

### 3. Create Back to Top Button

**File:** `frontend/components/common/BackToTopButton.tsx` ✅ **NEW**

```tsx
'use client';
import React from 'react';

export default function BackToTopButton() {
  const onClick = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to top"
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg px-4 py-3 text-sm font-medium bg-black text-white opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{ minWidth: 44, minHeight: 44 }}
    >
      ↑ Top
    </button>
  );
}
```

**TODO:**
- [ ] Add visibility toggle based on scroll position
- [ ] Style to match your design system
- [ ] Test reduced-motion preference handling

---

### 4. Extend IntersectionObserver Hook

**File:** `frontend/lib/hooks/useIntersectionObserver.ts` ✅ **MODIFY**

```typescript
import { useEffect, useRef } from 'react';
import {
  IS_ROOT_MARGIN, IS_THRESHOLD
} from '@/lib/config/infiniteScroll.constants';

type Options = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
  reinitOnPageShow?: boolean; // NEW
  onHiddenAbort?: AbortController | null; // optional: abort on tab hide
};

export function useIntersectionObserver(
  onIntersect: (entry: IntersectionObserverEntry) => void,
  opts: Options = {}
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const rootMargin = opts.rootMargin ?? IS_ROOT_MARGIN;
    const threshold = opts.threshold ?? IS_THRESHOLD;

    const io = new IntersectionObserver((entries) => {
      // Only consider first entry for sentinel
      const entry = entries[0];
      if (entry?.isIntersecting) onIntersect(entry);
    }, { root: opts.root ?? null, rootMargin, threshold });

    observerRef.current = io;
    if (targetRef.current) io.observe(targetRef.current);

    // bfcache re-init
    const onPageShow = (e: PageTransitionEvent) => {
      if (opts.reinitOnPageShow && e.persisted) {
        io.disconnect();
        if (targetRef.current) io.observe(targetRef.current);
      }
    };
    window.addEventListener('pageshow', onPageShow);

    // Abort pending work when tab hidden (optional)
    const onVis = () => {
      if (document.visibilityState === 'hidden' && opts.onHiddenAbort) {
        opts.onHiddenAbort.abort('visibility-hidden');
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [opts.root, opts.rootMargin, opts.threshold, opts.reinitOnPageShow, opts.onHiddenAbort]);

  return { setTarget: (el: HTMLElement | null) => { targetRef.current = el; if (observerRef.current && el) observerRef.current.observe(el); } };
}
```

**TODO:**
- [ ] Preserve existing API compatibility
- [ ] Test bfcache re-initialization
- [ ] Verify visibility change abort handling

---

### 5. Add Analytics Events

**File:** `frontend/lib/services/analytics-service.ts` ✅ **MODIFY**

```typescript
import {
  IS_ANALYTICS_MAX_EVENTS,
  IS_ANALYTICS_MAX_ERRORS,
  IS_MAX_RETRY_EPISODES_PER_SESSION,
} from '@/lib/config/infiniteScroll.constants';

type InfiniteLoadAttempt = { reason: 'io'|'manual'; offset?: number; epoch: number };
type InfiniteLoadSuccess = { durationMs: number; appended: number; offset?: number; epoch: number };
type InfiniteLoadAbort = { cause: string; epoch: number };
type RestoreScroll = { mode: 'offset'|'cursor'|'anchorId'|'none'; restoredY?: number; dataVersionMatch?: boolean };
type RateLimitHit = { retryAfterMs?: number; episode: number };

let eventCount = 0, errorCount = 0, retryEpisodes = 0;

export const ISAnalytics = {
  resetBudgets() { eventCount = errorCount = retryEpisodes = 0; },

  trackAttempt(payload: InfiniteLoadAttempt) {
    if (eventCount >= IS_ANALYTICS_MAX_EVENTS) return;
    eventCount++;
    // TODO: wire to your analytics sink
    console.log('IS_ANALYTICS: load_attempt', payload);
  },

  trackSuccess(payload: InfiniteLoadSuccess) {
    if (eventCount >= IS_ANALYTICS_MAX_EVENTS) return;
    eventCount++;
    // TODO: wire to your analytics sink
    console.log('IS_ANALYTICS: load_success', payload);
  },

  trackAbort(payload: InfiniteLoadAbort) {
    if (errorCount >= IS_ANALYTICS_MAX_ERRORS) return;
    errorCount++;
    // TODO: wire to your analytics sink
    console.log('IS_ANALYTICS: load_abort', payload);
  },

  trackRestore(payload: RestoreScroll) {
    if (eventCount >= IS_ANALYTICS_MAX_EVENTS) return;
    eventCount++;
    // TODO: wire to your analytics sink
    console.log('IS_ANALYTICS: restore_scroll', payload);
  },

  trackRateLimit(payload: RateLimitHit) {
    if (retryEpisodes >= IS_MAX_RETRY_EPISODES_PER_SESSION) return;
    retryEpisodes++;
    // TODO: wire to your analytics sink
    console.log('IS_ANALYTICS: rate_limit_hit', payload);
  },
};
```

**TODO:**
- [ ] Replace console.log with your analytics service
- [ ] Test session budget enforcement
- [ ] Verify PII scrubbing

---

### 6. Transform EateryPageClient

**File:** `frontend/app/eatery/EateryPageClient.tsx` ✅ **MODIFY**

```typescript
// Add these imports to your existing imports
import BackToTopButton from '@/components/common/BackToTopButton';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { IS_REPLACE_STATE_THROTTLE_MS, ENABLE_EATERY_INFINITE_SCROLL } from '@/lib/config/infiniteScroll.constants';
import { ISAnalytics } from '@/lib/services/analytics-service';

// Add these inside your component
export default function EateryPageClient() {
  // ... existing state ...
  const [lastReplaceAt, setLastReplaceAt] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Replace your existing fetch logic with this
  const fetchMore = useCallback(async ({ signal, offset, limit }: { signal: AbortSignal; offset: number; limit: number }) => {
    const url = new URL('/api/restaurants-with-filters', window.location.origin);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(limit));
    
    // TODO: add current filters/sort into query params
    // url.searchParams.set('search', searchQuery);
    // Object.entries(activeFilters).forEach(([key, value]) => {
    //   if (value) url.searchParams.set(key, String(value));
    // });

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json(); // expects {data: {restaurants: ...}} shape
    
    // Dedup BEFORE setState (non-negotiable)
    setRestaurants(prev => {
      const existingIds = new Set(prev.map(r => String(r.id)));
      const incoming = (data.data?.restaurants ?? []).filter((r: any) => !existingIds.has(String(r.id)));
      return [...prev, ...incoming];
    });
    
    return { appended: (data.data?.restaurants ?? []).length };
  }, [/* add your filter dependencies */]);

  const { state, actions } = useInfiniteScroll(fetchMore, {
    limit: 24,
    reinitOnPageShow: true,
    isBot: false, // TODO: wire UA detection - navigator.userAgent check
    onAttempt: ({ offset, epoch }) => {
      ISAnalytics.trackAttempt({ reason: 'io', offset, epoch });
    },
    onSuccess: ({ appended, offset, durationMs, epoch }) => {
      ISAnalytics.trackSuccess({ durationMs, appended, offset, epoch });
      
      // URL offset persistence (throttled)
      const now = performance.now();
      if (now - lastReplaceAt >= IS_REPLACE_STATE_THROTTLE_MS) {
        const u = new URL(window.location.href);
        u.searchParams.set('offset', String((offset ?? 0) + appended));
        history.replaceState(null, '', u.toString());
        setLastReplaceAt(now);
      }
    },
    onAbort: ({ cause, epoch }) => {
      ISAnalytics.trackAbort({ cause, epoch });
    },
  });

  // Filter change handler - call this when filters change
  const handleFiltersChange = useCallback((newFilters: any) => {
    // Reset infinite scroll state
    actions.resetForFilters();
    
    // Reset URL to offset=0
    const u = new URL(window.location.href);
    u.searchParams.delete('offset');
    history.replaceState(null, '', u.toString());
    
    // Apply your filter logic here
    // setActiveFilters(newFilters);
  }, [actions]);

  // Attach sentinel when component mounts
  useEffect(() => {
    if (sentinelRef.current) actions.attachSentinel(sentinelRef.current);
  }, [actions]);

  // Bot/flag fallback
  if (!ENABLE_EATERY_INFINITE_SCROLL) {
    // TODO: render existing pagination path for bots/flag-off
    return <div>Infinite scroll disabled - render pagination here</div>;
  }

  return (
    <div className="min-h-screen bg-transparent eatery-page page-with-bottom-nav">
      {/* ... existing header/filter UI ... */}
      
      {/* Restaurant grid */}
      <div 
        className="restaurant-grid px-2 sm:px-4 lg:px-6"
        role="grid"
        aria-label="Restaurant listings"
      >
        {restaurantsWithDistance.map((restaurant: any, index: number) => (
          // ... your existing UnifiedCard rendering ...
        ))}
      </div>

      {/* Loading state */}
      <div aria-live="polite" className="sr-only">
        {state.showManualLoad ? 'Manual load available' : ''}
      </div>

      {/* Sentinel element for intersection observer */}
      {state.hasMore && (
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
      )}

      {/* Manual load fallback button */}
      {state.showManualLoad && (
        <div className="flex justify-center py-4">
          <button 
            onClick={() => actions.manualLoad()} 
            className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
          >
            Load more restaurants
          </button>
        </div>
      )}

      <BackToTopButton />
      
      {/* ... rest of your existing UI ... */}
    </div>
  );
}
```

**TODO:**
- [ ] Wire `handleFiltersChange` to your actual filter change events
- [ ] Add your current filter/search params to `fetchMore`
- [ ] Implement bot UA detection
- [ ] Test sentinel attachment and intersection triggering
- [ ] Verify deduplication works with your restaurant data structure

---

## Phase 1 Acceptance Checklist

### Performance Requirements
- [ ] **≤1 request per rAF** - verified via browser DevTools
- [ ] **CLS ≤0.10** across first 5 appends - measured via Lighthouse
- [ ] **P95 append ≤16ms** on mid-tier iPhone - performance.mark timing

### Functionality Requirements  
- [ ] **BFCACHE restore** → no double append on back/forward navigation
- [ ] **Filter change mid-flight** → zero duplicates via Set-based dedup
- [ ] **Starvation fallback** → "Load more" appears within 1.5s
- [ ] **Momentum guard** → max 2 auto-loads without 8px user scroll

### Safari/iOS Specific
- [ ] **Observer re-init** on pageshow(persisted) event
- [ ] **Visibility abort** on tab hide
- [ ] **Smooth scroll** respects prefers-reduced-motion

### Analytics
- [ ] **Session budgets** enforced (≤120 events, ≤40 errors)
- [ ] **Event tracking** works for attempt/success/abort
- [ ] **No PII** in analytics payloads

---

## Next: Phase 2 Implementation

After Phase 1 is complete and tested, proceed to:
- [Phase 2 Backend Cursor Implementation](./PHASE_2_BACKEND_CHECKLIST.md)
- [PR Template for Phase 1](./PR_TEMPLATES.md#phase-1)

---

## Critical Rules (Must Follow)

1. **Dedup before state commit** - Always use Set-based deduplication
2. **Single in-flight request** - Enforce via `inFlightRef` 
3. **Epoch on filter change** - Increment epoch, abort existing, reset state
4. **Bot fallback** - Serve pagination for bots, no IntersectionObserver
5. **CLS prevention** - No height transitions during appends
6. **Accessibility** - aria-live announcements, keyboard access, reduced motion