import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppliedFilters } from '@/lib/filters/filters.types';

/**
 * Scroll state entry for session storage
 */
interface ScrollStateEntry {
  cursor?: string;
  anchorId?: string;
  scrollY: number;
  itemCount: number;
  query: string;
  filters: AppliedFilters;
  timestamp: number;
  dataVersion?: string;
}

/**
 * URL scroll state management interface
 */
export interface UseUrlScrollStateReturn {
  saveScrollState: (cursor: string | null, anchorId: string | null, scrollY: number, itemCount: number, query: string, filters: AppliedFilters, dataVersion?: string) => void;
  restoreScrollState: (query: string, filters: AppliedFilters, dataVersion?: string) => ScrollStateEntry | null;
  clearScrollState: () => void;
  updateUrl: (query: string, filters: AppliedFilters) => void;
}

/**
 * Storage configuration for URL scroll state
 */
const STORAGE_KEY_PREFIX = 'cursor_scroll_state';
const MAX_ENTRIES_PER_SESSION = 10;
const STALENESS_CUTOFF_HOURS = 2;
const URL_UPDATE_THROTTLE_MS = 500;

/**
 * Hook for managing URL and scroll state with cursor pagination
 * Implements Phase 2 requirements for session storage and URL persistence
 */
export function useUrlScrollState(): UseUrlScrollStateReturn {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ensure we only run on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  /**
   * Generate storage key based on current route and data context
   */
  const generateStorageKey = useCallback((query: string, filters: AppliedFilters): string => {
    // Create a simple hash of the query context
    const context = JSON.stringify({
      query: query.trim().toLowerCase(),
      filters: {
        category: filters.category,
        agency: filters.agency,
        nearMe: filters.nearMe,
        // Note: city/state would go here if added to AppliedFilters interface
        // Exclude location coords from key to avoid too many entries
      }
    });
    
    const hash = context.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    
    return `${STORAGE_KEY_PREFIX}_${Math.abs(hash)}`;
  }, []);

  /**
   * Clean old entries from session storage
   */
  const cleanOldEntries = useCallback(() => {
    if (!isClient) return;
    
    try {
      const cutoffTime = Date.now() - (STALENESS_CUTOFF_HOURS * 60 * 60 * 1000);
      const keys = Object.keys(sessionStorage);
      let _removeCount = 0;
      
      // Remove stale entries
      for (const key of keys) {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (parsed.timestamp < cutoffTime) {
                sessionStorage.removeItem(key);
                _removeCount++;
              }
            }
          } catch (_e) {
            // Remove corrupted entries
            sessionStorage.removeItem(key);
            _removeCount++;
          }
        }
      }
      
      // If we still have too many entries, remove oldest ones
      const remainingKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));
      if (remainingKeys.length > MAX_ENTRIES_PER_SESSION) {
        const entries = remainingKeys.map(key => {
          try {
            const data = sessionStorage.getItem(key);
            return data ? { key, timestamp: JSON.parse(data).timestamp } : null;
          } catch {
            return null;
          }
        }).filter(Boolean);
        
        // Sort by timestamp and remove oldest
        entries.sort((a, b) => a!.timestamp - b!.timestamp);
        const toRemove = entries.slice(0, entries.length - MAX_ENTRIES_PER_SESSION + 1);
        toRemove.forEach(entry => sessionStorage.removeItem(entry!.key));
      }
    } catch (e) {
      console.warn('Failed to clean scroll state entries:', e);
    }
  }, [isClient]);

  /**
   * Save current scroll state to session storage
   */
  const saveScrollState = useCallback((
    cursor: string | null,
    anchorId: string | null,
    scrollY: number,
    itemCount: number,
    query: string,
    filters: AppliedFilters,
    dataVersion?: string
  ) => {
    if (!isClient) return;
    
    try {
      cleanOldEntries();
      
      const storageKey = generateStorageKey(query, filters);
      const entry: ScrollStateEntry = {
        cursor: cursor || undefined,
        anchorId: anchorId || undefined,
        scrollY,
        itemCount,
        query,
        filters,
        timestamp: Date.now(),
        dataVersion: dataVersion || undefined,
      };
      
      sessionStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('Failed to save scroll state:', e);
    }
  }, [isClient, cleanOldEntries, generateStorageKey]);

  /**
   * Restore scroll state from session storage
   */
  const restoreScrollState = useCallback((
    query: string,
    filters: AppliedFilters,
    dataVersion?: string
  ): ScrollStateEntry | null => {
    if (!isClient) return null;
    
    try {
      const storageKey = generateStorageKey(query, filters);
      const data = sessionStorage.getItem(storageKey);
      
      if (!data) return null;
      
      const entry: ScrollStateEntry = JSON.parse(data);
      
      // Check staleness
      const cutoffTime = Date.now() - (STALENESS_CUTOFF_HOURS * 60 * 60 * 1000);
      if (entry.timestamp < cutoffTime) {
        sessionStorage.removeItem(storageKey);
        return null;
      }
      
      // Check data version compatibility (with tolerance)
      if (dataVersion && entry.dataVersion && dataVersion !== entry.dataVersion) {
        console.info('Scroll state data version mismatch', {
          current: dataVersion,
          stored: entry.dataVersion
        });
        // Still return the entry - the caller can decide what to do
      }
      
      return entry;
    } catch (e) {
      console.warn('Failed to restore scroll state:', e);
      return null;
    }
  }, [isClient, generateStorageKey]);

  /**
   * Clear all scroll state entries
   */
  const clearScrollState = useCallback(() => {
    if (!isClient) return;
    
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear scroll state:', e);
    }
  }, [isClient]);

  /**
   * Update URL with current query parameters (throttled)
   */
  const updateUrl = useCallback((query: string, filters: AppliedFilters) => {
    if (!isClient) return;
    
    // Clear existing timeout
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }
    
    // Throttle URL updates
    urlUpdateTimeoutRef.current = setTimeout(() => {
      try {
        const params = new URLSearchParams();
        
        // Add search query
        if (query.trim()) {
          params.set('q', query.trim());
        }
        
        // Add filters that should be preserved in URL
        if (filters.category) {
          params.set('category', filters.category);
        }
        if (filters.agency) {
          params.set('agency', filters.agency);
        }
        // Note: city/state filters would be added here if available in AppliedFilters interface
        if (filters.nearMe) {
          params.set('near', 'true');
          if (filters.maxDistanceMi) {
            params.set('radius', filters.maxDistanceMi.toString());
          }
        }
        
        // Build new URL
        const newUrl = `/eatery${params.toString() ? `?${params.toString()}` : ''}`;
        
        // Use replace to avoid history pollution
        router.replace(newUrl, { scroll: false });
      } catch (e) {
        console.warn('Failed to update URL:', e);
      }
    }, URL_UPDATE_THROTTLE_MS);
  }, [isClient, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveScrollState,
    restoreScrollState,
    clearScrollState,
    updateUrl,
  };
}

/**
 * ★ Insight ─────────────────────────────────────
 * This hook implements Phase 2 URL state persistence with smart
 * session storage management. It maintains scroll positions across
 * navigation while preventing storage bloat through intelligent
 * cleanup policies and data version tracking.
 * ─────────────────────────────────────────────────
 */