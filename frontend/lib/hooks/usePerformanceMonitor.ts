import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  navigation: number | null;
}

interface UsePerformanceMonitorOptions {
  trackCoreWebVitals?: boolean;
  trackNavigation?: boolean;
  onMetricUpdate?: (metrics: PerformanceMetrics) => void;
  onError?: (error: Error) => void;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const {
    trackCoreWebVitals = true,
    trackNavigation = true,
    onMetricUpdate,
    onError
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    navigation: null,
  });

  const observerRef = useRef<PerformanceObserver | null>(null);
  const webVitalsCleanupRef = useRef<(() => void) | null>(null);

  const updateMetric = useCallback((key: keyof PerformanceMetrics, value: number) => {
    metricsRef.current[key] = value;
    onMetricUpdate?.(metricsRef.current);
  }, [onMetricUpdate]);

  const trackNavigationMetrics = useCallback(() => {
    if (!trackNavigation || typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        updateMetric('ttfb', navigationEntry.responseStart - navigationEntry.requestStart);
        updateMetric('navigation', navigationEntry.loadEventEnd - navigationEntry.fetchStart);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to track navigation metrics');
      onError?.(err);
    }
  }, [trackNavigation, updateMetric, onError]);

  const trackCoreWebVitalsMetrics = useCallback(() => {
    if (!trackCoreWebVitals || typeof window === 'undefined') {
      return;
    }

    try {
      // Use PerformanceObserver for Core Web Vitals
      if ('PerformanceObserver' in window) {
        observerRef.current = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            switch (entry.entryType) {
              case 'first-contentful-paint':
                updateMetric('fcp', entry.startTime);
                break;
              case 'largest-contentful-paint':
                updateMetric('lcp', entry.startTime);
                break;
              case 'layout-shift':
                const layoutShiftEntry = entry as any;
                updateMetric('cls', layoutShiftEntry.value);
                break;
            }
          }
        });

        observerRef.current.observe({ 
          entryTypes: ['first-contentful-paint', 'largest-contentful-paint', 'layout-shift'] 
        });
      }

      // Load web-vitals for more detailed metrics
      import('web-vitals').then((webVitals) => {
        const cleanupFunctions: (() => void)[] = [];

        if (typeof webVitals.onCLS === 'function') {
          webVitals.onCLS((metric) => updateMetric('cls', metric.value));
        }
        if (typeof webVitals.onFCP === 'function') {
          webVitals.onFCP((metric) => updateMetric('fcp', metric.value));
        }
        if (typeof webVitals.onLCP === 'function') {
          webVitals.onLCP((metric) => updateMetric('lcp', metric.value));
        }
        if (typeof webVitals.onTTFB === 'function') {
          webVitals.onTTFB((metric) => updateMetric('ttfb', metric.value));
        }
        if (typeof webVitals.onINP === 'function') {
          webVitals.onINP((metric) => updateMetric('fid', metric.value));
        }

        webVitalsCleanupRef.current = () => {
          cleanupFunctions.forEach(cleanup => cleanup());
        };
      }).catch((error) => {
        const err = error instanceof Error ? error : new Error('Failed to load web-vitals');
        onError?.(err);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to track Core Web Vitals');
      onError?.(err);
    }
  }, [trackCoreWebVitals, updateMetric, onError]);

  // Initialize performance monitoring
  useEffect(() => {
    trackNavigationMetrics();
    trackCoreWebVitalsMetrics();

    return () => {
      // Cleanup observers
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // Cleanup web-vitals
      if (webVitalsCleanupRef.current) {
        webVitalsCleanupRef.current();
        webVitalsCleanupRef.current = null;
      }
    };
  }, [trackNavigationMetrics, trackCoreWebVitalsMetrics]);

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      fcp: null,
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
      navigation: null,
    };
  }, []);

  return {
    getMetrics,
    resetMetrics,
    updateMetric,
  };
}
