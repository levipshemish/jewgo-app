import React from 'react';

import { AgencyFilters } from './AgencyFilters';
import { DietaryFilters } from './DietaryFilters';
import { QuickFilters } from './QuickFilters';

interface AdvancedFiltersProps {
  activeFilters: {
    agency?: string;
    dietary?: string;
    openNow?: boolean;
    category?: string;
    nearMe?: boolean;
  };
  onFilterChange: (filterType: 'agency' | 'dietary' | 'category', value: string) => void;
  onToggleFilter: (filterType: 'openNow' | 'nearMe', value: boolean) => void;
  onClearAll: () => void;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
}

export const AdvancedFiltersRefactored: React.FC<AdvancedFiltersProps> = ({
  activeFilters, onFilterChange, onToggleFilter, onClearAll, userLocation, locationLoading, onRequestLocation
}) => {
  const hasActiveFilters = Object.values(activeFilters).some(filter => filter !== undefined && filter !== false);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-jewgo-primary hover:text-jewgo-primary-dark transition-colors font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Quick Filters */}
        <QuickFilters
          openNow={activeFilters.openNow || false}
          nearMe={activeFilters.nearMe || false}
          onToggleOpenNow={(value) => onToggleFilter('openNow', value)}
          onToggleNearMe={(value) => onToggleFilter('nearMe', value)}
          userLocation={userLocation}
          locationLoading={locationLoading}
          onRequestLocation={onRequestLocation}
        />

        {/* Certifying Agencies */}
        <AgencyFilters
          selectedAgency={activeFilters.agency}
          onAgencyChange={(agency) => onFilterChange('agency', agency)}
        />

        {/* Dietary Preferences */}
        <DietaryFilters
          selectedDietary={activeFilters.dietary}
          onDietaryChange={(dietary) => onFilterChange('dietary', dietary)}
        />
      </div>
    </div>
  );
}; 