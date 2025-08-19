'use client';

import { useReducer, useCallback, useMemo, useTransition } from 'react';

import { DraftFilters, AppliedFilters, FilterValue } from '@/lib/filters/filters.types';
import { getActiveFilterCount } from '@/lib/filters/serialize';

interface FilterAction {
  type: 'SET_FILTER' | 'RESET_FILTERS' | 'CLEAR_ALL';
  payload?: {
    key?: keyof DraftFilters;
    value?: FilterValue;
    filters?: DraftFilters;
  };
}

function filterReducer(state: DraftFilters, action: FilterAction): DraftFilters {
  switch (action.type) {
    case 'SET_FILTER':
      if (action.payload?.key && action.payload.value !== undefined) {
        return {
          ...state,
          [action.payload.key]: action.payload.value,
        };
      }
      return state;
      
    case 'RESET_FILTERS':
      return action.payload?.filters || {};
      
    case 'CLEAR_ALL':
      return {};
      
    default:
      return state;
  }
}

export interface UseLocalFiltersReturn {
  draftFilters: DraftFilters;
  hasDraftFilters: boolean;
  draftFilterCount: number;
  setDraftFilter: (key: keyof DraftFilters, value: FilterValue) => void;
  resetDraftFilters: (filters?: DraftFilters) => void;
  clearAllDraftFilters: () => void;
  applyFilters: (onApply: (filters: AppliedFilters) => void, enableUrlSync?: boolean) => void;
  isApplying: boolean;
}

export function useLocalFilters(initialFilters: DraftFilters = {}): UseLocalFiltersReturn {
  const [draftFilters, dispatch] = useReducer(filterReducer, initialFilters);
  const [isPending, startTransition] = useTransition();

  const hasDraftFilters = useMemo(() => {
    return getActiveFilterCount(draftFilters) > 0;
  }, [draftFilters]);

  const draftFilterCount = useMemo(() => {
    return getActiveFilterCount(draftFilters);
  }, [draftFilters]);

  const setDraftFilter = useCallback((key: keyof DraftFilters, value: FilterValue) => {
    dispatch({
      type: 'SET_FILTER',
      payload: { key, value },
    });
  }, []);

  const resetDraftFilters = useCallback((filters?: DraftFilters) => {
    dispatch({
      type: 'RESET_FILTERS',
      payload: { filters },
    });
  }, []);

  const clearAllDraftFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const applyFilters = useCallback((
    onApply: (filters: AppliedFilters) => void,
    enableUrlSync: boolean = true
  ) => {
    startTransition(() => {
      // Convert draft filters to applied filters
      const appliedFilters: AppliedFilters = {
        ...draftFilters,
        // Add any additional properties needed for applied filters
      };
      
      onApply(appliedFilters);
      
      // URL sync is handled by the parent component
      if (enableUrlSync) {
        // This will be handled by the parent component
        // to avoid circular dependencies
      }
    });
  }, [draftFilters]);

  return {
    draftFilters,
    hasDraftFilters,
    draftFilterCount,
    setDraftFilter,
    resetDraftFilters,
    clearAllDraftFilters,
    applyFilters,
    isApplying: isPending,
  };
}
