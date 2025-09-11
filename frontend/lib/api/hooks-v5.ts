/**
 * React hooks for v5 API client.
 * 
 * Provides React hooks for easy integration of the v5 API client
 * with React components, including state management and caching.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from './client-v5';
import { authManager } from './auth-v5';
import type {
  EntityType,
  EntityFilters,
  PaginationOptions,
  MetricsSummary
} from './types-v5';
import type { AuthState } from './auth-v5';

// ============================================================================
// Authentication Hooks
// ============================================================================

/**
 * Hook for authentication state management
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => authManager.getAuthState());

  useEffect(() => {
    const unsubscribe = authManager.addListener(setAuthState);
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    try {
      const response = await apiClient.login(email, password, rememberMe);
      if (response.success && response.data.tokens) {
        apiClient.setTokens(
          response.data.tokens.access_token,
          response.data.tokens.refresh_token
        );
        return { success: true, user: response.data.user };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const register = useCallback(async (userData: { email: string; password: string; name: string }) => {
    try {
      const response = await apiClient.register(userData);
      if (response.success && response.data.tokens) {
        apiClient.setTokens(
          response.data.tokens.access_token,
          response.data.tokens.refresh_token
        );
        return { success: true, user: response.data.user };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      apiClient.clearAuth();
    }
  }, []);

  return {
    ...authState,
    login,
    register,
    logout
  };
}

// ============================================================================
// Entity Hooks
// ============================================================================

interface UseEntityOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

/**
 * Hook for fetching a single entity
 */
export function useEntity<T = any>(
  entityType: EntityType,
  entityId: number | string | null,
  options: UseEntityOptions = {}
) {
  const {
    enabled = true,
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    staleTime = 300000 // 5 minutes
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchEntity = useCallback(async () => {
    if (!entityId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getEntity<T>(entityType, entityId);
      if (response.success) {
        setData(response.data);
        lastFetchRef.current = Date.now();
      } else {
        setError('Failed to fetch entity');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entity');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, enabled]);

  const refetch = useCallback(() => {
    return fetchEntity();
  }, [fetchEntity]);

  const isStale = useMemo(() => {
    return Date.now() - lastFetchRef.current > staleTime;
  }, [staleTime]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && (isStale || !data)) {
      fetchEntity();
    }
  }, [fetchEntity, refetchOnMount, isStale, data]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale) {
        fetchEntity();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchEntity]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale
  };
}

/**
 * Hook for fetching paginated entities
 */
export function useEntities<T = any>(
  entityType: EntityType,
  filters: EntityFilters = {},
  pagination: PaginationOptions = {},
  options: UseEntityOptions = {}
) {
  const {
    enabled = true,
    refetchOnMount = true,
    staleTime = 300000
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationInfo, setPaginationInfo] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchEntities = useCallback(async (reset = false) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const currentPagination = reset ? { ...pagination, cursor: undefined } : pagination;
      const response = await apiClient.getEntities<T>(entityType, filters, currentPagination);
      
      if (response && response.data) {
        const newData = Array.isArray(response.data) ? response.data : [];
        setData(reset ? newData : prev => [...prev, ...newData]);
        setPaginationInfo(response.pagination || {});
        setHasMore(response.pagination?.has_more || false);
        lastFetchRef.current = Date.now();
      } else {
        setError('Failed to fetch entities');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entities');
    } finally {
      setLoading(false);
    }
  }, [entityType, filters, pagination, enabled]);

  const refetch = useCallback(() => {
    return fetchEntities(true);
  }, [fetchEntities]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    
    const nextCursor = paginationInfo?.next_cursor;
    if (nextCursor) {
      fetchEntities(false);
    }
  }, [hasMore, loading, paginationInfo, fetchEntities]);

  const isStale = useMemo(() => {
    return Date.now() - lastFetchRef.current > staleTime;
  }, [staleTime]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && (isStale || data.length === 0)) {
      fetchEntities(true);
    }
  }, [fetchEntities, refetchOnMount, isStale, data.length]);

  return {
    data,
    loading,
    error,
    pagination: paginationInfo,
    hasMore,
    refetch,
    loadMore,
    isStale
  };
}

