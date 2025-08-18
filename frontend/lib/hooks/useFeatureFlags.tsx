import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export interface FeatureFlag {
  enabled: boolean;
  description: string;
  version: string;
  rollout_percentage: number;
  target_environments: string[];
  expires_at?: string;
}

export interface FeatureFlagsResponse {
  feature_flags: Record<string, FeatureFlag>;
  environment: string;
  user_id?: string;
}

export interface UseFeatureFlagsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export function useFeatureFlags(options: UseFeatureFlagsOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    onError
  } = options;

  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [environment, setEnvironment] = useState<string>('');
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
      const response = await fetch(`${backendUrl}/api/feature-flags`);

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.status}`);
      }

      const data: FeatureFlagsResponse = await response.json();
      
      setFlags(data.feature_flags);
      setEnvironment(data.environment);
      setUserId(data.user_id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Initial fetch
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) {return;}

    const interval = setInterval(fetchFlags, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchFlags]);

  const isFeatureEnabled = useCallback((flagName: string, defaultEnabled: boolean = false): boolean => {
    const flag = flags[flagName];
    return flag?.enabled ?? defaultEnabled;
  }, [flags]);

  const getFeatureFlag = useCallback((flagName: string): FeatureFlag | undefined => {
    return flags[flagName];
  }, [flags]);

  const refreshFlags = useCallback(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    flags,
    environment,
    userId,
    loading,
    error,
    isFeatureEnabled,
    getFeatureFlag,
    refreshFlags
  };
}

export function useFeatureFlag(flagName: string, defaultEnabled: boolean = false) {
  const { isFeatureEnabled, getFeatureFlag, loading, error } = useFeatureFlags();
  
  const enabled = isFeatureEnabled(flagName, defaultEnabled);
  const flag = getFeatureFlag(flagName);

  return {
    enabled,
    flag,
    loading,
    error
  };
}

// Feature flag context for global state management

interface FeatureFlagsContextType {
  flags: Record<string, FeatureFlag>;
  environment: string;
  userId?: string;
  loading: boolean;
  error: Error | null;
  isFeatureEnabled: (flagName: string, defaultEnabled?: boolean) => boolean;
  getFeatureFlag: (flagName: string) => FeatureFlag | undefined;
  refreshFlags: () => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children, options }: { children: ReactNode; options?: UseFeatureFlagsOptions }) {
  const featureFlags = useFeatureFlags(options);

  return (
    <FeatureFlagsContext.Provider value={featureFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlagsContext() {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlagsContext must be used within a FeatureFlagsProvider');
  }
  return context;
}

// Utility functions
export function withFeatureFlag<T extends object>(
  Component: React.ComponentType<T>, flagName: string, defaultEnabled: boolean = false, fallbackComponent?: React.ComponentType<T>) {
  return function FeatureFlaggedComponent(props: T) {
    const { enabled, loading } = useFeatureFlag(flagName, defaultEnabled);

    if (loading) {
      return <div className="animate-pulse">Loading...</div>;
    }

    if (!enabled) {
      return fallbackComponent ? React.createElement(fallbackComponent, props) : null;
    }

    return <Component {...props} />;
  };
}

export function FeatureFlag({ 
  name, defaultEnabled = false, children, fallback = null 
}: {
  name: string;
  defaultEnabled?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { enabled, loading } = useFeatureFlag(name, defaultEnabled);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
} 