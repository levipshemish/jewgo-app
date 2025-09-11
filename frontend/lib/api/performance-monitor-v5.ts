/**
 * Enhanced Performance Monitoring for V5 API
 * 
 * Comprehensive performance monitoring with detailed metrics collection,
 * performance analysis, and alerting capabilities.
 */

import { metricsCollector } from './metrics-v5';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceThreshold {
  name: string;
  warning: number;
  critical: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: number;
  message: string;
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  topSlowEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    requestCount: number;
  }>;
  errorBreakdown: Record<string, number>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor() {
    this.setupDefaultThresholds();
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Send to metrics collector
    metricsCollector.recordPerformance(
      metric.name,
      0,
      metric.tags,
      { value: metric.value, unit: metric.unit }
    );

    // Check thresholds
    this.checkThresholds(metric);

    // Keep only recent metrics (last hour)
    this.cleanupOldMetrics();
  }

  /**
   * Record API call performance
   */
  recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    responseSize?: number,
    tags?: Record<string, string>
  ): void {
    const timestamp = Date.now();
    const baseTags = {
      endpoint,
      method,
      status_code: statusCode.toString(),
      ...tags
    };

    // Record response time
    this.recordMetric({
      name: 'api.response_time',
      value: duration,
      unit: 'ms',
      timestamp,
      tags: baseTags
    });

    // Record response size if available
    if (responseSize !== undefined) {
      this.recordMetric({
        name: 'api.response_size',
        value: responseSize,
        unit: 'bytes',
        timestamp,
        tags: baseTags
      });
    }

    // Record success/failure
    this.recordMetric({
      name: 'api.request_count',
      value: 1,
      unit: 'count',
      timestamp,
      tags: {
        ...baseTags,
        success: (statusCode >= 200 && statusCode < 400).toString()
      }
    });

    // Record error if applicable
    if (statusCode >= 400) {
      this.recordMetric({
        name: 'api.error_count',
        value: 1,
        unit: 'count',
        timestamp,
        tags: {
          ...baseTags,
          error_type: this.getErrorType(statusCode)
        }
      });
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(
    query: string,
    duration: number,
    rowsAffected?: number,
    tags?: Record<string, string>
  ): void {
    const timestamp = Date.now();
    const baseTags = {
      query_type: this.getQueryType(query),
      ...tags
    };

    this.recordMetric({
      name: 'database.query_time',
      value: duration,
      unit: 'ms',
      timestamp,
      tags: baseTags
    });

    if (rowsAffected !== undefined) {
      this.recordMetric({
        name: 'database.rows_affected',
        value: rowsAffected,
        unit: 'count',
        timestamp,
        tags: baseTags
      });
    }
  }

  /**
   * Record cache performance
   */
  recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    duration?: number,
    size?: number,
    tags?: Record<string, string>
  ): void {
    const timestamp = Date.now();
    const baseTags = {
      operation,
      cache_key: key,
      ...tags
    };

    this.recordMetric({
      name: 'cache.operation_count',
      value: 1,
      unit: 'count',
      timestamp,
      tags: baseTags
    });

    if (duration !== undefined) {
      this.recordMetric({
        name: 'cache.operation_time',
        value: duration,
        unit: 'ms',
        timestamp,
        tags: baseTags
      });
    }

    if (size !== undefined) {
      this.recordMetric({
        name: 'cache.operation_size',
        value: size,
        unit: 'bytes',
        timestamp,
        tags: baseTags
      });
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(
    type: 'heap' | 'external' | 'rss',
    value: number,
    tags?: Record<string, string>
  ): void {
    this.recordMetric({
      name: `memory.${type}`,
      value,
      unit: 'bytes',
      timestamp: Date.now(),
      tags
    });
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage(
    usage: number,
    tags?: Record<string, string>
  ): void {
    this.recordMetric({
      name: 'cpu.usage',
      value: usage,
      unit: 'percentage',
      timestamp: Date.now(),
      tags
    });
  }

  /**
   * Set performance threshold
   */
  setThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.name, threshold);
  }

  /**
   * Check if metric exceeds thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      this.createAlert(metric, threshold, 'critical');
    } else if (metric.value >= threshold.warning) {
      this.createAlert(metric, threshold, 'warning');
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold,
    severity: 'warning' | 'critical'
  ): void {
    const alert: PerformanceAlert = {
      id: `${metric.name}_${Date.now()}`,
      metric: metric.name,
      value: metric.value,
      threshold: severity === 'critical' ? threshold.critical : threshold.warning,
      severity,
      timestamp: Date.now(),
      message: `${metric.name} exceeded ${severity} threshold: ${metric.value}${metric.unit} >= ${threshold.critical}${threshold.unit}`,
      tags: metric.tags
    };

    this.alerts.push(alert);

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    });

    console.warn(`Performance Alert: ${alert.message}`);
  }

  /**
   * Add alert callback
   */
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Generate performance report
   */
  generateReport(startTime?: number, endTime?: number): PerformanceReport {
    const now = Date.now();
    const start = startTime || now - 3600000; // Default to last hour
    const end = endTime || now;

    const relevantMetrics = this.metrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );

    const relevantAlerts = this.alerts.filter(
      a => a.timestamp >= start && a.timestamp <= end
    );

    // Calculate summary statistics
    const responseTimeMetrics = relevantMetrics.filter(m => m.name === 'api.response_time');
    const requestCountMetrics = relevantMetrics.filter(m => m.name === 'api.request_count');
    const errorCountMetrics = relevantMetrics.filter(m => m.name === 'api.error_count');

    const totalRequests = requestCountMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalErrors = errorCountMetrics.reduce((sum, m) => sum + m.value, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    const responseTimes = responseTimeMetrics.map(m => m.value).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    const p95ResponseTime = responseTimes.length > 0 
      ? responseTimes[Math.floor(responseTimes.length * 0.95)] 
      : 0;
    const p99ResponseTime = responseTimes.length > 0 
      ? responseTimes[Math.floor(responseTimes.length * 0.99)] 
      : 0;

    const throughput = totalRequests / ((end - start) / 1000); // requests per second

    // Top slow endpoints
    const endpointMetrics = new Map<string, { totalTime: number; count: number }>();
    responseTimeMetrics.forEach(metric => {
      const endpoint = metric.tags?.endpoint || 'unknown';
      const existing = endpointMetrics.get(endpoint) || { totalTime: 0, count: 0 };
      endpointMetrics.set(endpoint, {
        totalTime: existing.totalTime + metric.value,
        count: existing.count + 1
      });
    });

    const topSlowEndpoints = Array.from(endpointMetrics.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        averageTime: data.totalTime / data.count,
        requestCount: data.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    errorCountMetrics.forEach(metric => {
      const errorType = metric.tags?.error_type || 'unknown';
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + metric.value;
    });

    return {
      period: { start, end },
      summary: {
        totalRequests,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        throughput
      },
      metrics: relevantMetrics,
      alerts: relevantAlerts,
      topSlowEndpoints,
      errorBreakdown
    };
  }

  /**
   * Get current performance statistics
   */
  getCurrentStats(): {
    totalMetrics: number;
    totalAlerts: number;
    activeThresholds: number;
    lastAlert?: PerformanceAlert;
  } {
    return {
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      activeThresholds: this.thresholds.size,
      lastAlert: this.alerts.length > 0 ? this.alerts[this.alerts.length - 1] : undefined
    };
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 3600000; // Keep last hour
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Setup default performance thresholds
   */
  private setupDefaultThresholds(): void {
    this.setThreshold({
      name: 'api.response_time',
      warning: 1000, // 1 second
      critical: 5000, // 5 seconds
      unit: 'ms'
    });

    this.setThreshold({
      name: 'api.error_rate',
      warning: 5, // 5%
      critical: 10, // 10%
      unit: 'percentage'
    });

    this.setThreshold({
      name: 'database.query_time',
      warning: 500, // 500ms
      critical: 2000, // 2 seconds
      unit: 'ms'
    });

    this.setThreshold({
      name: 'memory.heap',
      warning: 100 * 1024 * 1024, // 100MB
      critical: 500 * 1024 * 1024, // 500MB
      unit: 'bytes'
    });

    this.setThreshold({
      name: 'cpu.usage',
      warning: 80, // 80%
      critical: 95, // 95%
      unit: 'percentage'
    });
  }

  /**
   * Get error type from status code
   */
  private getErrorType(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      return 'client_error';
    } else if (statusCode >= 500) {
      return 'server_error';
    }
    return 'unknown';
  }

  /**
   * Get query type from SQL query
   */
  private getQueryType(query: string): string {
    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
