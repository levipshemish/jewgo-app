import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Filters, FiltersSchema, toSearchParams, fromSearchParams, DEFAULT_FILTERS, hasActiveFilters, getFilterCount } from '@/lib/filters/schema';

export interface UseAdvancedFiltersReturn {
  activeFilters: Filters;
  hasActiveFilters: boolean;
  setFilter: (filterType: keyof Filters, value: Filters[keyof Filters]) => void;
  toggleFilter: (filterType: keyof Filters) => void;
  clearFilter: (filterType: keyof Filters) => void;
  clearAllFilters: () => void;
  getFilterCount: () => number;
  updateFilters: (newFilters: Partial<Filters>) => void;
}

export const useAdvancedFilters = (initialFilters: Partial<Filters> = {}): UseAdvancedFiltersReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parse filters from URL, with fallback to defaults
  const [activeFilters, setActiveFilters] = useState<Filters>(() => {
    try {
      if (searchParams.toString()) {
        return fromSearchParams(searchParams);
      }
    } catch (error) {
      console.warn('Failed to parse filters from URL:', error);
    }
    return { ...DEFAULT_FILTERS, ...initialFilters };
  });

  // Update URL when filters change
  const updateURL = useCallback((filters: Filters) => {
    const params = toSearchParams(filters);
    const newURL = params.toString() ? `?${params.toString()}` : '';
    
    // Use replace to avoid adding to browser history for filter changes
    router.replace(newURL, { scroll: false });
  }, [router]);

  // Sync URL with filter state
  useEffect(() => {
    try {
      if (searchParams.toString()) {
        const urlFilters = fromSearchParams(searchParams);
        setActiveFilters(prev => ({ ...prev, ...urlFilters }));
      }
    } catch (error) {
      console.warn('Failed to sync filters from URL:', error);
    }
  }, [searchParams]);

  const setFilter = useCallback((filterType: keyof Filters, value: Filters[keyof Filters]) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      updateURL(newFilters);
      return newFilters;
    });
  }, [updateURL]);

  const toggleFilter = useCallback((filterType: keyof Filters) => {
    setActiveFilters(prev => {
      const currentValue = prev[filterType];
      const newValue = typeof currentValue === 'boolean' ? !currentValue : true;
      const newFilters = { ...prev, [filterType]: newValue };
      updateURL(newFilters);
      return newFilters;
    });
  }, [updateURL]);

  const clearFilter = useCallback((filterType: keyof Filters) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterType];
      updateURL(newFilters);
      return newFilters;
    });
  }, [updateURL]);

  const clearAllFilters = useCallback(() => {
    const defaultFilters = { ...DEFAULT_FILTERS };
    setActiveFilters(defaultFilters);
    updateURL(defaultFilters);
  }, [updateURL]);

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setActiveFilters(prev => {
      const updatedFilters = { ...prev, ...newFilters };
      updateURL(updatedFilters);
      return updatedFilters;
    });
  }, [updateURL]);

  const hasActiveFiltersState = useMemo(() => {
    return hasActiveFilters(activeFilters);
  }, [activeFilters]);

  const getFilterCountState = useCallback(() => {
    return getFilterCount(activeFilters);
  }, [activeFilters]);

  return {
    activeFilters,
    hasActiveFilters: hasActiveFiltersState,
    setFilter,
    toggleFilter,
    clearFilter,
    clearAllFilters,
    getFilterCount: getFilterCountState,
    updateFilters,
  };
}; 