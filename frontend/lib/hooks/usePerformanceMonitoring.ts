'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'rendering' | 'api' | 'memory' | 'interaction' | 'custom';
  unit: 'ms' | 'bytes' | 'count' | '%' | 'score';
}

interface PerformanceAlert {
  type: 'warning' | 'critical';
  message: string;
  metric: PerformanceMetric;
  threshold: number;
}

interface PerformanceThresholds {
  slowRender: number; // ms
  slowApiCall: number; // ms
  highMemoryUsage: number; // %
  manyMarkers: number; // count
  lowFPS: number; // fps
}

interface PerformanceMonitoringOptions {
  enabled?: boolean;
  collectMetrics?: boolean;
  alertOnSlowPerformance?: boolean;
  maxHistoryLength?: number;
  thresholds?: Partial<PerformanceThresholds>;
  onAlert?: (alert: PerformanceAlert) => void;
}

interface UsePerformanceMonitoringReturn {
  metrics: PerformanceMetric[];
  startTimer: (name: string, category?: PerformanceMetric['category']) => () => void;
  recordMetric: (metric: Omit<PerformanceMetric, 'timestamp'>) => void;
  getAverageTime: (metricName: string) => number;
  getMetricHistory: (metricName: string) => PerformanceMetric[];
  clearMetrics: () => void;
  getPerformanceSummary: () => PerformanceSummary;
  measureRenderTime: <T>(fn: () => T, name?: string) => T;
  measureAsyncOperation: <T>(promise: Promise<T>, name?: string) => Promise<T>;
}

interface PerformanceSummary {
  totalMetrics: number;
  averageRenderTime: number;
  averageApiTime: number;
  currentMemoryUsage: number;
  slowOperations: PerformanceMetric[];
  recentAlerts: PerformanceAlert[];
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slowRender: 100, // 100ms
  slowApiCall: 2000, // 2 seconds
  highMemoryUsage: 80, // 80%
  manyMarkers: 500, // 500 markers
  lowFPS: 30, // 30 fps
};

const DEFAULT_OPTIONS: Required<PerformanceMonitoringOptions> = {
  enabled: true,
  collectMetrics: true,
  alertOnSlowPerformance: true,
  maxHistoryLength: 100,
  thresholds: DEFAULT_THRESHOLDS,
  onAlert: () => {},
};

