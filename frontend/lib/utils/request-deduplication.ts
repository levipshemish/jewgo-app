/**
 * Request deduplication utility to prevent duplicate API calls
 * 
 * This utility ensures that identical API requests are not made simultaneously,
 * reducing server load and improving client performance by reusing in-flight requests.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly CACHE_TTL = 5000; // 5 seconds TTL for deduplication

  /**
   * Generate a unique key for the request based on URL and options
   */
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body || '';
    const headers = JSON.stringify(options?.headers || {});
    return `${method}:${url}:${headers}:${body}`;
  }

  /**
   * Clean up expired pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.pendingRequests.forEach((request, key) => {
      if (now - request.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Deduplicated fetch that reuses in-flight requests with same parameters
   */
  async fetch<T = any>(url: string, options?: RequestInit): Promise<T> {
    this.cleanup();
    
    const key = this.generateKey(url, options);
    const pending = this.pendingRequests.get(key);
    
    if (pending) {
      // Return existing promise for identical request
      return pending.promise;
    }

    // Create new request
    const promise = this.performFetch<T>(url, options);
    
    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    // Clean up after request completes (success or failure)
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  /**
   * Perform the actual fetch request
   */
  private async performFetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Re-throw to maintain error handling upstream
      throw error;
    }
  }

  /**
   * Clear all pending requests (useful for cleanup or testing)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get current number of pending requests (for debugging)
   */
  getPendingCount(): number {
    this.cleanup();
    return this.pendingRequests.size;
  }
}

// Global singleton instance for request deduplication
let requestDeduplicator: RequestDeduplicator | null = null;

function getDeduplicator(): RequestDeduplicator {
  if (!requestDeduplicator) {
    requestDeduplicator = new RequestDeduplicator();
  }
  return requestDeduplicator;
}

/**
 * Deduplicated fetch function that prevents duplicate API calls
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise resolving to the parsed JSON response
 * 
 * @example
 * ```ts
 * // Multiple simultaneous calls will result in only one actual network request
 * const [result1, result2, result3] = await Promise.all([
 *   deduplicatedFetch('/api/restaurants'),
 *   deduplicatedFetch('/api/restaurants'),
 *   deduplicatedFetch('/api/restaurants')
 * ]);
 * ```
 */
export async function deduplicatedFetch<T = any>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  return getDeduplicator().fetch<T>(url, options);
}

/**
 * Clear all pending deduplicated requests
 */
export function clearDeduplicationCache(): void {
  getDeduplicator().clear();
}

/**
 * Get the number of currently pending requests (for debugging)
 */
export function getPendingRequestCount(): number {
  return getDeduplicator().getPendingCount();
}