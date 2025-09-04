import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';
import {
  IS_MIN_REMAINING_VIEWPORT_MULTIPLIER,
  IS_STARVATION_MS,
  IS_MAX_CONSEC_AUTOLOADS,
  IS_USER_SCROLL_DELTA_PX,
} from '@/lib/config/infiniteScroll.constants';

export type LoadMoreArgs = { signal: AbortSignal; offset: number; limit: number };
export type LoadResult = { appended: number; hasMore?: boolean };
export type LoadFn = (args: LoadMoreArgs) => Promise<LoadResult>;

export type UseInfiniteScrollOpts = {
  limit: number;
  initialOffset?: number;
  reinitOnPageShow?: boolean;
  onAttempt?: (meta: { offset: number; epoch: number }) => void;
  onSuccess?: (meta: { appended: number; offset: number; epoch: number; durationMs: number }) => void;
  onAbort?: (meta: { cause: string; epoch: number }) => void;
  onFailure?: (meta: { error: string; consecutiveFailures: number; epoch: number }) => void;
  isBot?: boolean;
};

export function useInfiniteScroll(loadMore: LoadFn, opts: UseInfiniteScrollOpts) {
  const { limit, initialOffset = 0, reinitOnPageShow, onAttempt, onSuccess, onAbort, onFailure, isBot } = opts;

  // Debug logging - only in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  const [showManualLoad, setShowManualLoad] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [backoffUntil, setBackoffUntil] = useState<number | null>(null);

  const epochRef = useRef(0);
  const inFlightRef = useRef<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);
  const lastAppendAtRef = useRef<number>(performance.now());
  const consecAutoLoadsRef = useRef(0);
  const lastScrollYRef = useRef<number>(0);
  const starvationTimerRef = useRef<number | null>(null);

  // Initialize scroll position on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      lastScrollYRef.current = window.scrollY;
    }
  }, []);

  const clearStarvation = () => {
    if (typeof window !== 'undefined' && starvationTimerRef.current) {
      window.clearTimeout(starvationTimerRef.current);
      starvationTimerRef.current = null;
    }
  };

  const queueStarvation = () => {
    if (typeof window === 'undefined') return;
    clearStarvation();
    starvationTimerRef.current = window.setTimeout(() => {
      setShowManualLoad(true);
    }, IS_STARVATION_MS);
  };

  const canRequestAnother = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    
    // Don't request more if we're already at the bottom
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight) {
      if (isDevelopment) {
        console.log('Infinite scroll: At bottom of page, skipping request');
      }
      return false;
    }
    
    const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    const shouldRequest = remaining < IS_MIN_REMAINING_VIEWPORT_MULTIPLIER * window.innerHeight;
    
    if (isDevelopment) {
      console.log('Infinite scroll: canRequestAnother check - remaining:', remaining, 'shouldRequest:', shouldRequest, 'offset:', offset);
    }
    
    // CRITICAL FIX: Add safety check to prevent infinite loading
    // If we've already loaded a lot of content, be more conservative
    if (offset > 200) { // Reduced from 500 to be more conservative
      if (isDevelopment) {
        console.warn('Infinite scroll safety limit reached:', offset);
      }
      return false;
    }
    
    // Additional safety: if we're very close to the bottom, don't request more
    // This prevents the "always loading" state when user is at the bottom
    // BUT allow more content to load so users can see cards above the nav
    if (remaining < 10) { // Reduced from 20px to 10px for even more aggressive loading
      if (isDevelopment) {
        console.log('Infinite scroll: Too close to bottom, skipping request');
      }
      return false;
    }
    
    // BOTTOM NAVIGATION SAFETY: Allow cards to flow under bottom nav like they do under top nav
    // Only prevent loading when we're literally at the very bottom
    const bottomNavHeight = 88; // CSS variable --bottom-nav-height
    const safeAreaBottom = typeof window !== 'undefined' ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0') : 0;
    
    // Allow loading when there's enough space for at least one row of cards above the bottom nav
    // This ensures users can see more content while scrolling
    const minContentSpace = 200; // Minimum space needed to show meaningful content
    const totalBottomSpace = Math.max(bottomNavHeight + safeAreaBottom + 5, minContentSpace);
    
    if (remaining < totalBottomSpace) {
      if (isDevelopment) {
        console.log('Infinite scroll: Insufficient space above bottom nav, skipping request. Remaining:', remaining, 'Required:', totalBottomSpace);
      }
      return false;
    }
    
    if (isDevelopment) {
      console.log('Infinite scroll: canRequestAnother returning true - will load more content');
    }
    
    return shouldRequest;
  };

  const request = useCallback(async (source: string) => {
    if (!canRequestAnother()) return;
    
    if (isDevelopment) {
      console.log('Infinite scroll: request() called from source:', source, 'current offset:', offset, 'hasMore:', hasMore);
    }
    
    inFlightRef.current = true;
    const epoch = ++epochRef.current;
    
    try {
      const startTime = Date.now();
      const result = await loadMore({ signal: controllerRef.current?.signal || new AbortController().signal, offset, limit });
      const durationMs = Date.now() - startTime;
      
      if (isDevelopment) {
        console.log('Infinite scroll: loadMore completed successfully. Result:', result, 'epoch:', epoch, 'duration:', durationMs);
      }
      
      // Update state with new data
      setOffset(prevOffset => {
        const newOffset = prevOffset + result.appended;
        if (isDevelopment) {
          console.log('Infinite scroll: Updating state. Old offset:', prevOffset, 'appended:', result.appended, 'new offset:', newOffset);
        }
        return newOffset;
      });
      setHasMore(result.hasMore || false);
      setShowManualLoad(false);
      setConsecutiveFailures(0);
      setBackoffUntil(null);
      
      // Notify success
      onSuccess?.({ appended: result.appended, offset: offset + result.appended, epoch, durationMs });
      
    } catch (error: any) {
      if (isDevelopment) {
        console.log('Infinite scroll: loadMore failed. Error:', error, 'epoch:', epoch);
      }
      
      // Handle failure
      const isAbort = error instanceof Error && error.name === 'AbortError';
      if (!isAbort) {
        setConsecutiveFailures(prev => prev + 1);
        setBackoffUntil(Date.now() + Math.min(1000 * Math.pow(2, Math.min(consecutiveFailures, 5)), 8000)); // Exponential backoff, max 8s
        setShowManualLoad(true);
        
        onFailure?.({ error: error.message ?? 'error', consecutiveFailures: consecutiveFailures + 1, epoch });
      } else {
        onAbort?.({ cause: 'abort', epoch });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [canRequestAnother, loadMore, limit, offset, hasMore, onSuccess, onFailure, onAbort, consecutiveFailures]);

  const { setTarget } = useIntersectionObserver(
    () => {
      // Only trigger if we actually have more data to load
      if (hasMore && !inFlightRef.current) {
        if (isDevelopment) {
          console.log('Infinite scroll: Intersection observer triggered, loading more content. hasMore:', hasMore, 'offset:', offset);
        }
        queueStarvation();
        request('io');
      } else if (isDevelopment) {
        console.log('Infinite scroll: Intersection observer triggered but skipping - hasMore:', hasMore, 'inFlight:', !!inFlightRef.current, 'offset:', offset);
      }
    },
    { reinitOnPageShow, onHiddenAbort: controllerRef.current }
  );

  useEffect(() => {
    // starvation timer lifecycle
    return () => clearStarvation();
  }, []);

  // Cleanup effect to prevent memory leaks and excessive requests
  useEffect(() => {
    return () => {
      // Abort any pending requests on unmount
      if (controllerRef.current) {
        controllerRef.current.abort('component-unmount');
      }
      // Clear any pending timeouts
      clearStarvation();
    };
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
    setConsecutiveFailures(0);
    setBackoffUntil(null);
    // URL replace handled by caller (>=500ms throttle)
  };

  const attachSentinel = (el: HTMLElement | null) => setTarget?.(el ?? null);

  return {
    state: { offset, hasMore, showManualLoad, epoch: epochRef.current, consecutiveFailures, backoffUntil },
    actions: { manualLoad, resetForFilters, attachSentinel },
  };
}