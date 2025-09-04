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

  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  const [showManualLoad, setShowManualLoad] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [backoffUntil, setBackoffUntil] = useState<number | null>(null);

  const epochRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
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
      return false;
    }
    
    const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    const shouldRequest = remaining < IS_MIN_REMAINING_VIEWPORT_MULTIPLIER * window.innerHeight;
    
    // CRITICAL FIX: Add safety check to prevent infinite loading
    // If we've already loaded a lot of content, be more conservative
    if (offset > 500) { // Reduced from 1000 to be more conservative
      console.warn('Infinite scroll safety limit reached:', offset);
      return false;
    }
    
    // Additional safety: if we're very close to the bottom, don't request more
    // This prevents the "always loading" state when user is at the bottom
    if (remaining < 100) { // 100px threshold
      return false;
    }
    
    // Debug logging for infinite loading detection
    if (process.env.NODE_ENV === 'development' && shouldRequest) {
      console.log('🔍 Infinite Scroll Request Check:', {
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        remaining,
        threshold: IS_MIN_REMAINING_VIEWPORT_MULTIPLIER * window.innerHeight,
        shouldRequest,
        currentOffset: offset
      });
    }
    
    return shouldRequest;
  };

  const request = useCallback((reason: 'io'|'manual') => {
    if (!hasMore || isBot) return;
    if (!canRequestAnother()) return;
    if (typeof window === 'undefined') return;
    
    // Additional safety check: if we've already loaded a lot of items, be more conservative
    if (offset > 1000) { // Arbitrary limit to prevent runaway loading
      console.warn('Infinite scroll safety limit reached:', offset);
      setHasMore(false);
      return;
    }
    
    // CRITICAL FIX: Add request count safety to prevent infinite loops
    const requestCount = epochRef.current;
    if (requestCount > 50) { // Arbitrary limit to prevent infinite requests
      console.error('Infinite scroll request limit reached:', requestCount);
      setHasMore(false);
      return;
    }
    
    // Check if we're in backoff period
    if (backoffUntil && Date.now() < backoffUntil) return;

    // Additional safety: prevent rapid successive requests
    const now = Date.now();
    if (lastAppendAtRef.current && (now - lastAppendAtRef.current) < 500) { // 500ms minimum between requests
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 Skipping request - too soon after last append:', now - lastAppendAtRef.current);
      }
      return;
    }

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
        const { appended, hasMore: hasMoreFromServer } = await loadMore({ signal: controller.signal, offset, limit });
        const dur = performance.now() - start;
        lastAppendAtRef.current = performance.now();
        setOffset(o => o + appended);
        setHasMore(typeof hasMoreFromServer === 'boolean' ? hasMoreFromServer : false);
        setShowManualLoad(false);
        
        // Reset failure count and backoff on success
        setConsecutiveFailures(0);
        setBackoffUntil(null);
        
        onSuccess?.({ appended, offset, epoch: currentEpoch, durationMs: dur });
      } catch (e: any) {
        if (controller.signal.aborted) {
          onAbort?.({ cause: String(controller.signal.reason ?? 'aborted'), epoch: currentEpoch });
        } else {
          // Track consecutive failures and apply exponential backoff
          const newFailureCount = consecutiveFailures + 1;
          setConsecutiveFailures(newFailureCount);
          
          // Calculate backoff: 0.5s, 1s, 2s, 4s, 8s (capped at 8s)
          const backoffMs = Math.min(500 * Math.pow(2, newFailureCount - 1), 8000);
          const backoffUntilTime = Date.now() + backoffMs;
          setBackoffUntil(backoffUntilTime);
          
          setShowManualLoad(true);
          onFailure?.({ error: e?.message ?? 'error', consecutiveFailures: newFailureCount, epoch: currentEpoch });
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
      // Only trigger if we actually have more data to load
      if (hasMore && !inFlightRef.current) {
        queueStarvation();
        request('io');
      }
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