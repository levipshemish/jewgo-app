import { useState, useEffect, useCallback } from 'react';
import { deduplicatedFetch } from '@/lib/utils/request-deduplication';

interface MikvahFilterOptions {
  cities: string[];
  states: string[];
  mikvahTypes: string[];
  mikvahCategories: string[];
  ratings: number[];
  rabbinicalSupervisions: string[];
  facilities: string[];
  accessibility: string[];
  appointmentTypes: string[];
}

interface UseMikvahFilterOptionsReturn {
  filterOptions: MikvahFilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMikvahFilterOptions(): UseMikvahFilterOptionsReturn {
  const [filterOptions, setFilterOptions] = useState<MikvahFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await deduplicatedFetch('/api/v5/mikvahs/filter-options');
      
      if (data.success && data.data) {
        setFilterOptions(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filter options';
      setError(errorMessage);
      console.error('Error fetching mikvah filter options:', err);
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

// Lazy version for the popup
export function useLazyMikvahFilterOptions(): UseMikvahFilterOptionsReturn & { trigger: () => void } {
  const [filterOptions, setFilterOptions] = useState<MikvahFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await deduplicatedFetch('/api/v5/mikvahs/filter-options');
      
      if (data.success && data.data) {
        setFilterOptions(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filter options';
      setError(errorMessage);
      console.error('Error fetching mikvah filter options:', err);
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
