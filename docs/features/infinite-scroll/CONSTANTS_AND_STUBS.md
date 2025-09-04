# Infinite Scroll - Constants & Code Stubs Reference

**Copy-paste code snippets for rapid development. All constants, types, and function signatures.**

---

## Configuration Constants

**File: `frontend/lib/config/infiniteScroll.constants.ts`**

```typescript
// Root margin for IntersectionObserver (viewport padding)
export const IS_ROOT_MARGIN = '0px 0px 512px 0px';

// Intersection threshold (Safari-compatible)
export const IS_THRESHOLD = 0;

// Viewport multiplier for load triggering
export const IS_MIN_REMAINING_VIEWPORT_MULTIPLIER = 2; // 2 * viewport height

// URL state throttling (non-negotiable minimum)
export const IS_REPLACE_STATE_THROTTLE_MS = 500;

// Manual fallback timing
export const IS_STARVATION_MS = 1500; // show "Load more" if observer starved

// Safari momentum scroll protection
export const IS_MAX_CONSEC_AUTOLOADS = 2; // max auto-loads without user scroll
export const IS_USER_SCROLL_DELTA_PX = 8; // minimum user scroll delta

// Feature flag
export const ENABLE_EATERY_INFINITE_SCROLL = true;

// Analytics session budgets
export const IS_ANALYTICS_MAX_EVENTS = 120;
export const IS_ANALYTICS_MAX_ERRORS = 40;
export const IS_MAX_RETRY_EPISODES_PER_SESSION = 5;

// Phase 2: Cursor constants
export const CURSOR_TTL_HOURS = 24;
export const ANCHOR_MAX_PAGES = 3; // max pages to search for anchor
export const SESSION_STORAGE_MAX_ENTRIES = 10;
export const SESSION_STORAGE_STALENESS_HOURS = 2;

// Phase 3: Virtualization constants
export const VIRTUALIZATION_ITEM_THRESHOLD = 200;
export const VIRTUALIZATION_RENDER_TIME_THRESHOLD_MS = 16;
export const HEIGHT_CACHE_MAX_ENTRIES = 4000;
export const VIRTUALIZATION_OVERSCAN = 5;
```

---

## TypeScript Types

```typescript
// Core infinite scroll types
export type LoadMoreArgs = { 
  signal: AbortSignal; 
  offset: number; 
  limit: number;
  cursor?: string;
  dataVersion?: string;
};

export type LoadResult = { 
  appended: number;
  nextCursor?: string;
  prevCursor?: string;
  hasMore?: boolean;
};

export type LoadFn = (args: LoadMoreArgs) => Promise<LoadResult>;

// Analytics event types
export type InfiniteLoadAttempt = { 
  reason: 'io' | 'manual'; 
  offset?: number; 
  cursor?: string;
  epoch: number;
  itemsBefore?: number;
};

export type InfiniteLoadSuccess = { 
  durationMs: number; 
  appended: number; 
  offset?: number;
  cursor?: string;
  epoch: number;
  hasMore?: boolean;
};

export type InfiniteLoadAbort = { 
  cause: string; 
  epoch: number;
  controllerReason?: string;
};

export type RestoreScroll = { 
  mode: 'offset' | 'cursor' | 'anchorId' | 'none'; 
  restoredY?: number; 
  dataVersionMatch?: boolean;
  anchorFound?: boolean;
};

export type RateLimitHit = { 
  retryAfterMs?: number; 
  episode: number;
  cumulativeWaitMs?: number;
};

// Phase 2: Cursor types
export type CursorPayload = {
  createdAt: string;
  id: string | number;
  sortKey: string;
  dir: 'next' | 'prev';
  ver: number;
  exp: number; // Unix timestamp
};

export type DataVersionInputs = {
  filters: Record<string, any>;
  roundedGeohash: string;
  featureFlags: Record<string, boolean>;
  experimentCohorts: Record<string, string>;
  materializedViewVersion: string;
  sortFunctionVersion: string;
};

// Phase 3: Virtualization types
export type VirtualizationMetrics = {
  totalItems: number;
  visibleItems: number;
  renderTimeMs: number;
  memoryUsageMB: number;
  heightCacheHitRate: number;
};

export type HeightCacheEntry = {
  height: number;
  heightVersion: string;
  breakpoint: string;
  timestamp: number;
};
```

---

## Hook Signatures

### Phase 1: useInfiniteScroll

