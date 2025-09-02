/**
 * Request Deduplication Utility
 * Prevents duplicate API calls and provides caching for better performance
 */

interface RequestCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

class RequestDeduplicator {
  private inFlight = new Map<string, Promise<any>>();
  private cache: RequestCache = {};
  
  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 300000 // 5 minutes default
  ): Promise<T> {
    // Check cache first
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Check if request is already in flight
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }
    
    // Execute new request
    const promise = requestFn().then(data => {
      // Cache successful response
      this.cache[key] = {
        data,
        timestamp: Date.now(),
        ttl
      };
      this.inFlight.delete(key);
      return data;
    }).catch(error => {
      this.inFlight.delete(key);
      throw error;
    });
    
    this.inFlight.set(key, promise);
    return promise;
  }
  
  clearCache() {
    this.cache = {};
  }
  
  clearInFlight() {
    this.inFlight.clear();
  }
  
  // Get cache statistics for debugging
  getStats() {
    return {
      cacheSize: Object.keys(this.cache).length,
      inFlightSize: this.inFlight.size,
      cacheKeys: Object.keys(this.cache),
      inFlightKeys: Array.from(this.inFlight.keys())
    };
  }
}

export const requestDeduplicator = new RequestDeduplicator();
