import { useState, useEffect, useCallback } from 'react';
import { deduplicatedFetch } from '@/lib/utils/request-deduplication';

interface FilterCounts {
  cities: Record<string, number>;
  states: Record<string, number>;
  agencies: Record<string, number>;
  listingTypes: Record<string, number>;
  priceRanges: Record<string, number>;
  kosherCategories: Record<string, number>;
  total: number;
}

interface FilterOptions {
  cities: string[];
  states: string[];
  agencies: string[];
  listingTypes: string[];
  priceRanges: string[];
  kosherCategories: string[];
  ratings?: number[];
  kosherDetails?: string[];
  counts: FilterCounts;
}

interface UseFilterOptionsReturn {
  filterOptions: FilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFilterOptions(): UseFilterOptionsReturn {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await deduplicatedFetch('/api/restaurants/filter-options');
      
      if (data.success && data.data) {
        setFilterOptions(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filter options';
      setError(errorMessage);
      console.error('Error fetching filter options:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  return {
    filterOptions,
    loading,
    error,
    refetch: fetchFilterOptions
  };
}

// Lazy version that only fetches when explicitly triggered
export function useLazyFilterOptions(): UseFilterOptionsReturn & { trigger: () => void } {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await deduplicatedFetch('/api/restaurants/filter-options');
      
      if (data.success && data.data) {
        setFilterOptions(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filter options';
      setError(errorMessage);
      console.error('Error fetching filter options:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const trigger = useCallback(() => {
    if (!hasTriggered) {
      setHasTriggered(true);
      fetchFilterOptions();
    }
  }, [hasTriggered, fetchFilterOptions]);

  return {
    filterOptions,
    loading,
    error,
    refetch: fetchFilterOptions,
    trigger
  };
}
