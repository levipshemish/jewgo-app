/**
 * Circuit Breaker Pattern Implementation for V5 API
 * 
 * Provides fault tolerance and prevents cascading failures by monitoring
 * the success/failure rate of external service calls and temporarily
 * stopping calls when the failure rate exceeds a threshold.
 */

import { metricsCollector } from './metrics-v5';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, calls are failing
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number;        // Number of failures before opening circuit
  successThreshold: number;        // Number of successes needed to close circuit
  timeout: number;                 // Time in ms before trying half-open
  monitoringPeriod: number;        // Time window for failure rate calculation
  volumeThreshold: number;         // Minimum number of calls in monitoring period
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  failureRate: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private callHistory: Array<{ timestamp: number; success: boolean }> = [];

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      volumeThreshold: 10
    }
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be opened
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker ${this.name} is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
      }
      // Move to half-open state
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.successCount++;
    this.totalCalls++;
    this.recordCall(true);

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.closeCircuit();
      }
    }

    this.updateMetrics();
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.failureCount++;
    this.totalCalls++;
    this.lastFailureTime = Date.now();
    this.recordCall(false);

    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
    } else if (this.shouldOpenCircuit()) {
      this.openCircuit();
    }

    this.updateMetrics();
  }

  /**
   * Record a call in the history
   */
  private recordCall(success: boolean): void {
    const now = Date.now();
    this.callHistory.push({ timestamp: now, success });

    // Remove old entries outside monitoring period
    const cutoff = now - this.config.monitoringPeriod;
    this.callHistory = this.callHistory.filter(call => call.timestamp > cutoff);
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.callHistory.length < this.config.volumeThreshold) {
      return false;
    }

    const recentFailures = this.callHistory.filter(call => !call.success).length;
    const failureRate = recentFailures / this.callHistory.length;

    return failureRate >= (this.config.failureThreshold / this.callHistory.length);
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    console.warn(`Circuit breaker ${this.name} opened. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
  }

  /**
   * Close the circuit
   */
  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.nextAttemptTime = null;
    this.failureCount = 0;
    console.info(`Circuit breaker ${this.name} closed`);
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const failureRate = this.totalCalls > 0 ? this.failureCount / this.totalCalls : 0;

    metricsCollector.recordPerformance(
      `circuit_breaker.${this.name}.state`,
      0,
      {
        circuit_name: this.name,
        state: this.state
      }
    );

    metricsCollector.recordPerformance(
      `circuit_breaker.${this.name}.failure_rate`,
      0,
      {
        circuit_name: this.name,
        failure_rate: failureRate.toString()
      }
    );

    metricsCollector.recordPerformance(
      `circuit_breaker.${this.name}.total_calls`,
      0,
      {
        circuit_name: this.name,
        total_calls: this.totalCalls.toString()
      }
    );
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const failureRate = this.totalCalls > 0 ? this.failureCount / this.totalCalls : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      failureRate,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.callHistory = [];
    console.info(`Circuit breaker ${this.name} reset`);
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Execute with circuit breaker protection
   */
  async execute<T>(
    breakerName: string,
    fn: () => Promise<T>,
    config?: CircuitBreakerConfig
  ): Promise<T> {
    const breaker = this.getBreaker(breakerName, config);
    return breaker.execute(fn);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => {
      breaker.reset();
    });
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    this.breakers.forEach((breaker, name) => {
      health[name] = breaker.isHealthy();
    });
    return health;
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