```typescript
export interface UseInfiniteScrollOptions {
  limit: number;
  initialOffset?: number;
  reinitOnPageShow?: boolean;
  onAttempt?: (meta: { offset: number; epoch: number }) => void;
  onSuccess?: (meta: { appended: number; offset: number; epoch: number; durationMs: number }) => void;
  onAbort?: (meta: { cause: string; epoch: number }) => void;
  isBot?: boolean;
}

export interface UseInfiniteScrollReturn {
  state: {
    offset: number;
    hasMore: boolean;
    showManualLoad: boolean;
    epoch: number;
  };
  actions: {
    manualLoad: () => void;
    resetForFilters: () => void;
    attachSentinel: (el: HTMLElement | null) => void;
  };
}

export function useInfiniteScroll(
  loadMore: LoadFn, 
  options: UseInfiniteScrollOptions
): UseInfiniteScrollReturn;
```

### Phase 2: useUrlScrollState

```typescript
export interface SavedScrollState {
  cursor?: string;
  offset?: number;
  anchorId?: string;
  scrollY?: number;
  dataVersion: string;
  timestamp: number;
}

export function useUrlScrollState() {
  return {
    saveState: (dataVersion: string, state: Partial<SavedScrollState>) => void;
    loadState: (dataVersion: string) => SavedScrollState | null;
    clearStaleStates: () => void;
    computeDataVersion: (inputs: DataVersionInputs) => string;
  };
}
```

### Phase 3: useVirtualizedList

```typescript
export interface UseVirtualizedListOptions {
  items: Array<{ id: string | number }>;
  estimateSize: (id: string | number) => number;
  overscan?: number;
  measurementCache?: Map<string, HeightCacheEntry>;
  onMeasure?: (id: string | number, height: number) => void;
}

export function useVirtualizedList(options: UseVirtualizedListOptions) {
  return {
    containerRef: React.RefObject<HTMLDivElement>;
    totalSize: number;
    virtualItems: Array<{
      index: number;
      start: number;
      size: number;
      key: string | number;
    }>;
    measureElement: (id: string | number, element: HTMLElement) => void;
  };
}
```

---

## Backend Stubs

### Phase 2: Cursor Utilities

```python
# backend/utils/cursors.py
from typing import Dict, Tuple
import hmac
import json
import time
import base64
from hashlib import sha256

class CursorManager:
    def __init__(self, secret: bytes, ttl_hours: int = 24):
        self.secret = secret
        self.ttl_seconds = ttl_hours * 3600
        self.version = 1

    def encode_cursor(self, payload: Dict) -> str:
        """Encode payload to HMAC-signed cursor token"""
        data = {
            **payload,
            'ver': self.version,
            'exp': int(time.time()) + self.ttl_seconds
        }
        raw = json.dumps(data, separators=(',', ':'), sort_keys=True).encode()
        signature = hmac.new(self.secret, raw, sha256).digest()
        token = base64.urlsafe_b64encode(raw + b'.' + signature).decode().rstrip('=')
        return token

    def decode_cursor(self, token: str) -> Tuple[Dict, str]:
        """Decode and validate cursor token"""
        try:
            # Add padding and decode
            pad = '=' * (-len(token) % 4)
            raw = base64.urlsafe_b64decode(token + pad)
            rawdata, signature = raw.rsplit(b'.', 1)
            
            # Verify signature
            expected = hmac.new(self.secret, rawdata, sha256).digest()
            if not hmac.compare_digest(signature, expected):
                raise ValueError('invalid_signature')
            
            # Parse and validate payload
            data = json.loads(rawdata.decode())
            
            if data.get('ver') != self.version:
                raise ValueError('invalid_version')
            if int(data.get('exp', 0)) < int(time.time()):
                raise ValueError('expired')
            if data.get('dir') not in ('next', 'prev'):
                raise ValueError('invalid_direction')
                
            return data, data['dir']
            
        except (ValueError, json.JSONDecodeError, KeyError) as e:
            raise ValueError(f'invalid_cursor: {str(e)}')
```

### Phase 2: DataVersion Computation

```python
# backend/utils/data_version.py
import hashlib
import json
from typing import Dict, Any

def compute_data_version(
    filters: Dict[str, Any],
    rounded_geohash: str,
    feature_flags: Dict[str, bool],
    experiment_cohorts: Dict[str, str],
    materialized_view_version: str,
    sort_function_version: str
) -> str:
    """Compute server-authored data version hash"""
    
    inputs = {
        'filters': filters,
        'geo': rounded_geohash,
        'flags': feature_flags,
        'cohorts': experiment_cohorts,
        'schema': materialized_view_version,
        'sort': sort_function_version
    }
    
    # Canonical JSON with sorted keys
    canonical = json.dumps(inputs, sort_keys=True, separators=(',', ':')).encode()
    
    # Return first 16 chars of SHA256 hash
    return hashlib.sha256(canonical).hexdigest()[:16]

def round_geohash(lat: float, lng: float, precision: int = 2) -> str:
    """Round coordinates to prevent GPS jitter invalidation"""
    return f"{round(lat, precision)},{round(lng, precision)}"
```

