'use client';

import React, { useState, useEffect } from 'react';

import PillDropdown from '@/components/ui/PillDropdown';
import { AppliedFilters, FilterOptions } from '@/lib/filters/filters.types';
import { getActiveFilterCount } from '@/lib/filters/serialize';
import { useLocalFilters } from '@/lib/hooks/useLocalFilters';
import { cn } from '@/lib/utils/classNames';

import BusinessTypeFilter from './BusinessTypeFilter';


interface AdvancedFilterSheetProps {
  initialApplied: AppliedFilters;
  onApply: (filters: AppliedFilters) => void;
  onCancel?: () => void;
  enableUrlSync?: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
}

const AdvancedFilterSheet: React.FC<AdvancedFilterSheetProps> = ({
  initialApplied, onApply, onCancel, enableUrlSync = true, userLocation, locationLoading, onRequestLocation, }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    agencies: [],
    kosherCategories: [],
    listingTypes: [],
    businessTypes: []
  });
  const [loading, setLoading] = useState(true);

  // Initialize local filters with applied filters
  const {
    draftFilters,
    hasDraftFilters,
    draftFilterCount,
    setDraftFilter,
    resetDraftFilters,
    clearAllDraftFilters,
    applyFilters,
    isApplying,
  } = useLocalFilters(initialApplied);

  // Fetch filter options from API
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/restaurants/filter-options');
        const data = await response.json();
        
        if (data.success && data.data) {
          setFilterOptions({
            agencies: data.data.agencies || [],
            kosherCategories: data.data.kosherCategories || [],
            listingTypes: data.data.listingTypes || [],
            businessTypes: data.data.businessTypes || []
          });
        }
      } catch {
        // Fallback to actual database data
        setFilterOptions({
          agencies: ['Kosher Miami', 'ORB'],
          kosherCategories: ['meat', 'dairy', 'pareve'],
          listingTypes: ['restaurant', 'bakery', 'catering'],
          businessTypes: ['restaurant', 'bakery', 'cafe', 'pizzeria', 'sushi', 'steakhouse', 'deli']
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleApply = () => {
    applyFilters(onApply, enableUrlSync);
  };

  const handleReset = () => {
    resetDraftFilters(initialApplied);
  };

  const handleClearAll = () => {
    clearAllDraftFilters();
  };

  // Helpers for display/normalization
  const normalizeKosherCategory = (category: string) => {
    const normalized = category?.toLowerCase();
    if (normalized === 'parve') {return 'pareve';}
    return normalized;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {hasDraftFilters && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Draft ({draftFilterCount})
              </span>
            )}
        </div>
        <div className="flex items-center space-x-2">
          {getActiveFilterCount(draftFilters) > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm text-jewgo-primary hover:text-jewgo-primary-dark transition-colors font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Quick Filters */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h4>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDraftFilter('openNow', !draftFilters.openNow)}
              disabled={locationLoading}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                draftFilters.openNow
                  ? "bg-green-100 text-green-800 border-2 border-green-200"
                  : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
              )}
            >
              Open Now
            </button>
            <button
              type="button"
              onClick={() => setDraftFilter('nearMe', !draftFilters.nearMe)}
              disabled={!userLocation || locationLoading}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                draftFilters.nearMe
                  ? "bg-blue-100 text-blue-800 border-2 border-blue-200"
                  : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
              )}
            >
              Near Me
            </button>
          </div>
        </div>

        {/* Distance Slider */}
          {userLocation ? (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Distance from My Location</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Max Distance</span>
                  <span className="text-sm font-medium text-jewgo-primary">
                    {draftFilters.maxDistance || 25} miles
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={draftFilters.maxDistance || 25}
                    onChange={(e) => setDraftFilter('maxDistance', parseInt(e.target.value))}
                    className={cn(
                      "w-full h-2 rounded-lg appearance-none cursor-pointer",
                      "bg-gray-200 distance-slider",
                      "focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20"
                    )}
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(((draftFilters.maxDistance || 25)) / 50) * 100}%, #E5E7EB ${(((draftFilters.maxDistance || 25)) / 50) * 100}%, #E5E7EB 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 mile</span>
                    <span>25 miles</span>
                    <span>50 miles</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Distance from My Location</h4>
              <div className="space-y-3">
                <div className="text-center py-4">
                  <div className="text-gray-500 text-sm mb-3">
                    {locationLoading ? (
                      <span>Getting your location...</span>
                    ) : (
                      <span>Enable location access to filter by distance</span>
                    )}
                  </div>
                  {!locationLoading && onRequestLocation && (
                    <button
                      type="button"
                      onClick={() => onRequestLocation?.()}
                      className="px-4 py-2 bg-jewgo-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Enable Location Access
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Certifying Agencies Dropdown */}
          {filterOptions.agencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Certifying Agency</h4>
              <PillDropdown
                options={[{ value: 'all', label: 'All Agencies' }, ...filterOptions.agencies.map(a => ({ value: a, label: a }))]}
                value={draftFilters.agency || 'all'}
                onChange={(value) => setDraftFilter('agency', value === 'all' ? undefined : value)}
                placeholder="Select Certifying Agency"
              />
            </div>
          )}

        {/* Dietary Preferences Dropdown */}
          {filterOptions.kosherCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Dietary Preference</h4>
              <PillDropdown
                options={[{ value: 'all', label: 'All Types' }, ...filterOptions.kosherCategories.map((category) => {
                  const val = normalizeKosherCategory(category);
                  return { value: val, label: val.charAt(0).toUpperCase() + val.slice(1) };
                })]}
                value={draftFilters.dietary || 'all'}
                onChange={(value) => setDraftFilter('dietary', value === 'all' ? undefined : value)}
                placeholder="Select Dietary Preference"
              />
            </div>
          )}

        {/* Categories Dropdown */}
          {filterOptions.listingTypes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Category</h4>
              <PillDropdown
                options={[{ value: 'all', label: 'All Categories' }, ...filterOptions.listingTypes.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))]}
                value={draftFilters.category || 'all'}
                onChange={(value) => setDraftFilter('category', value === 'all' ? undefined : value)}
                placeholder="Select Category"
              />
            </div>
          )}

        {/* Business Types Filter */}
        {filterOptions.businessTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Business Type</h4>
            <BusinessTypeFilter
              selectedTypes={draftFilters.businessTypes || []}
              onTypeChange={(types) => setDraftFilter('businessTypes', types)}
              availableTypes={filterOptions.businessTypes.map(type => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1),
                count: 0 // TODO: Get actual counts from API
              }))}
              disabled={loading}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {draftFilterCount} filter(s) ready to apply
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="px-4 py-2 bg-jewgo-primary text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? 'Applying...' : 'Apply Filters'}
              </button>
            </div>
          </div>
      </div>
    </div>
    </div>
  );
};

export default AdvancedFilterSheet;
