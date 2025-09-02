/**
 * Cache Invalidation System
 * Manages cache invalidation for different data types and provides cache warming
 */

import { appLogger } from '@/lib/utils/logger';
import { revalidateTag } from 'next/cache';

export interface CacheInvalidationRule {
  pattern: string;
  tags: string[];
  maxAge?: number;
  revalidate?: number;
}

export interface CacheOperation {
  type: 'invalidate' | 'revalidate' | 'warm';
  target: string;
  tags?: string[];
  timestamp: number;
}

class CacheInvalidator {
  private rules: CacheInvalidationRule[] = [];
  private operations: CacheOperation[] = [];
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Default cache invalidation rules
    this.rules = [
      // Shtetl listings - invalidate when listings change
      {
        pattern: '/api/shtel-listings*',
        tags: ['shtetl-listings', 'marketplace'],
        maxAge: 300, // 5 minutes
        revalidate: 60, // 1 minute revalidation
      },
      
      // User-specific data - no caching
      {
        pattern: '/api/user/*',
        tags: ['user', 'auth'],
        maxAge: 0,
        revalidate: 0,
      },
      
      // Search results - moderate caching
      {
        pattern: '/api/search*',
        tags: ['search', 'marketplace'],
        maxAge: 300, // 5 minutes
        revalidate: 60, // 1 minute revalidation
      },
      
      // Store data - moderate caching
      {
        pattern: '/api/shtel/store*',
        tags: ['store', 'shtetl'],
        maxAge: 600, // 10 minutes
        revalidate: 120, // 2 minutes revalidation
      },
      
      // Order data - short caching
      {
        pattern: '/api/shtel/orders*',
        tags: ['orders', 'shtetl'],
        maxAge: 60, // 1 minute
        revalidate: 30, // 30 seconds revalidation
      },
      
      // Message data - short caching
      {
        pattern: '/api/shtel/messages*',
        tags: ['messages', 'shtetl'],
        maxAge: 60, // 1 minute
        revalidate: 30, // 30 seconds revalidation
      }
    ];
  }

  /**
   * Add a custom cache invalidation rule
   */
  addRule(rule: CacheInvalidationRule): void {
    this.rules.push(rule);
    appLogger.debug('Cache invalidation rule added', { rule });
  }

  /**
   * Invalidate cache for a specific endpoint or pattern
   */
  async invalidateCache(target: string, tags?: string[]): Promise<void> {
    const operation: CacheOperation = {
      type: 'invalidate',
      target,
      tags,
      timestamp: Date.now()
    };

    this.operations.push(operation);

    try {
      // Find matching rules
      const matchingRules = this.rules.filter(rule => 
        this.matchesPattern(target, rule.pattern)
      );

      if (matchingRules.length === 0) {
        appLogger.debug('No cache invalidation rules found for target', { target });
        return;
      }

      // Invalidate Next.js cache tags
      if (this.isProduction && typeof window === 'undefined') {
        await this.invalidateNextJSCache(tags || matchingRules.flatMap(r => r.tags));
      }

      // Clear sessionStorage cache
      this.clearSessionStorageCache(target);

      // Clear in-memory cache
      this.clearMemoryCache(target);

      appLogger.info('Cache invalidated successfully', {
        target,
        tags,
        rules: matchingRules.length
      });

    } catch (error) {
      appLogger.error('Cache invalidation failed', {
        target,
        error: String(error)
      });
      throw error;
    }
  }

  /**
   * Revalidate cache for a specific endpoint
   */
  async revalidateCache(target: string, tags?: string[]): Promise<void> {
    const operation: CacheOperation = {
      type: 'revalidate',
      target,
      tags,
      timestamp: Date.now()
    };

    this.operations.push(operation);

    try {
      // Trigger Next.js revalidation
      if (this.isProduction && typeof window === 'undefined') {
        await this.revalidateNextJSCache(tags || ['shtetl-listings']);
      }

      appLogger.info('Cache revalidation triggered', { target, tags });

    } catch (error) {
      appLogger.error('Cache revalidation failed', {
        target,
        error: String(error)
      });
      throw error;
    }
  }

  /**
   * Warm cache for frequently accessed endpoints
   */
  async warmCache(targets: string[]): Promise<void> {
    const operations: CacheOperation[] = targets.map(target => ({
      type: 'warm',
      target,
      timestamp: Date.now()
    }));

    this.operations.push(...operations);

    try {
      for (const target of targets) {
        await this.warmSingleCache(target);
      }

      appLogger.info('Cache warming completed', { targets: targets.length });

    } catch (error) {
      appLogger.error('Cache warming failed', {
        targets,
        error: String(error)
      });
      throw error;
    }
  }

  /**
   * Invalidate cache when listings change
   */
  async invalidateListingsCache(changeType: 'create' | 'update' | 'delete', listingId?: string): Promise<void> {
    const tags = ['shtetl-listings', 'marketplace'];
    
    if (listingId) {
      tags.push(`listing-${listingId}`);
    }

    await this.invalidateCache('/api/shtel-listings', tags);
    
    // Also invalidate related caches
    await this.invalidateCache('/api/shtel/store/*', ['store', 'shtetl']);
    
    appLogger.info('Listings cache invalidated', {
      changeType,
      listingId,
      tags
    });
  }

  /**
   * Invalidate cache when store data changes
   */
  async invalidateStoreCache(storeId: string, changeType: 'update' | 'delete'): Promise<void> {
    const tags = ['store', 'shtetl', `store-${storeId}`];
    
    await this.invalidateCache(`/api/shtel/store/${storeId}`, tags);
    await this.invalidateCache('/api/shtel/store', ['store', 'shtetl']);
    
    appLogger.info('Store cache invalidated', {
      storeId,
      changeType,
      tags
    });
  }

  /**
   * Invalidate cache when orders change
   */
  async invalidateOrdersCache(orderId?: string): Promise<void> {
    const tags = ['orders', 'shtetl'];
    
    if (orderId) {
      tags.push(`order-${orderId}`);
    }
    
    await this.invalidateCache('/api/shtel/orders*', tags);
    
    appLogger.info('Orders cache invalidated', {
      orderId,
      tags
    });
  }

  /**
   * Invalidate cache when messages change
   */
  async invalidateMessagesCache(conversationId?: string): Promise<void> {
    const tags = ['messages', 'shtetl'];
    
    if (conversationId) {
      tags.push(`conversation-${conversationId}`);
    }
    
    await this.invalidateCache('/api/shtel/messages*', tags);
    
    appLogger.info('Messages cache invalidated', {
      conversationId,
      tags
    });
  }

  /**
   * Check if a target matches a pattern
   */
  private matchesPattern(target: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced with regex
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(target);
    }
    
    return target === pattern || target.startsWith(pattern);
  }

  /**
   * Invalidate Next.js cache tags (server-side only)
   */
  private async invalidateNextJSCache(tags: string[]): Promise<void> {
    if (typeof window !== 'undefined') return;

    try {
      // Use Next.js revalidateTag if available
      if (typeof revalidateTag === 'function') {
        for (const tag of tags) {
          await revalidateTag(tag);
        }
      }
    } catch (error) {
      appLogger.warn('Next.js cache invalidation not available', { error: String(error) });
    }
  }

  /**
   * Revalidate Next.js cache (server-side only)
   */
  private async revalidateNextJSCache(tags: string[]): Promise<void> {
    if (typeof window !== 'undefined') return;

    try {
      // Use Next.js revalidateTag if available
      if (typeof revalidateTag === 'function') {
        for (const tag of tags) {
          await revalidateTag(tag);
        }
      }
    } catch (error) {
      appLogger.warn('Next.js cache revalidation not available', { error: String(error) });
    }
  }

  /**
   * Clear sessionStorage cache
   */
  private clearSessionStorageCache(target: string): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(sessionStorage);
      const matchingKeys = keys.filter(key => 
        key.includes('prefetch_') || key.includes(target.replace(/[^a-zA-Z0-9]/g, ''))
      );

      matchingKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });

      appLogger.debug('SessionStorage cache cleared', {
        target,
        clearedKeys: matchingKeys.length
      });
    } catch (error) {
      appLogger.warn('Failed to clear sessionStorage cache', { error: String(error) });
    }
  }

  /**
   * Clear in-memory cache
   */
  private clearMemoryCache(target: string): void {
    // This would clear any in-memory caches
    // Implementation depends on your caching strategy
    appLogger.debug('Memory cache cleared', { target });
  }

  /**
   * Warm a single cache endpoint
   */
  private async warmSingleCache(target: string): Promise<void> {
    try {
      const response = await fetch(target, {
        method: 'GET',
        headers: {
          'X-Cache-Warm': 'true'
        }
      });

      if (response.ok) {
        appLogger.debug('Cache warmed successfully', { target });
      } else {
        appLogger.warn('Cache warming failed', { target, status: response.status });
      }
    } catch (error) {
      appLogger.warn('Cache warming request failed', { target, error: String(error) });
    }
  }

  /**
   * Get cache invalidation statistics
   */
  getStats(): Record<string, any> {
    const stats = {
      rules: this.rules.length,
      operations: this.operations.length,
      recentOperations: this.operations.slice(-10),
      operationTypes: this.operations.reduce((acc, op) => {
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operations = [];
    appLogger.debug('Cache invalidation history cleared');
  }
}

// Global cache invalidator instance
export const cacheInvalidator = new CacheInvalidator();

// Export the class for testing
export { CacheInvalidator };
