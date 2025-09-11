/**
 * Cache management for v5 API client.
 * 
 * Provides in-memory caching with TTL support, ETag handling,
 * and cache invalidation strategies.
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

export interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
  enableEtag: boolean;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 300000, // 5 minutes
      maxSize: 1000,
      enableEtag: true,
      ...config
    };
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, etag?: string, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      etag
    };

    this.cache.set(key, entry);
  }

  /**
   * Get ETag for a key
   */
  getEtag(key: string): string | null {
    const entry = this.cache.get(key);
    return entry?.etag || null;
  }

  /**
   * Set ETag for a key
   */
  setEtag(key: string, etag: string, ttl?: number): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.etag = etag;
      if (ttl) {
        entry.ttl = ttl;
      }
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Delete cached data
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache entry with ETag
   */
  getWithEtag<T>(key: string): { data: T; etag?: string } | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      etag: entry.etag
    };
  }

  /**
   * Set cache entry with ETag
   */
  setWithEtag<T>(key: string, data: T, etag: string, ttl?: number): void {
    this.set(key, data, etag, ttl);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses
      entries
    };
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Create cache key from URL and parameters
   */
  static createKey(url: string, params?: Record<string, any>): string {
    const urlObj = new URL(url);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value));
      });
    }
    
    return urlObj.toString();
  }

  // Static methods for backward compatibility
  static get<T>(key: string): T | null {
    return CacheManager.getInstance().get<T>(key);
  }

  static set<T>(key: string, data: T, etag?: string, ttl?: number): void {
    CacheManager.getInstance().set(key, data, etag, ttl);
  }

  static getEtag(key: string): string | null {
    return CacheManager.getInstance().getEtag(key);
  }

  static setEtag(key: string, etag: string, ttl?: number): void {
    CacheManager.getInstance().setEtag(key, etag, ttl);
  }

  static clear(): void {
    CacheManager.getInstance().clear();
  }

  static invalidate(pattern: string): void {
    CacheManager.getInstance().invalidate(pattern);
  }
}