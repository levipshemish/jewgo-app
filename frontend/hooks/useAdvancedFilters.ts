/**
 * Advanced Filters Hook
 * Manages complex filter state with URL synchronization and performance optimizations
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filters } from '@/lib/filters/schema';

interface UseAdvancedFiltersOptions {
  enableUrlSync?: boolean;
  debounceMs?: number;
}

export function useAdvancedFilters(options: UseAdvancedFiltersOptions = {}) {
  const {
    enableUrlSync = true,
    debounceMs = 300
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL or defaults
  const [activeFilters, setActiveFilters] = useState<Filters>(() => {
    if (typeof window === 'undefined') return {};
    
    const urlFilters: Filters = {};
    const params = new URLSearchParams(window.location.search);
    
    // Parse URL parameters into filter state
    Array.from(params.entries()).forEach(([key, value]) => {
      if (key in urlFilters) {
        try {
          // Try to parse as JSON for complex values
          const parsed = JSON.parse(value);
          (urlFilters as any)[key] = parsed;
        } catch {
          // Fallback to string value
          (urlFilters as any)[key] = value;
        }
      }
    });
    
    return urlFilters;
  });

  // Debounced filter updates
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(activeFilters);
  
  // Prevent URL updates during initial render
  const isInitialRender = useRef(true);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilters(activeFilters);
    }, debounceMs);
    
    return () => clearTimeout(timeoutId);
  }, [activeFilters, debounceMs]);

  // Update URL when filters change (debounced) - prevent excessive updates
  useEffect(() => {
    if (!enableUrlSync || typeof window === 'undefined') return;
    
    // Prevent URL updates during initial render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else if (typeof value === 'object') {
          params.set(key, JSON.stringify(value));
        } else {
          params.set(key, String(value));
        }
      }
    });
    
    // Only update URL if it actually changed
    const currentUrl = window.location.search;
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    
    if (currentUrl !== newUrl) {
      const fullNewUrl = newUrl ? `${window.location.pathname}${newUrl}` : window.location.pathname;
      window.history.replaceState({}, '', fullNewUrl);
    }
  }, [debouncedFilters, enableUrlSync]);

  // Set individual filter
  const setFilter = useCallback((key: keyof Filters, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Partial<Filters>) => {
    setActiveFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Clear specific filter
  const clearFilter = useCallback((key: keyof Filters) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // Reset filters to URL state
  const resetToUrlFilters = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const urlFilters: Filters = {};
    const params = new URLSearchParams(window.location.search);
    
    Array.from(params.entries()).forEach(([key, value]) => {
      if (key in urlFilters) {
        try {
          const parsed = JSON.parse(value);
          (urlFilters as any)[key] = parsed;
        } catch {
          (urlFilters as any)[key] = value;
        }
      }
    });
    
    setActiveFilters(urlFilters);
  }, []);

  // Get filter value with type safety
  const getFilter = useCallback((key: keyof Filters) => {
    return activeFilters[key];
  }, [activeFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some(value => 
      value !== undefined && value !== null && value !== ''
    );
  }, [activeFilters]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  }, [activeFilters]);

  return {
    activeFilters,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    resetToUrlFilters,
    getFilter,
    hasActiveFilters,
    activeFilterCount,
    // For debugging
    debouncedFilters
  };
} 
