import { useState, useEffect } from 'react';

export interface FeatureFlags {
  dataExport: boolean;
  bulkOperations: boolean;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  dataExport: true,
  bulkOperations: true,
};

export function useFeatureFlags(): FeatureFlags {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

  useEffect(() => {
    const envFlags: Partial<FeatureFlags> = {};
    
    if (process.env.NEXT_PUBLIC_FEATURE_DATA_EXPORT === 'false') {
      envFlags.dataExport = false;
    }
    
    if (process.env.NEXT_PUBLIC_FEATURE_BULK_OPERATIONS === 'false') {
      envFlags.bulkOperations = false;
    }
    
    setFeatureFlags(prev => ({ ...prev, ...envFlags }));
  }, []);

  return featureFlags;
}

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const featureFlags = useFeatureFlags();
  return featureFlags[flag];
}
