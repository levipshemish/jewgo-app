/**
 * V5 Retry Manager
 * 
 * Handles automatic retry logic with exponential backoff and circuit breaker patterns.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

export class RetryManager {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryCondition: (error) => this.isRetryableError(error),
    onRetry: () => {}
  };

  /**
   * Execute function with retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: any;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt
        if (attempt === opts.maxRetries) {
          break;
        }
        
        // Check if error is retryable
        if (!opts.retryCondition(error)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelay
        );
        
        // Call retry callback
        opts.onRetry(attempt + 1, error);
        
        // Wait before retry
        await this.delay(delay);
      }
    }
    
    return {
      success: false,
      error: lastError,
      attempts: opts.maxRetries + 1,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true;
    }
    
    // HTTP status codes that should be retried
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }
    
    // Timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
      return true;
    }
    
    // Connection errors
    if (error.message?.includes('connection') || error.message?.includes('network')) {
      return true;
    }
    
    return false;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create retry wrapper for fetch requests
   */
  static withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): () => Promise<T> {
    return async () => {
      const result = await this.execute(fn, options);
      
      if (result.success) {
        return result.data!;
      } else {
        throw result.error;
      }
    };
  }

  /**
   * Retry with circuit breaker pattern
   */
  static withCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: RetryOptions & {
      failureThreshold?: number;
      recoveryTimeout?: number;
    } = {}
  ): () => Promise<T> {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000, // 1 minute
      ...retryOptions
    } = options;
    
    let failureCount = 0;
    let lastFailureTime = 0;
    let circuitState: 'closed' | 'open' | 'half-open' = 'closed';
    
    return async () => {
      const now = Date.now();
      
      // Check circuit breaker state
      if (circuitState === 'open') {
        if (now - lastFailureTime > recoveryTimeout) {
          circuitState = 'half-open';
        } else {
          throw new Error('Circuit breaker is open');
        }
      }
      
      try {
        const result = await this.execute(fn, retryOptions);
        
        if (result.success) {
          // Reset circuit breaker on success
          if (circuitState === 'half-open') {
            circuitState = 'closed';
            failureCount = 0;
          }
          return result.data!;
        } else {
          throw result.error;
        }
      } catch (error) {
        failureCount++;
        lastFailureTime = now;
        
        if (failureCount >= failureThreshold) {
          circuitState = 'open';
        }
        
        throw error;
      }
    };
  }

  /**
   * Retry with jitter to avoid thundering herd
   */
  static withJitter<T>(
    fn: () => Promise<T>,
    options: RetryOptions & { jitterFactor?: number } = {}
  ): () => Promise<T> {
    const { jitterFactor = 0.1, ...retryOptions } = options;
    
    const originalOnRetry = retryOptions.onRetry;
    retryOptions.onRetry = (attempt, error) => {
      // Add jitter to delay
      const baseDelay = retryOptions.baseDelay || this.DEFAULT_OPTIONS.baseDelay;
      const jitter = baseDelay * jitterFactor * Math.random();
      const delay = baseDelay + jitter;
      
      // Override the delay calculation
      retryOptions.baseDelay = delay;
      
      if (originalOnRetry) {
        originalOnRetry(attempt, error);
      }
    };
    
    return this.withRetry(fn, retryOptions);
  }

  /**
   * Get retry statistics
   */
  static getStats(): {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryTime: number;
  } {
    // This would typically be implemented with a global stats tracker
    // For now, return placeholder data
    return {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryTime: 0
    };
  }
}