// ============================================================================
// Search Hooks
// ============================================================================

/**
 * Hook for search functionality
 */
export function useSearch() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    query: string,
    entityTypes?: EntityType[],
    options: {
      location?: { latitude: number; longitude: number; radius?: number };
      includeFacets?: boolean;
      filters?: Record<string, any>;
      pagination?: PaginationOptions;
    } = {}
  ) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.search(query, entityTypes, options);
      if (response.success) {
        setResults(response.data);
      } else {
        setError('Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchEntity = useCallback(async (
    entityType: EntityType,
    query: string,
    options: {
      location?: { latitude: number; longitude: number; radius?: number };
      includeFacets?: boolean;
      filters?: Record<string, any>;
      pagination?: PaginationOptions;
    } = {}
  ) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.searchEntity(entityType, query, options);
      if (response.success) {
        setResults(response.data);
      } else {
        setError('Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    searchEntity,
    clear
  };
}

/**
 * Hook for search suggestions
 */
export function useSearchSuggestions(query: string, entityType?: EntityType, limit?: number) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getSearchSuggestions(query, entityType, limit);
        if (response.success && response.data.suggestions) {
          setSuggestions(response.data.suggestions);
        }
      } catch (error) {
        console.warn('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, entityType, limit]);

  return { suggestions, loading };
}

// ============================================================================
// Review Hooks
// ============================================================================

/**
 * Hook for managing reviews
 */
export function useReviews(
  entityType: EntityType,
  entityId: number,
  options: { rating?: number; verifiedOnly?: boolean } = {}
) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getReviews(entityType, entityId, options);
      if (response.success) {
        setReviews(response.data.reviews || []);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch reviews');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, options]);

  const createReview = useCallback(async (reviewData: {
    rating: number;
    content: string;
    title?: string;
    visitDate?: string;
    tags?: string[];
    wouldRecommend?: boolean;
  }) => {
    try {
      const response = await apiClient.createReview(entityType, entityId, reviewData);
      if (response.success) {
        await fetchReviews(); // Refresh reviews
        return { success: true };
      }
      return { success: false, error: 'Failed to create review' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create review' };
    }
  }, [entityType, entityId, fetchReviews]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    loading,
    error,
    pagination,
    createReview,
    refetch: fetchReviews
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for API client metrics
 */
export function useMetrics() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);

  const refreshSummary = useCallback((timeRange?: { start: number; end: number }) => {
    const metricsCollector = require('./metrics-v5').metricsCollector;
    const newSummary = metricsCollector.getSummary(timeRange);
    setSummary(newSummary);
  }, []);

  useEffect(() => {
    refreshSummary();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshSummary, 30000);
    return () => clearInterval(interval);
  }, [refreshSummary]);

  return {
    summary,
    refresh: refreshSummary
  };
}

/**
 * Hook for cache management
 */
export function useCache() {
  const clearCache = useCallback(() => {
    apiClient.clearCache();
  }, []);

  const invalidateCache = useCallback((pattern?: string) => {
    apiClient.invalidateCache(pattern);
  }, []);

  const getCacheStats = useCallback(() => {
    const cacheManager = require('./cache-v5').cacheManager;
    return cacheManager.getStats();
  }, []);

  return {
    clearCache,
    invalidateCache,
    getCacheStats
  };
}

/**
 * Hook for handling API loading states across multiple requests
 */
export function useApiLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const isLoading = useCallback((key?: string) => {
    if (key) {
      return loadingStates[key] || false;
    }
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const clearLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    setLoading,
    isLoading,
    clearLoading,
    loadingStates
  };
}

/**
 * Hook for debounced API calls
 */
export function useDebouncedApi<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  delay: number = 300
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCall = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        await apiFunction(...args);
      } catch (err: any) {
        setError(err.message || 'API call failed');
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [apiFunction, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    call: debouncedCall,
    loading,
    error
  };
}