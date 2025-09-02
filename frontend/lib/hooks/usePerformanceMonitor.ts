/**
 * Performance Monitoring Hook
 * Tracks API calls, render performance, and provides debugging information
 */

import { useRef, useCallback, useEffect } from 'react';

interface PerformanceMetrics {
  apiCalls: number;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  averageRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  componentName?: string;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = false,
    componentName = 'Component'
  } = options;

  const metricsRef = useRef<PerformanceMetrics>({
    apiCalls: 0,
    renderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
    averageRenderTime: 0
  });

  const startTimeRef = useRef<number>(0);
  const isDev = process.env.NODE_ENV === 'development';

  // Track render performance - only in dev and throttle logging
  useEffect(() => {
    if (!enabled || !isDev) return;

    const startTime = performance.now();
    startTimeRef.current = startTime;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      metricsRef.current.renderCount++;
      metricsRef.current.lastRenderTime = renderTime;
      metricsRef.current.totalRenderTime += renderTime;
      metricsRef.current.averageRenderTime = 
        metricsRef.current.totalRenderTime / metricsRef.current.renderCount;

      // Throttle logging to every 10th render to reduce console spam
      if (logToConsole && metricsRef.current.renderCount % 10 === 0) {
        console.log(`[${componentName}] Render #${metricsRef.current.renderCount}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          averageRenderTime: `${metricsRef.current.averageRenderTime.toFixed(2)}ms`,
          totalRenderTime: `${metricsRef.current.totalRenderTime.toFixed(2)}ms`
        });
      }
    };
  });

  // Track API calls - stable function reference
  const trackApiCall = useCallback((endpoint: string, duration?: number) => {
    if (!enabled) return;

    metricsRef.current.apiCalls++;
    
    // Only log in dev and throttle to reduce spam
    if (logToConsole && isDev && metricsRef.current.apiCalls % 5 === 0) {
      console.log(`[${componentName}] API Call #${metricsRef.current.apiCalls}:`, {
        endpoint,
        duration: duration ? `${duration.toFixed(2)}ms` : 'unknown',
        totalApiCalls: metricsRef.current.apiCalls
      });
    }
  }, [enabled, logToConsole, componentName, isDev]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      apiCalls: 0,
      renderCount: 0,
      lastRenderTime: 0,
      totalRenderTime: 0,
      averageRenderTime: 0
    };
  }, []);

  // Performance wrapper for async functions
  const withPerformanceTracking = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    endpoint: string
  ) => {
    return async (...args: T): Promise<R> => {
      if (!enabled) return fn(...args);

      const startTime = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - startTime;
        trackApiCall(endpoint, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        trackApiCall(`${endpoint} (error)`, duration);
        throw error;
      }
    };
  }, [enabled, trackApiCall]);

  return {
    trackApiCall,
    getMetrics,
    resetMetrics,
    withPerformanceTracking,
    metrics: metricsRef.current
  };
}
