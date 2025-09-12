/**
 * Metrics collection for v5 API client.
 * 
 * Collects performance metrics, error rates, and usage statistics
 * for API monitoring and optimization.
 */

export interface ApiMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: number;
  errorRate: number;
}

export interface RequestMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
  retryCount: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, ApiMetrics> = new Map();
  private requestHistory: RequestMetrics[] = [];
  private maxHistorySize = 1000;

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record API request start
   */
  recordRequestStart(url: string, method: string): RequestMetrics {
    const request: RequestMetrics = {
      url,
      method,
      startTime: Date.now(),
      retryCount: 0
    };

    this.requestHistory.push(request);
    
    // Trim history if it gets too large
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    return request;
  }

  /**
   * Record API request completion
   */
  recordRequestEnd(request: RequestMetrics, status: number, error?: string): void {
    request.endTime = Date.now();
    request.duration = request.endTime - request.startTime;
    request.status = status;
    request.error = error;

    this.updateMetrics(request);
  }

  /**
   * Record retry attempt
   */
  recordRetry(request: RequestMetrics): void {
    request.retryCount++;
  }

  /**
   * Update metrics for a specific endpoint
   */
  private updateMetrics(request: RequestMetrics): void {
    const key = this.getMetricsKey(request.url, request.method);
    const existing = this.metrics.get(key) || {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      errorRate: 0
    };

    existing.requestCount++;
    existing.lastRequestTime = request.startTime;

    if (request.error || (request.status && request.status >= 400)) {
      existing.errorCount++;
    } else {
      existing.successCount++;
    }

    // Update average response time
    if (request.duration) {
      const totalTime = existing.averageResponseTime * (existing.requestCount - 1) + request.duration;
      existing.averageResponseTime = totalTime / existing.requestCount;
    }

    // Calculate error rate
    existing.errorRate = existing.errorCount / existing.requestCount;

    this.metrics.set(key, existing);
  }

  /**
   * Get metrics for a specific endpoint
   */
  getMetrics(url: string, method: string): ApiMetrics | null {
    const key = this.getMetricsKey(url, method);
    return this.metrics.get(key) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ApiMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get request history
   */
  getRequestHistory(): RequestMetrics[] {
    return [...this.requestHistory];
  }

  /**
   * Get recent requests
   */
  getRecentRequests(count: number = 100): RequestMetrics[] {
    return this.requestHistory.slice(-count);
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    errorRate: number;
    commonErrors: Array<{ error: string; count: number }>;
    recentErrors: RequestMetrics[];
  } {
    const errors = this.requestHistory.filter(r => r.error || (r.status && r.status >= 400));
    const errorCounts = new Map<string, number>();

    errors.forEach(error => {
      const errorKey = error.error || `HTTP ${error.status}`;
      errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalRequests = this.requestHistory.length;
    const totalErrors = errors.length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      totalErrors,
      errorRate,
      commonErrors,
      recentErrors: errors.slice(-20)
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.requestHistory = [];
  }

  /**
   * Export metrics as JSON
   */
  export(): {
    metrics: Record<string, ApiMetrics>;
    requestHistory: RequestMetrics[];
    summary: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
      errorRate: number;
    };
  } {
    const allMetrics = Object.fromEntries(this.metrics);
    const totalRequests = this.requestHistory.length;
    const totalErrors = this.requestHistory.filter(r => r.error || (r.status && r.status >= 400)).length;
    const totalResponseTime = this.requestHistory.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      metrics: allMetrics,
      requestHistory: this.requestHistory,
      summary: {
        totalRequests,
        totalErrors,
        averageResponseTime,
        errorRate
      }
    };
  }

  /**
   * Record an error
   */
  recordError(url: string, method: string, _error: string): void {
    const key = this.getMetricsKey(url, method);
    const metrics = this.metrics.get(key) || this.createEmptyMetrics();
    metrics.errorCount++;
    metrics.errorRate = metrics.errorCount / metrics.requestCount;
    this.metrics.set(key, metrics);
  }

  /**
   * Record performance metrics
   */
  recordPerformance(url: string, method: string, duration: number): void {
    const key = this.getMetricsKey(url, method);
    const metrics = this.metrics.get(key) || this.createEmptyMetrics();
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.requestCount - 1) + duration) / metrics.requestCount;
    this.metrics.set(key, metrics);
  }

  /**
   * Record usage metrics
   */
  recordUsage(url: string, method: string): void {
    const key = this.getMetricsKey(url, method);
    const metrics = this.metrics.get(key) || this.createEmptyMetrics();
    metrics.requestCount++;
    metrics.lastRequestTime = Date.now();
    this.metrics.set(key, metrics);
  }

  /**
   * Get summary metrics for a time range
   */
  getSummary(_timeRange?: { start?: number; end?: number }): {
    metrics: Record<string, ApiMetrics>;
    requestHistory: RequestMetrics[];
    summary: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
      errorRate: number;
    };
  } {
    const allMetrics = Object.fromEntries(this.metrics);
    const totalRequests = this.requestHistory.length;
    const totalErrors = this.requestHistory.filter(r => r.error || (r.status && r.status >= 400)).length;
    const totalResponseTime = this.requestHistory.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      metrics: allMetrics,
      requestHistory: this.requestHistory,
      summary: {
        totalRequests,
        totalErrors,
        averageResponseTime,
        errorRate
      }
    };
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): ApiMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      errorRate: 0
    };
  }

  /**
   * Create metrics key from URL and method
   */
  private getMetricsKey(url: string, method: string): string {
    // Normalize URL by removing query parameters and IDs
    const normalizedUrl = url
      .replace(/\?.*$/, '')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid');
    
    return `${method.toUpperCase()} ${normalizedUrl}`;
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();