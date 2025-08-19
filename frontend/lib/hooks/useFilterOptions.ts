import { useState, useEffect } from 'react';

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

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/restaurants/filter-options');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch filter options: ${response.status}`);
      }

      const data = await response.json();
      
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
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  return {
    filterOptions,
    loading,
    error,
    refetch: fetchFilterOptions
  };
}
