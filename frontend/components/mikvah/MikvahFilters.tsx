'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Filters } from '@/lib/filters/schema';
import { useMikvahFilterOptions } from '@/lib/hooks/useMikvahFilterOptions';

interface FilterOptions {
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

interface MikvahFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: Partial<Filters>) => void;
  currentFilters: Partial<Filters>;
}

export const MikvahFilters: React.FC<MikvahFiltersProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<Partial<Filters>>(currentFilters);
  const { filterOptions, loading } = useMikvahFilterOptions();

  const handleFilterChange = (filterType: keyof Filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Filters Modal */}
      <div
        className="mikvah-filters-modal relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: 'white',
          background: 'white',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading filter options...</span>
            </div>
          )}

          {/* Mikvah Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mikvah Type
            </label>
            <select
              value={filters.mikvahType || ''}
              onChange={(e) => handleFilterChange('mikvahType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Types</option>
              {filterOptions?.mikvahTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Mikvah Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mikvah Category
            </label>
            <select
              value={filters.mikvahCategory || ''}
              onChange={(e) => handleFilterChange('mikvahCategory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Categories</option>
              {filterOptions?.mikvahCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Rating
            </label>
            <select
              value={filters.ratingMin || ''}
              onChange={(e) => handleFilterChange('ratingMin', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Any Rating</option>
              {filterOptions?.ratings.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}+ Stars
                </option>
              ))}
            </select>
          </div>

          {/* Distance Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Distance
            </label>
            <select
              value={filters.maxDistanceMi || ''}
              onChange={(e) => handleFilterChange('maxDistanceMi', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
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

          {/* Appointment Required Filter */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.requiresAppointment || false}
                onChange={(e) => handleFilterChange('requiresAppointment', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Appointment Required</span>
            </label>
          </div>

          {/* Walk-in Available Filter */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.walkInAvailable || false}
                onChange={(e) => handleFilterChange('walkInAvailable', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Walk-in Available</span>
            </label>
          </div>

          {/* Facilities Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facilities
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.hasChangingRooms || false}
                  onChange={(e) => handleFilterChange('hasChangingRooms', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Changing Rooms</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.hasShowerFacilities || false}
                  onChange={(e) => handleFilterChange('hasShowerFacilities', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Shower Facilities</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.hasParking || false}
                  onChange={(e) => handleFilterChange('hasParking', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Parking Available</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear All
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
