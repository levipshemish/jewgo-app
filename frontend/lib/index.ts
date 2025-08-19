// Barrel file for lib exports
// This provides stable entry points for commonly used utilities and types

// API exports
export * from './api/marketplace';
export * from './api/adminClient';
export * from './api/health';
export * from './api/specials';

// Auth exports
export * from './auth/mfa-manager';

// Config exports
export * from './api-config';

// Filter exports
export * from '../filters/filters.types';
export * from './filters/urlSync';

// Hook exports
export * from './hooks/useOptimizedFilters';
export * from './hooks/useFilterOptions';
export * from './hooks/useCssLoader';
export * from '../hooks/useAdvancedFilters';

// Type exports
export * from '../types/index';

// Utility exports
export * from './utils/dateUtils';
// export * from '../utils/analytics'; // TEMPORARY: Disabled due to type issues. Cleanup by: 2025-08-26
export * from './utils/admin';
export * from './utils/apiRouteUtils';
export * from './utils/componentUtils';
export * from './utils/distance';
export * from './utils/rateLimiter';
export * from './utils/recaptcha';

// Validator exports
export * from '../validators/review';

// Supabase exports
export * from './supabase/middleware';

// I18n exports
export * from './i18n/index';

// Backup exports
export * from './backups/hoursBackup';
export * from './backups/websiteBackup';
