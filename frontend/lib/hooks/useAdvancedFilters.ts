import { useState, useCallback, useMemo } from 'react';
import { FilterState, FilterValue } from '@/lib/types';

export interface UseAdvancedFiltersReturn {
  activeFilters: FilterState;
  hasActiveFilters: boolean;
  setFilter: (filterType: keyof FilterState, value: FilterValue) => void;
  toggleFilter: (filterType: keyof FilterState) => void;
  clearFilter: (filterType: keyof FilterState) => void;
  clearAllFilters: () => void;
  getFilterCount: () => number;
}

export const useAdvancedFilters = (initialFilters: FilterState = {}): UseAdvancedFiltersReturn => {
  const [activeFilters, setActiveFilters] = useState<FilterState>(initialFilters);

  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some(filter => 
      filter !== undefined && filter !== false && filter !== ''
    );
  }, [activeFilters]);

  const setFilter = useCallback((filterType: keyof FilterState, value: FilterValue) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  const toggleFilter = useCallback((filterType: keyof FilterState) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  }, []);

  const clearFilter = useCallback((filterType: keyof FilterState) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterType];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const getFilterCount = useCallback(() => {
    return Object.values(activeFilters).filter(filter => 
      filter !== undefined && filter !== false && filter !== ''
    ).length;
  }, [activeFilters]);

  return {
    activeFilters,
    hasActiveFilters,
    setFilter,
    toggleFilter,
    clearFilter,
    clearAllFilters,
    getFilterCount,
  };
}; 