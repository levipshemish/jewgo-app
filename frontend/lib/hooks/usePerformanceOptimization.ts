'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

interface UsePerformanceOptimizationOptions {
  enableLazyLoading?: boolean;
  enablePerformanceMonitoring?: boolean;
  threshold?: number;
}

export function usePerformanceOptimization(options: UsePerformanceOptimizationOptions = {}) {
  const {
    enableLazyLoading = true,
    enablePerformanceMonitoring = true,
    threshold = 0.1
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  });
  
  const elementRef = useRef<HTMLElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const element = elementRef.current;
    
    // Guard against null/undefined elements and ensure it's a valid Element
    if (!enableLazyLoading || !element || !(element instanceof Element)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: '50px'
      }
    );

    // Guard before observe call
    if (element && element instanceof Element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading, threshold]);

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring || typeof window === 'undefined') {
      return;
    }

    const trackPerformance = () => {
      // Track Core Web Vitals
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            switch (entry.entryType) {
              case 'first-contentful-paint':
                setPerformanceMetrics(prev => ({ ...prev, fcp: entry.startTime }));
                break;
              case 'largest-contentful-paint':
                setPerformanceMetrics(prev => ({ ...prev, lcp: entry.startTime }));
                break;
              case 'layout-shift':
                const layoutShiftEntry = entry as any;
                setPerformanceMetrics(prev => ({ ...prev, cls: layoutShiftEntry.value }));
                break;
            }
          }
        });

        observer.observe({ entryTypes: ['first-contentful-paint', 'largest-contentful-paint', 'layout-shift'] });

        // Track TTFB
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
          setPerformanceMetrics(prev => ({ 
            ...prev, 
            ttfb: navigationEntry.responseStart - navigationEntry.requestStart 
          }));
        }

        return () => observer.disconnect();
      }
      return undefined;
    };

    // Load web-vitals for more detailed metrics
    import('web-vitals').then((webVitals) => {
      if (webVitals.onCLS) {
        webVitals.onCLS((metric) => setPerformanceMetrics(prev => ({ ...prev, cls: metric.value })));
      }
      if (webVitals.onFCP) {
        webVitals.onFCP((metric) => setPerformanceMetrics(prev => ({ ...prev, fcp: metric.value })));
      }
      if (webVitals.onLCP) {
        webVitals.onLCP((metric) => setPerformanceMetrics(prev => ({ ...prev, lcp: metric.value })));
      }
      if (webVitals.onTTFB) {
        webVitals.onTTFB((metric) => setPerformanceMetrics(prev => ({ ...prev, ttfb: metric.value })));
      }
    }).catch(() => {
      // Fallback to basic performance tracking
      trackPerformance();
    });
  }, [enablePerformanceMonitoring]);

  // Preload critical resources with proper 'as' attributes
  const preloadResource = useCallback((href: string, as: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    // Validate 'as' attribute to prevent preload warnings
    const validAsValues = ['script', 'style', 'image', 'font', 'fetch', 'document', 'audio', 'video', 'track'];
    if (!validAsValues.includes(as)) {
      // console.warn(`Invalid preload 'as' value: ${as}. Using 'fetch' as fallback.`);
      as = 'fetch';
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    // Add crossorigin for fonts
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }, []);

  // Prefetch non-critical resources
  const prefetchResource = useCallback((href: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }, []);

  // Optimize images
  const optimizeImage = useCallback((src: string, width: number, quality: number = 75) => {
    // Add Next.js image optimization parameters
    return `${src}?w=${width}&q=${quality}&format=webp`;
  }, []);

  // Debounce function for performance
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Throttle function for performance
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }, []);

  return {
    elementRef,
    isVisible,
    performanceMetrics,
    preloadResource,
    prefetchResource,
    optimizeImage,
    debounce,
    throttle
  };
}

// Hook for monitoring component performance
export function useComponentPerformance(componentName: string) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      // const duration = endTime - startTime;
      // Log performance data
      // Performance logging removed for production
      
      // Send to analytics if available
      if (window.gtag) {
        const duration = endTime - startTime;
        window.gtag('event', 'component_performance', {
          component_name: componentName,
          render_time: duration
        });
      }
    };
  }, [componentName]);
}

// Hook for memory optimization
export function useMemoryOptimization() {
  const cleanupRef = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.push(cleanup);
  }, []);

  useEffect(() => {
    return () => {
      // Run all cleanup functions
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, []);

  return { addCleanup };
}
