import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  enabled?: boolean;
  threshold?: number;
  resistance?: number;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullToRefreshProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: UsePullToRefreshOptions = {}
): UsePullToRefreshReturn {
  const {
    enabled = true,
    threshold = 80,
    resistance = 2.5
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isPulling = useRef(false);
  const pullDistance = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    // Only trigger pull-to-refresh when at the top of the page
    if (window.scrollY > 0) return;
    
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = false;
    pullDistance.current = 0;
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing || touchStartY.current === 0) return;
    
    // Only trigger pull-to-refresh when at the top of the page
    if (window.scrollY > 0) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - touchStartY.current;
    
    // Only allow downward pulls
    if (deltaY > 0) {
      e.preventDefault();
      isPulling.current = true;
      pullDistance.current = deltaY / resistance;
      
      // Add visual feedback (you can customize this)
      if (pullDistance.current > threshold) {
        // Show "Release to refresh" state
        document.body.style.setProperty('--pull-distance', `${Math.min(pullDistance.current, threshold * 1.5)}px`);
      }
    }
  }, [enabled, isRefreshing, threshold, resistance]);

  const handleTouchEnd = useCallback(async (_e: React.TouchEvent) => {
    if (!enabled || isRefreshing || !isPulling.current) return;
    
    // Only trigger pull-to-refresh when at the top of the page
    if (window.scrollY > 0) return;
    
    if (pullDistance.current > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Reset state
    touchStartY.current = 0;
    currentY.current = 0;
    isPulling.current = false;
    pullDistance.current = 0;
    
    // Remove visual feedback
    document.body.style.removeProperty('--pull-distance');
  }, [enabled, isRefreshing, threshold, onRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.removeProperty('--pull-distance');
    };
  }, []);

  return {
    isRefreshing,
    pullToRefreshProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}
