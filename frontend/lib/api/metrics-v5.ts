/**
 * V5 Metrics Collector
 * 
 * Collects and reports client-side performance metrics and usage statistics.
 */

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric extends MetricData {
  type: 'performance';
  duration?: number;
  startTime?: number;
  endTime?: number;
}

export interface UsageMetric extends MetricData {
  type: 'usage';
  action: string;
  entity?: string;
  success?: boolean;
}

export interface ErrorMetric extends MetricData {
  type: 'error';
  errorType: string;
  errorMessage?: string;
  stack?: string;
}

export type Metric = PerformanceMetric | UsageMetric | ErrorMetric;

export interface MetricsConfig {
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  endpoint: string;
  sampleRate: number;
  maxRetries: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metric[] = [];
  private config: MetricsConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  private constructor() {
    this.config = {
      enabled: true,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      endpoint: '/api/v5/metrics',
      sampleRate: 1.0,
      maxRetries: 3
    };
    
    this.startFlushTimer();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MetricsCollector {
    if (!this.instance) {
      this.instance = new MetricsCollector();
    }
    return this.instance;
  }

  /**
   * Configure metrics collector
   */
  configure(config: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled) {
      this.startFlushTimer();
    } else {
      this.stopFlushTimer();
    }
  }

  /**
   * Record performance metric
   */
  recordPerformance(
    name: string,
    duration: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return;

    const metric: PerformanceMetric = {
      type: 'performance',
      name,
      value: duration,
      timestamp: Date.now(),
      duration,
      tags,
      metadata
    };

    this.addMetric(metric);
  }

  /**
   * Record usage metric
   */
  recordUsage(
    action: string,
    entity?: string,
    success: boolean = true,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return;

    const metric: UsageMetric = {
      type: 'usage',
      name: `usage.${action}`,
      value: success ? 1 : 0,
      timestamp: Date.now(),
      action,
      entity,
      success,
      tags,
      metadata
    };

    this.addMetric(metric);
  }

  /**
   * Record error metric
   */
  recordError(
    errorType: string,
    errorMessage?: string,
    stack?: string,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return;

    const metric: ErrorMetric = {
      type: 'error',
      name: `error.${errorType}`,
      value: 1,
      timestamp: Date.now(),
      errorType,
      errorMessage,
      stack,
      tags,
      metadata
    };

    this.addMetric(metric);
  }

  /**
   * Record a generic metric
   */
  record(metric: Metric): void {
    if (!this.config.enabled) return;
    
    this.metrics.push(metric);
    
    // Auto-flush if batch size reached
    if (this.metrics.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.recordPerformance(name, duration, { ...tags, success: 'true' });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.recordPerformance(name, duration, { ...tags, success: 'false' });
      this.recordError(
        'function_error',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        { ...tags, function: name }
      );
      
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSyncFunction<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const startTime = Date.now();
    
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      
      this.recordPerformance(name, duration, { ...tags, success: 'true' });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.recordPerformance(name, duration, { ...tags, success: 'false' });
      this.recordError(
        'function_error',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        { ...tags, function: name }
      );
      
      throw error;
    }
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: Metric): void {
    if (!this.config.enabled) return;

    this.metrics.push(metric);

    // Flush if batch size reached
    if (this.metrics.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Check if metric should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush metrics to server
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.metrics.length === 0) {
      return;
    }

    this.isFlushing = true;
    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    try {
      await this.sendMetrics(metricsToFlush);
    } catch (error) {
      console.error('Failed to send metrics:', error);
      
      // Re-add metrics to queue for retry
      this.metrics.unshift(...metricsToFlush);
      
      // Limit queue size
      if (this.metrics.length > this.config.batchSize * 2) {
        this.metrics = this.metrics.slice(0, this.config.batchSize);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Send metrics to server
   */
  private async sendMetrics(metrics: Metric[]): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v5'
      },
      body: JSON.stringify({
        metrics,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });

    if (!response.ok) {
      throw new Error(`Metrics send failed: ${response.status}`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get metrics statistics
   */
  getStats(): {
    totalMetrics: number;
    performanceMetrics: number;
    usageMetrics: number;
    errorMetrics: number;
    oldestMetric: number | null;
    newestMetric: number | null;
  } {
    // const now = Date.now(); // Currently unused but may be needed for future features
    let oldest: number | null = null;
    let newest: number | null = null;

    const stats = this.metrics.reduce(
      (acc, metric) => {
        acc.totalMetrics++;
        
        if (metric.type === 'performance') acc.performanceMetrics++;
        else if (metric.type === 'usage') acc.usageMetrics++;
        else if (metric.type === 'error') acc.errorMetrics++;
        
        if (!oldest || metric.timestamp < oldest) oldest = metric.timestamp;
        if (!newest || metric.timestamp > newest) newest = metric.timestamp;
        
        return acc;
      },
      {
        totalMetrics: 0,
        performanceMetrics: 0,
        usageMetrics: 0,
        errorMetrics: 0
      }
    );

    return {
      ...stats,
      oldestMetric: oldest,
      newestMetric: newest
    };
  }

  /**
   * Get summary of metrics for a time range
   */
  getSummary(timeRange?: { start?: number; end?: number }): any {
    const now = Date.now();
    const start = timeRange?.start || (now - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const end = timeRange?.end || now;
    
    const filteredMetrics = this.metrics.filter(m => 
      m.timestamp >= start && m.timestamp <= end
    );
    
    const summary = {
      totalMetrics: filteredMetrics.length,
      timeRange: { start, end },
      byType: {} as Record<string, number>,
      byName: {} as Record<string, number>,
      errors: 0,
      performance: {
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      }
    };
    
    filteredMetrics.forEach(metric => {
      summary.byType[metric.type] = (summary.byType[metric.type] || 0) + 1;
      summary.byName[metric.name] = (summary.byName[metric.name] || 0) + 1;
      
      if (metric.type === 'error') {
        summary.errors++;
      }
      
      if (metric.type === 'performance' && 'duration' in metric) {
        const duration = metric.duration || 0;
        summary.performance.avgDuration += duration;
        summary.performance.maxDuration = Math.max(summary.performance.maxDuration, duration);
        summary.performance.minDuration = Math.min(summary.performance.minDuration, duration);
      }
    });
    
    if (summary.performance.avgDuration > 0) {
      summary.performance.avgDuration /= filteredMetrics.filter(m => m.type === 'performance').length;
    }
    
    if (summary.performance.minDuration === Infinity) {
      summary.performance.minDuration = 0;
    }
    
    return summary;
  }

  /**
   * Destroy metrics collector
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flush();
    this.metrics = [];
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();