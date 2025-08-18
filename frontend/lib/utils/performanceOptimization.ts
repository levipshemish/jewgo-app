/**
 * Performance optimization utilities to prevent setTimeout violations
 * and improve overall application performance
 */

// Safe setTimeout wrapper that prevents violations
export const safeSetTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
  // Use requestIdleCallback when available for better performance
  if ('requestIdleCallback' in window && delay > 16) {
    const timeoutId = (window as any).requestIdleCallback(callback, { timeout: delay });
    return timeoutId as unknown as NodeJS.Timeout;
  }
  
  // Fallback to setTimeout with performance monitoring
  const startTime = performance.now();
  const timeoutId = setTimeout(() => {
    const executionTime = performance.now() - startTime;
    if (executionTime > 50 && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      // console.warn(`setTimeout handler took ${executionTime.toFixed(0)}ms`);
    }
    callback();
  }, delay);
  
  return timeoutId;
};

// Batch processing utility to prevent performance violations
export const createBatchProcessor = <T>(
  items: T[],
  processor: (item: T) => void,
  batchSize: number = 5,
  delay: number = 16,
  onComplete?: () => void
) => {
  let currentIndex = 0;
  
  const processBatch = () => {
    const endIndex = Math.min(currentIndex + batchSize, items.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      processor(items[i]);
    }
    
    currentIndex = endIndex;
    
    if (currentIndex < items.length) {
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processBatch, { timeout: delay });
      } else {
        requestAnimationFrame(processBatch);
      }
    } else if (onComplete) {
      // Call completion callback when done
      onComplete();
    }
  };
  
  return processBatch;
};

// Performance monitoring utility
export const performanceMonitor = {
  startTime: 0,
  
  start() {
    this.startTime = performance.now();
  },
  
  end(label: string) {
    const duration = performance.now() - this.startTime;
    if (duration > 50 && process.env.NODE_ENV === 'development') {
      // console.warn(`${label} took ${duration.toFixed(0)}ms`);
    }
    return duration;
  },
  
  measure<T>(label: string, fn: () => T): T {
    this.start();
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }
};

// Debounce utility with performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = safeSetTimeout(() => {
      func(...args);
    }, delay);
  };
};

// Throttle utility with performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastExecTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecTime > delay) {
      func(...args);
      lastExecTime = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = safeSetTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (now - lastExecTime));
    }
  };
};
