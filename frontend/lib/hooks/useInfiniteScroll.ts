import { useRef, useCallback, useEffect } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number; // Distance from bottom to trigger load (default: 100px)
  rootMargin?: string; // CSS margin for intersection observer
}

export function useInfiniteScroll({
  onLoadMore, hasMore, loading, threshold = 100, rootMargin = '0px'
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target && target.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, loading]
  );

  useEffect(() => {
    const element = loadingRef.current;
    
    // Guard against null/undefined elements and ensure it's a valid Element
    if (!element || !(element instanceof Element)) {
      return;
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: `${threshold}px ${rootMargin}`,
      threshold: 0.1
    });

    // Guard before observe call
    if (element && element instanceof Element) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold, rootMargin]);

  return { loadingRef };
}
