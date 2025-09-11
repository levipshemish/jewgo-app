/**
 * Request Deduplication for V5 API
 * 
 * Prevents duplicate requests by caching pending requests and returning
 * the same promise for identical requests made within a short time window.
 */

import { generateCorrelationId } from './utils-v5';

export interface RequestKey {
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
}

export interface DeduplicationConfig {
  ttl: number;           // Time to live for pending requests (ms)
  maxPendingRequests: number; // Maximum number of pending requests
  keyGenerator?: (request: RequestKey) => string; // Custom key generator
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimestamps = new Map<string, number>();
  private config: DeduplicationConfig;

  constructor(config: DeduplicationConfig = {
    ttl: 5000, // 5 seconds
    maxPendingRequests: 100
  }) {
    this.config = config;
    
    // Clean up expired requests periodically
    setInterval(() => this.cleanup(), 1000);
  }

  /**
   * Deduplicate a request
   */
  async deduplicate<T>(
    requestKey: RequestKey,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(requestKey);
    const now = Date.now();

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.debug(`Request deduplication: reusing pending request for ${key}`);
      return this.pendingRequests.get(key)!;
    }

    // Check if we've hit the limit
    if (this.pendingRequests.size >= this.config.maxPendingRequests) {
      console.warn('Request deduplicator: maximum pending requests reached, executing without deduplication');
      return requestFn();
    }

    // Create new request
    const requestPromise = this.executeRequest(requestFn, key);
    
    // Store the promise and timestamp
    this.pendingRequests.set(key, requestPromise);
    this.requestTimestamps.set(key, now);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up after request completes
      this.pendingRequests.delete(key);
      this.requestTimestamps.delete(key);
    }
  }

  /**
   * Execute the actual request
   */
  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    key: string
  ): Promise<T> {
    try {
      const result = await requestFn();
      console.debug(`Request deduplication: completed request for ${key}`);
      return result;
    } catch (error) {
      console.debug(`Request deduplication: failed request for ${key}`, error);
      throw error;
    }
  }


  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean up expired requests
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.requestTimestamps.forEach((timestamp, key) => {
      if (now - timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    });

    for (const key of expiredKeys) {
      this.pendingRequests.delete(key);
      this.requestTimestamps.delete(key);
      console.debug(`Request deduplication: cleaned up expired request ${key}`);
    }
  }

  /**
   * Get current statistics
   */
  getStats(): {
    pendingRequests: number;
    maxPendingRequests: number;
    ttl: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      maxPendingRequests: this.config.maxPendingRequests,
      ttl: this.config.ttl
    };
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
    this.requestTimestamps.clear();
    console.debug('Request deduplication: cleared all pending requests');
  }

  /**
   * Check if a request is currently pending
   */
  isPending(requestKey: RequestKey): boolean {
    const key = this.generateKey(requestKey);
    return this.pendingRequests.has(key);
  }

  /**
   * Generate a unique key for the request (public method)
   */
  generateKey(requestKey: RequestKey): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(requestKey);
    }

    // Default key generation
    const { method, url, body, headers } = requestKey;
    
    // Create a hash of the request
    const keyParts = [
      method.toUpperCase(),
      url,
      body ? this.hashString(body) : '',
      headers ? this.hashString(JSON.stringify(headers)) : ''
    ];

    return this.hashString(keyParts.join('|'));
  }
}

/**
 * Enhanced request deduplicator with correlation ID support
 */
export class EnhancedRequestDeduplicator extends RequestDeduplicator {
  private correlationIds = new Map<string, string>();

  /**
   * Deduplicate with correlation ID tracking
   */
  async deduplicateWithCorrelation<T>(
    requestKey: RequestKey,
    requestFn: () => Promise<T>,
    correlationId?: string
  ): Promise<{ result: T; correlationId: string; wasDeduplicated: boolean }> {
    const key = this.generateKey(requestKey);
    const wasDeduplicated = this.isPending(requestKey);
    
    if (!correlationId) {
      correlationId = generateCorrelationId();
    }

    // Store correlation ID
    this.correlationIds.set(key, correlationId);

    try {
      const result = await this.deduplicate(requestKey, requestFn);
      return { result, correlationId, wasDeduplicated };
    } finally {
      this.correlationIds.delete(key);
    }
  }

  /**
   * Get correlation ID for a request
   */
  getCorrelationId(requestKey: RequestKey): string | undefined {
    const key = this.generateKey(requestKey);
    return this.correlationIds.get(key);
  }
}

// Global request deduplicator instance
export const requestDeduplicator = new EnhancedRequestDeduplicator();

/**
 * Utility function to create request key from fetch parameters
 */
export function createRequestKey(
  url: string,
  options: RequestInit = {}
): RequestKey {
  return {
    method: options.method || 'GET',
    url,
    body: options.body ? String(options.body) : undefined,
    headers: options.headers ? Object.fromEntries(
      new Headers(options.headers).entries()
    ) : undefined
  };
}