---

## CSS Classes & Styles

```css
/* Infinite scroll specific styles */
.infinite-scroll-container {
  contain: layout style paint;
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.infinite-scroll-item {
  content-visibility: auto; /* Non-virtual path only */
  contain-intrinsic-size: 0 300px; /* Estimated height */
}

/* Back to top button */
.back-to-top-button {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 50;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.back-to-top-button:hover {
  opacity: 1;
}

/* Reduced motion compliance */
@media (prefers-reduced-motion: reduce) {
  .back-to-top-button,
  .infinite-scroll-container {
    transition: none;
  }
  
  * {
    scroll-behavior: auto !important;
  }
}

/* Virtualization container */
.virtualized-list-container {
  height: 100%;
  overflow: auto;
  contain: strict;
}

.virtualized-list-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}

/* SSR skeleton (Phase 3) */
.skeleton-item {
  aspect-ratio: 4/3; /* Match card aspect ratio */
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Environment Variables

```bash
# Phase 1: Basic configuration
ENABLE_EATERY_INFINITE_SCROLL=true
IS_ANALYTICS_ENABLED=true
IS_DEBUG_MODE=false

# Phase 2: Cursor configuration  
CURSOR_SECRET=your-hmac-secret-key-here
CURSOR_TTL_HOURS=24
DATA_VERSION_CACHE_TTL=300

# Phase 3: Virtualization configuration
VIRTUALIZATION_ENABLED=true
HEIGHT_CACHE_SIZE=4000
VIRTUALIZATION_THRESHOLD_ITEMS=200

# Analytics configuration
ANALYTICS_SAMPLE_RATE=0.1
ANALYTICS_MAX_EVENTS_PER_SESSION=120
```

---

## Utility Functions

```typescript
// URL state management
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// Performance measurement
export function measureRenderTime<T>(
  operation: () => T,
  onMeasure: (duration: number) => void
): T {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;
  onMeasure(duration);
  return result;
}

// Session storage helpers
export function setSessionItem(key: string, value: any): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to sessionStorage:', e);
  }
}

export function getSessionItem<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn('Failed to load from sessionStorage:', e);
    return defaultValue;
  }
}

// Bot detection
export function isBotUserAgent(userAgent: string = navigator.userAgent): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /crawling/i,
    /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
    /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i
  ];
  return botPatterns.some(pattern => pattern.test(userAgent));
}

// Geohash rounding
export function roundGeohash(lat: number, lng: number, precision: number = 2): string {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}
```

---

## Testing Helpers

```typescript
// Mock intersection observer for tests
export class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private elements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  // Test helper to trigger intersection
  triggerIntersection(element: Element, isIntersecting: boolean = true) {
    const entry = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRect: isIntersecting ? element.getBoundingClientRect() : new DOMRect(),
      rootBounds: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
      time: performance.now()
    } as IntersectionObserverEntry;

    this.callback([entry], this);
  }
}

// Setup for tests
export function setupInfiniteScrollTests() {
  // Mock IntersectionObserver
  global.IntersectionObserver = MockIntersectionObserver as any;
  
  // Mock performance.now
  global.performance = { now: () => Date.now() } as any;
  
  // Mock scrollTo
  global.scrollTo = jest.fn();
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? false : true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
```

---

## Usage Examples

```typescript
// Basic infinite scroll setup
const { state, actions } = useInfiniteScroll(
  async ({ signal, offset, limit }) => {
    const response = await fetch(`/api/restaurants?offset=${offset}&limit=${limit}`, { signal });
    const data = await response.json();
    return { appended: data.items.length };
  },
  {
    limit: 24,
    onSuccess: ({ appended, durationMs }) => {
      console.log(`Loaded ${appended} items in ${durationMs}ms`);
    }
  }
);

// Cursor-based loading (Phase 2)
const { state, actions } = useInfiniteScroll(
  async ({ signal, cursor }) => {
    const url = cursor 
      ? `/api/restaurants?cursor=${cursor}&dir=next`
      : '/api/restaurants?limit=24';
    const response = await fetch(url, { signal });
    const data = await response.json();
    return { 
      appended: data.items.length, 
      nextCursor: data.nextCursor,
      hasMore: !!data.nextCursor 
    };
  },
  { limit: 24 }
);
```

---

This reference provides all the constants, types, and code snippets needed for rapid infinite scroll development across all 3 phases.