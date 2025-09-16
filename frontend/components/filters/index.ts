/**
 * Filter System Components
 * 
 * This file exports all filter-related components for easy importing
 * and better organization of the filter system.
 */

// Main filter components
export { ModernFilterPopup } from './ModernFilterPopup';
export { FilterPreview } from './FilterPreview';
export { ActiveFilterChips } from './ActiveFilterChips';
export { CollapsibleFilterSection } from './CollapsibleFilterSection';

// Re-export types for convenience
export type {
  AppliedFilters,
  DraftFilters,
  FilterOptions,
  FilterState,
  FilterValue
} from '../../lib/filters/filters.types';

// Re-export hooks
export { useLazyFilterOptions } from '../../lib/hooks/useFilterOptions';
export { useLocalFilters } from '../../lib/hooks/useLocalFilters';
