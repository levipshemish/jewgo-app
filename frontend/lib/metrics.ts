/**
 * Frontend metrics collection utilities
 * Provides functions to record metrics from the frontend
 */

interface MetricData {
  type: 'page_view' | 'api_call' | 'error';
  value?: number;
  metadata?: Record<string, any>;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: MetricData[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private timer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startBatchFlush();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record a page view
   */
  public recordPageView(page: string, metadata?: Record<string, any>): void {
    this.addMetric({
      type: 'page_view',
      value: 1,
      metadata: { page, ...metadata }
    });
  }

  /**
   * Record an API call
   */
  public recordApiCall(endpoint: string, method: string, status: number, duration?: number): void {
    this.addMetric({
      type: 'api_call',
      value: 1,
      metadata: { endpoint, method, status, duration }
    });
  }

  /**
   * Record an error
   */
  public recordError(error: string, component: string, metadata?: Record<string, any>): void {
    this.addMetric({
      type: 'error',
      value: 1,
      metadata: { error, component, ...metadata }
    });
  }

  /**
   * Add a metric to the queue
   */
  private addMetric(metric: MetricData): void {
    this.metrics.push(metric);
    
    // Flush if batch size reached
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Start periodic batch flush
   */
  private startBatchFlush(): void {
    this.timer = setInterval(() => {
      if (this.metrics.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Flush metrics to the backend
   */
  private async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    try {
      // Send metrics to backend
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsToFlush,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Re-add metrics to queue for retry
      this.metrics.unshift(...metricsToFlush);
    }
  }

  /**
   * Manually flush metrics
   */
  public async forceFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();

// Convenience functions
export const recordPageView = (page: string, metadata?: Record<string, any>) => {
  metricsCollector.recordPageView(page, metadata);
};

export const recordApiCall = (endpoint: string, method: string, status: number, duration?: number) => {
  metricsCollector.recordApiCall(endpoint, method, status, duration);
};

export const recordError = (error: string, component: string, metadata?: Record<string, any>) => {
  metricsCollector.recordError(error, component, metadata);
};

// React hook for automatic page view tracking
export const usePageView = (page: string) => {
  if (typeof window !== 'undefined') {
    recordPageView(page, {
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance monitoring
export const measurePerformance = (name: string, fn: (...args: any[]) => Promise<any>) => {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      
      recordApiCall(name, 'function', 200, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      recordApiCall(name, 'function', 500, duration);
      recordError(String(error), name);
      throw error;
    }
  };
};

// Error boundary integration
export const reportError = (error: Error, errorInfo: any) => {
  recordError(error.message, 'error_boundary', {
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString()
  });
};

// API call wrapper
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    const duration = performance.now() - start;
    
    recordApiCall(url, options.method || 'GET', response.status, duration);
    
    if (!response.ok) {
      recordError(`HTTP ${response.status}`, 'api_call', {
        url,
        method: options.method || 'GET',
        status: response.status
      });
    }
    
    return response;
  } catch (error) {
    const duration = performance.now() - start;
    recordApiCall(url, options.method || 'GET', 0, duration);
    recordError(String(error), 'api_call', { url, method: options.method || 'GET' });
    throw error;
  }
};
