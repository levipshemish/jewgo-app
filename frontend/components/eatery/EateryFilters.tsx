'use client';

import React, { useState, useEffect } from 'react';
import { Filters } from '@/lib/filters/schema';

interface FilterOptions {
  cities: string[];
  states: string[];
  agencies: string[];
  listingTypes: string[];
  priceRanges: string[];
  kosherCategories: string[];
  counts: {
    cities: Record<string, number>;
    states: Record<string, number>;
    agencies: Record<string, number>;
    listingTypes: Record<string, number>;
    priceRanges: Record<string, number>;
    kosherCategories: Record<string, number>;
    total: number;
  };
}

interface EateryFiltersProps {
  activeFilters: Filters;
  onFilterChange: (filterType: keyof Filters, value: Filters[keyof Filters]) => void;
  onFilterClear: () => void;
  _userLocation: { latitude: number; longitude: number } | null;
  _locationLoading: boolean;
  _onRequestLocation?: () => void;
}

export const EateryFilters: React.FC<EateryFiltersProps> = ({
  activeFilters,
  onFilterChange,
  onFilterClear,
  _userLocation,
  _locationLoading,
  _onRequestLocation,
}) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch filter options from database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/restaurants/filter-options');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setFilterOptions(data.data);
          }
        }
      } catch (error) {
        // Handle JSON parsing errors gracefully
        if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
          // eslint-disable-next-line no-console
          console.error('Filter options API returned non-JSON response (likely authentication required)');
        } else {
          console.error('Error fetching filter options:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleFilterChange = (filterType: keyof Filters, value: any) => {
    onFilterChange(filterType, value);
  };

  const handleClearFilters = () => {
    onFilterClear();
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
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-jewgo-primary hover:text-jewgo-primary-dark transition-colors font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Rating
          </label>
          <select
            value={activeFilters.ratingMin || ''}
            onChange={(e) => handleFilterChange('ratingMin', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any Rating</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="3.0">3.0+ Stars</option>
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <select
                value={activeFilters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Min Price</option>
                {filterOptions?.priceRanges?.map((price) => {
                  const priceValue = price.length; // Convert $ to 1, $$ to 2, etc.
                  return (
                    <option key={price} value={priceValue}>
                      {price} ({filterOptions?.counts?.priceRanges?.[price] || 0})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <select
                value={activeFilters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Max Price</option>
                {filterOptions?.priceRanges?.map((price) => {
                  const priceValue = price.length; // Convert $ to 1, $$ to 2, etc.
                  return (
                    <option key={price} value={priceValue}>
                      {price} ({filterOptions?.counts?.priceRanges?.[price] || 0})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Distance Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Distance
          </label>
          <select
            value={activeFilters.maxDistanceMi || ''}
            onChange={(e) => handleFilterChange('maxDistanceMi', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any Distance</option>
            <option value="1">Within 1 mile</option>
            <option value="3">Within 3 miles</option>
            <option value="5">Within 5 miles</option>
            <option value="10">Within 10 miles</option>
            <option value="25">Within 25 miles</option>
            <option value="50">Within 50 miles</option>
          </select>
        </div>

        {/* Open Now Filter */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={activeFilters.openNow || false}
              onChange={(e) => handleFilterChange('openNow', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Open Now</span>
          </label>
        </div>
      </div>
    </div>
  );
};
