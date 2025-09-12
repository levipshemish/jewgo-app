/**
 * Retry management for v5 API client.
 * 
 * Provides intelligent retry logic with exponential backoff,
 * jitter, and circuit breaker integration.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error?: Error;
  response?: Response;
}

export class RetryManager {
  private static instance: RetryManager;
  private config: RetryConfig;

  private constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['NetworkError', 'TimeoutError', 'AbortError'],
      ...config
    };
  }

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  static async execute<T>(fn: () => Promise<T>): Promise<{ success: boolean; data?: T; error?: string }> {
    const instance = RetryManager.getInstance();
    try {
      const result = await instance.execute(fn, undefined);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    _context?: Partial<RetryContext>
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt >= this.config.maxAttempts) {
          break;
        }

        if (!this.shouldRetry(error as Error)) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error should trigger a retry
   */
  private shouldRetry(error: Error): boolean {
    // Check for retryable error types
    if (this.config.retryableErrors.includes(error.name)) {
      return true;
    }

    // Check for fetch response errors
    if ('response' in error && error.response instanceof Response) {
      return this.config.retryableStatusCodes.includes(error.response.status);
    }

    // Check for network errors
    if (error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create retry context for logging
   */
  createContext(attempt: number, error?: Error, response?: Response): RetryContext {
    return {
      attempt,
      maxAttempts: this.config.maxAttempts,
      delay: this.calculateDelay(attempt),
      error,
      response
    };
  }

  /**
   * Get retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  updateConfig(updates: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}