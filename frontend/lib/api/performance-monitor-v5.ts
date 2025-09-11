/**
 * Performance monitoring for v5 API client.
 */

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowestRequest: number;
  fastestRequest: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    slowestRequest: 0,
    fastestRequest: Infinity
  };

  recordRequest(duration: number): void {
    this.metrics.requestCount++;
    
    const totalTime = this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + duration;
    this.metrics.averageResponseTime = totalTime / this.metrics.requestCount;
    
    this.metrics.slowestRequest = Math.max(this.metrics.slowestRequest, duration);
    this.metrics.fastestRequest = Math.min(this.metrics.fastestRequest, duration);
  }

  recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status?: number,
    responseSize?: number,
    metadata?: Record<string, string>
  ): void {
    this.recordRequest(duration);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowestRequest: 0,
      fastestRequest: Infinity
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();