export function usePerformanceMonitoring(
  options: PerformanceMonitoringOptions = {}
): UsePerformanceMonitoringReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const activeTimersRef = useRef<Map<string, { startTime: number; category: PerformanceMetric['category'] }>>(new Map());

  // Start a performance timer
  const startTimer = useCallback((name: string, category: PerformanceMetric['category'] = 'custom') => {
    if (!opts.enabled) return () => {};

    const startTime = performance.now();
    activeTimersRef.current.set(name, { startTime, category });

    return () => {
      const timer = activeTimersRef.current.get(name);
      if (!timer) return;

      const endTime = performance.now();
      const duration = endTime - timer.startTime;
      
      activeTimersRef.current.delete(name);
      
      recordMetric({
        name,
        value: duration,
        category: timer.category,
        unit: 'ms',
      });
    };
  }, [opts.enabled]);

  // Record a performance metric
  const recordMetric = useCallback((metric: Omit<PerformanceMetric, 'timestamp'>) => {
    if (!opts.collectMetrics) return;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    setMetrics(prev => {
      const updated = [...prev, fullMetric].slice(-opts.maxHistoryLength);
      return updated;
    });

    // Check for performance alerts
    if (opts.alertOnSlowPerformance) {
      checkPerformanceAlerts(fullMetric);
    }
  }, [opts.collectMetrics, opts.maxHistoryLength, opts.alertOnSlowPerformance]);

  // Check if a metric triggers any alerts
  const checkPerformanceAlerts = useCallback((metric: PerformanceMetric) => {
    const thresholds = opts.thresholds as PerformanceThresholds;
    let alert: PerformanceAlert | null = null;

    switch (metric.category) {
      case 'rendering':
        if (metric.value > thresholds.slowRender) {
          alert = {
            type: metric.value > thresholds.slowRender * 2 ? 'critical' : 'warning',
            message: `Slow rendering detected: ${metric.name} took ${metric.value.toFixed(1)}ms`,
            metric,
            threshold: thresholds.slowRender,
          };
        }
        break;
      
      case 'api':
        if (metric.value > thresholds.slowApiCall) {
          alert = {
            type: metric.value > thresholds.slowApiCall * 1.5 ? 'critical' : 'warning',
            message: `Slow API call detected: ${metric.name} took ${metric.value.toFixed(1)}ms`,
            metric,
            threshold: thresholds.slowApiCall,
          };
        }
        break;
      
      case 'memory':
        if (metric.unit === '%' && metric.value > thresholds.highMemoryUsage) {
          alert = {
            type: metric.value > 90 ? 'critical' : 'warning',
            message: `High memory usage detected: ${metric.value.toFixed(1)}%`,
            metric,
            threshold: thresholds.highMemoryUsage,
          };
        }
        break;
    }

    if (alert) {
      setAlerts(prev => [...prev, alert].slice(-10)); // Keep last 10 alerts
      opts.onAlert(alert);
      
      console.warn(`🚨 Performance Alert [${alert.type}]:`, alert.message);
    }
  }, [opts.thresholds, opts.onAlert]);

  // Get average time for a specific metric
  const getAverageTime = useCallback((metricName: string): number => {
    const relevantMetrics = metrics.filter(m => m.name === metricName);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }, [metrics]);

  // Get history for a specific metric
  const getMetricHistory = useCallback((metricName: string): PerformanceMetric[] => {
    return metrics.filter(m => m.name === metricName);
  }, [metrics]);

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    setAlerts([]);
    activeTimersRef.current.clear();
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback((): PerformanceSummary => {
    const renderMetrics = metrics.filter(m => m.category === 'rendering');
    const apiMetrics = metrics.filter(m => m.category === 'api');
    const memoryMetrics = metrics.filter(m => m.category === 'memory');
    
    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
      : 0;
    
    const averageApiTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
      : 0;
    
    const currentMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1].value
      : 0;
    
    const slowOperations = metrics.filter(m => {
      const thresholds = opts.thresholds as PerformanceThresholds;
      return (m.category === 'rendering' && m.value > thresholds.slowRender) ||
             (m.category === 'api' && m.value > thresholds.slowApiCall);
    }).slice(-5); // Last 5 slow operations

    return {
      totalMetrics: metrics.length,
      averageRenderTime,
      averageApiTime,
      currentMemoryUsage,
      slowOperations,
      recentAlerts: alerts.slice(-5),
    };
  }, [metrics, alerts, opts.thresholds]);

  // Measure render time of a synchronous operation
  const measureRenderTime = useCallback(<T>(fn: () => T, name: string = 'render'): T => {
    if (!opts.enabled) return fn();
    
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    recordMetric({
      name,
      value: end - start,
      category: 'rendering',
      unit: 'ms',
    });
    
    return result;
  }, [opts.enabled, recordMetric]);

  // Measure async operation time
  const measureAsyncOperation = useCallback(async <T>(
    promise: Promise<T>,
    name: string = 'async-operation'
  ): Promise<T> => {
    if (!opts.enabled) return promise;
    
    const start = performance.now();
    try {
      const result = await promise;
      const end = performance.now();
      
      recordMetric({
        name,
        value: end - start,
        category: 'api',
        unit: 'ms',
      });
      
      return result;
    } catch (error) {
      const end = performance.now();
      
      recordMetric({
        name: `${name}-error`,
        value: end - start,
        category: 'api',
        unit: 'ms',
      });
      
      throw error;
    }
  }, [opts.enabled, recordMetric]);

  // Auto-collect memory metrics
  useEffect(() => {
    if (!opts.enabled || typeof window === 'undefined') return;

    const collectMemoryMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        recordMetric({
          name: 'memory-usage',
          value: usagePercentage,
          category: 'memory',
          unit: '%',
        });
      }
    };

    // Collect memory metrics every 30 seconds
    const interval = setInterval(collectMemoryMetrics, 30000);
    
    // Initial collection
    collectMemoryMetrics();

    return () => clearInterval(interval);
  }, [opts.enabled, recordMetric]);

  return {
    metrics,
    startTimer,
    recordMetric,
    getAverageTime,
    getMetricHistory,
    clearMetrics,
    getPerformanceSummary,
    measureRenderTime,
    measureAsyncOperation,
  };
}

// Utility functions
export function formatMetricValue(metric: PerformanceMetric): string {
  switch (metric.unit) {
    case 'ms':
      return `${metric.value.toFixed(1)}ms`;
    case 'bytes':
      return formatBytes(metric.value);
    case '%':
      return `${metric.value.toFixed(1)}%`;
    default:
      return metric.value.toString();
  }
}

export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Performance debugging helper
export function logPerformanceMetrics(metrics: PerformanceMetric[]): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('📊 Performance Metrics');
  
  const categories = [...new Set(metrics.map(m => m.category))];
  categories.forEach(category => {
    const categoryMetrics = metrics.filter(m => m.category === category);
    if (categoryMetrics.length === 0) return;
    
    console.groupCollapsed(`${category} (${categoryMetrics.length} metrics)`);
    categoryMetrics.forEach(metric => {
      console.log(`${metric.name}: ${formatMetricValue(metric)}`);
    });
    console.groupEnd();
  });
  
  console.groupEnd();
}