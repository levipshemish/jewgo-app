/**
 * Background Data Prefetching Hook
 * Prefetches data in the background to improve perceived performance
 */

import { useCallback, useEffect, useRef } from 'react';
import { appLogger } from '@/lib/utils/logger';

interface PrefetchOptions {
  enabled?: boolean;
  delay?: number;
  priority?: 'low' | 'normal' | 'high';
  maxConcurrent?: number;
}

interface PrefetchTask {
  id: string;
  url: string;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

class BackgroundPrefetcher {
  private tasks = new Map<string, PrefetchTask>();
  private inProgress = new Set<string>();
  private maxConcurrent: number;
  private queue: string[] = [];

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async prefetch(url: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    const taskId = this.generateTaskId(url);
    
    // Skip if already completed or in progress
    if (this.tasks.has(taskId) && this.tasks.get(taskId)!.status === 'completed') {
      return;
    }

    const task: PrefetchTask = {
      id: taskId,
      url,
      priority,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.tasks.set(taskId, task);
    this.queue.push(taskId);
    this.sortQueue();
    
    this.processQueue();
  }

  private sortQueue(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => {
      const taskA = this.tasks.get(a)!;
      const taskB = this.tasks.get(b)!;
      
      // Sort by priority first, then by timestamp (FIFO for same priority)
      const priorityDiff = priorityOrder[taskB.priority] - priorityOrder[taskA.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return taskA.timestamp - taskB.timestamp;
    });
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.inProgress.size < this.maxConcurrent) {
      const taskId = this.queue.shift()!;
      const task = this.tasks.get(taskId)!;
      
      if (task.status === 'pending') {
        this.executeTask(task);
      }
    }
  }

  private async executeTask(task: PrefetchTask): Promise<void> {
    this.inProgress.add(task.id);
    task.status = 'in-progress';

    try {
      // Use low priority fetch for background prefetching
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(task.url, {
        method: 'GET',
        signal: controller.signal,
        // Use low priority for background requests
        priority: 'low'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Store the response in memory for potential use
        const data = await response.json();
        this.cacheResponse(task.url, data);
        task.status = 'completed';
        
        appLogger.debug('Background prefetch completed', {
          url: task.url,
          priority: task.priority,
          dataSize: JSON.stringify(data).length
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      task.status = 'failed';
      appLogger.warn('Background prefetch failed', {
        url: task.url,
        error: String(error)
      });
    } finally {
      this.inProgress.delete(task.id);
      this.processQueue(); // Process next task
    }
  }

  private cacheResponse(url: string, data: any): void {
    // Store in sessionStorage for this session
    try {
      const cacheKey = `prefetch_${this.generateTaskId(url)}`;
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes TTL
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      // Ignore storage errors
      appLogger.debug('Failed to cache prefetched data', { error: String(error) });
    }
  }

  getCachedResponse(url: string): any | null {
    try {
      const cacheKey = `prefetch_${this.generateTaskId(url)}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        } else {
          // Remove expired cache
          sessionStorage.removeItem(cacheKey);
        }
      }
    } catch (_error) {
      // Ignore cache retrieval errors
    }
    
    return null;
  }

  private generateTaskId(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '');
  }

  getStats() {
    const stats = {
      total: this.tasks.size,
      pending: 0,
      inProgress: this.inProgress.size,
      completed: 0,
      failed: 0,
      queueLength: this.queue.length
    };

    // Convert Map values to array for ES5 compatibility
    const taskValues = Array.from(this.tasks.values());
    for (const task of taskValues) {
      if (task.status === 'pending') stats.pending++;
      else if (task.status === 'in-progress') stats.inProgress++;
      else if (task.status === 'completed') stats.completed++;
      else if (task.status === 'failed') stats.failed++;
    }

    return stats;
  }

  clear(): void {
    this.tasks.clear();
    this.inProgress.clear();
    this.queue = [];
  }
}

// Global prefetcher instance
const globalPrefetcher = new BackgroundPrefetcher();

export function useBackgroundPrefetch(options: PrefetchOptions = {}) {
  const {
    enabled = true,
    delay = 1000,
    priority = 'normal',
    maxConcurrent: _maxConcurrent = 3
  } = options;

  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefetch = useCallback((url: string, prefetchPriority?: 'low' | 'normal' | 'high') => {
    if (!enabled) return;

    // Clear existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Delay prefetch to avoid blocking initial page load
    prefetchTimeoutRef.current = setTimeout(() => {
      globalPrefetcher.prefetch(url, prefetchPriority || priority);
    }, delay);
  }, [enabled, delay, priority]);

  const prefetchImmediate = useCallback((url: string, prefetchPriority?: 'low' | 'normal' | 'high') => {
    if (!enabled) return;
    globalPrefetcher.prefetch(url, prefetchPriority || priority);
  }, [enabled, priority]);

  const getCachedData = useCallback((url: string) => {
    return globalPrefetcher.getCachedResponse(url);
  }, []);

  const getStats = useCallback(() => {
    return globalPrefetcher.getStats();
  }, []);

  const clearCache = useCallback(() => {
    globalPrefetcher.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    prefetch,
    prefetchImmediate,
    getCachedData,
    getStats,
    clearCache
  };
}

// Export the global prefetcher for direct access
export { globalPrefetcher };
