/// <reference types="node" />
import { useEffect, useRef, useCallback, useState } from 'react';

export interface InfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  disabled?: boolean;
}

export interface UseInfiniteScrollReturn {
  loadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadingRef: React.RefObject<HTMLDivElement>;
  setHasMore: (hasMore: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
}

export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: InfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    root = null,
    disabled = false
  } = options;

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLoadTimeRef = useRef<number>(0);

  // Load more function with loading state management
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || disabled) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Infinite scroll: Load more blocked', { isLoadingMore, hasMore, disabled });
      }
      return;
    }

    // Prevent rapid-fire loading with a minimum delay
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    if (timeSinceLastLoad < 300) { // Minimum 300ms between loads
      if (process.env.NODE_ENV === 'development') {
        console.log('Infinite scroll: Load more blocked - too soon', { timeSinceLastLoad });
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Infinite scroll: Starting load more');
    }

    lastLoadTimeRef.current = now;
    setIsLoadingMore(true);
    
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Error in infinite scroll load more:', error);
    } finally {
      setIsLoadingMore(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('Infinite scroll: Load more completed');
      }
    }
  }, [onLoadMore, isLoadingMore, hasMore, disabled]);

  // Set up intersection observer
  useEffect(() => {
    if (disabled || !hasMore) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Infinite scroll: Disabled or no more items', { disabled, hasMore });
      }
      return;
    }

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (process.env.NODE_ENV === 'development') {
          console.log('Infinite scroll: Intersection observed', { 
            isIntersecting: entry.isIntersecting, 
            isLoadingMore, 
            hasMore,
            target: entry.target
          });
        }

        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Infinite scroll: Triggering load more');
          }
          loadMore();
        }
      },
      {
        threshold,
        rootMargin,
        root
      }
    );

    observerRef.current = observer;

    // Re-check for the element after a short delay if not found initially
    const checkAndObserve = () => {
      if (loadingRef.current) {
        observer.observe(loadingRef.current);
        if (process.env.NODE_ENV === 'development') {
          console.log('Infinite scroll: Observer attached to element');
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Infinite scroll: No loading ref element found, retrying...');
        }
        // Retry after a short delay
        setTimeout(() => {
          if (loadingRef.current && observerRef.current) {
            observerRef.current.observe(loadingRef.current);
            if (process.env.NODE_ENV === 'development') {
              console.log('Infinite scroll: Observer attached to element (retry)');
            }
          }
        }, 100);
      }
    };

    checkAndObserve();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, root, disabled, hasMore, loadMore]); // Include loadMore in dependencies



  return {
    loadMore,
    hasMore,
    isLoadingMore,
    loadingRef,
    setHasMore,
    setIsLoadingMore
  };
}

// Hook for manual infinite scroll with scroll event
export function useScrollInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: InfiniteScrollOptions & { scrollThreshold?: number } = {}
): UseInfiniteScrollReturn {
  const {
    scrollThreshold = 100,
    disabled = false
  } = options;

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || disabled) {
      return;
    }

    setIsLoadingMore(true);
    
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Error in scroll infinite scroll load more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [onLoadMore, isLoadingMore, hasMore, disabled]);

  // Handle scroll events
  useEffect(() => {
    if (disabled || !hasMore) {
      return;
    }

    const handleScroll = () => {
      if (isLoadingMore) {
        return;
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight - scrollThreshold) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [disabled, hasMore, isLoadingMore, scrollThreshold, loadMore]);

  return {
    loadMore,
    hasMore,
    isLoadingMore,
    loadingRef,
    setHasMore,
    setIsLoadingMore
  };
}

// Hook for virtualized infinite scroll (for large lists)
export function useVirtualizedInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: InfiniteScrollOptions & { 
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
): UseInfiniteScrollReturn & {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    size: number;
  }>;
  totalHeight: number;
} {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    disabled = false
  } = options;

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || disabled) {
      return;
    }

    setIsLoadingMore(true);
    
    try {
      await onLoadMore();
      setItemCount(prev => prev + 1); // Increment item count
    } catch (error) {
      console.error('Error in virtualized infinite scroll load more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [onLoadMore, isLoadingMore, hasMore, disabled]);

  // Calculate virtual items
  const virtualItems = [];
  const totalHeight = itemCount * itemHeight;
  
  const startIndex = Math.max(0, Math.floor(0 / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((containerHeight || 0) / itemHeight) + overscan
  );

  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * itemHeight,
      end: (i + 1) * itemHeight,
      size: itemHeight
    });
  }

  return {
    loadMore,
    hasMore,
    isLoadingMore,
    loadingRef,
    setHasMore,
    setIsLoadingMore,
    virtualItems,
    totalHeight
  };
}
