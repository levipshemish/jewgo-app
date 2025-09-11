/**
 * V5 Cache Manager
 * 
 * Handles client-side caching with ETag support and intelligent invalidation.
 */

export interface CacheEntry<T = any> {
  data: T;
  etag: string;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  etag?: string; // ETag for conditional requests
  forceRefresh?: boolean; // Force refresh even if cached
}

export class CacheManager {
  private static readonly CACHE_PREFIX = 'jewgo_cache_';
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 50; // Maximum number of cache entries

  /**
   * Generate cache key from URL and parameters
   */
  private static generateCacheKey(url: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${this.CACHE_PREFIX}${btoa(url + paramStr)}`;
  }

  /**
   * Get cached data
   */
  static get<T>(url: string, params?: Record<string, any>): CacheEntry<T> | null {
    try {
      const key = this.generateCacheKey(url, params);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.delete(url, params);
        return null;
      }
      
      return entry;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  static set<T>(
    url: string, 
    data: T, 
    etag?: string, 
    ttl: number = this.DEFAULT_TTL,
    params?: Record<string, any>
  ): void {
    try {
      const key = this.generateCacheKey(url, params);
      const entry: CacheEntry<T> = {
        data,
        etag: etag || '',
        timestamp: Date.now(),
        ttl
      };
      
      localStorage.setItem(key, JSON.stringify(entry));
      
      // Clean up old entries if cache is too large
      this.cleanup();
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  static delete(url: string, params?: Record<string, any>): void {
    try {
      const key = this.generateCacheKey(url, params);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  static invalidatePattern(pattern: string): void {
    try {
      const keys = Object.keys(localStorage);
      const regex = new RegExp(pattern);
      
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX) && regex.test(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }

  /**
   * Get ETag for URL
   */
  static getEtag(url: string, params?: Record<string, any>): string | null {
    try {
      const entry = this.get(url, params);
      return entry?.etag || null;
    } catch (error) {
      console.error('Cache get ETag error:', error);
      return null;
    }
  }

  /**
   * Set ETag for URL
   */
  static setEtag(url: string, etag: string, ttl?: number, params?: Record<string, any>): void {
    try {
      const key = this.generateCacheKey(url, params);
      const etagKey = `${key}_etag`;
      const etagEntry = {
        etag,
        timestamp: Date.now(),
        ttl: ttl || this.DEFAULT_TTL
      };
      localStorage.setItem(etagKey, JSON.stringify(etagEntry));
    } catch (error) {
      console.error('Cache set ETag error:', error);
    }
  }

  /**
   * Invalidate cache entries (alias for invalidatePattern)
   */
  static invalidate(pattern: string): void {
    this.invalidatePattern(pattern);
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; entries: string[] } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      return {
        size: cacheKeys.length,
        entries: cacheKeys
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { size: 0, entries: [] };
    }
  }

  /**
   * Clean up expired and old cache entries
   */
  private static cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length <= this.MAX_CACHE_SIZE) return;
      
      // Get all cache entries with timestamps
      const entries = cacheKeys.map(key => {
        try {
          const cached = localStorage.getItem(key);
          if (!cached) return { key, timestamp: 0 };
          
          const entry: CacheEntry = JSON.parse(cached);
          return { key, timestamp: entry.timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      });
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(entry => {
        localStorage.removeItem(entry.key);
      });
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Check if request should use cache
   */
  static shouldUseCache(options: CacheOptions = {}): boolean {
    if (options.forceRefresh) return false;
    return true; // Always try cache first, server will return 304 if not modified
  }

  /**
   * Get ETag for conditional request
   */
  static getETag(url: string, params?: Record<string, any>): string | null {
    const entry = this.get(url, params);
    return entry?.etag || null;
  }

  /**
   * Update ETag for cached entry
   */
  static updateETag(url: string, etag: string, params?: Record<string, any>): void {
    try {
      const key = this.generateCacheKey(url, params);
      const cached = localStorage.getItem(key);
      
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        entry.etag = etag;
        localStorage.setItem(key, JSON.stringify(entry));
      }
    } catch (error) {
      console.error('Cache update ETag error:', error);
    }
  }
}