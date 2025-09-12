'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

interface StoreFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: Partial<Filters>) => void;
  currentFilters: Partial<Filters>;
}

export const StoreFilters: React.FC<StoreFiltersProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<Partial<Filters>>(currentFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch filter options from database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v5/restaurants/filter-options');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setFilterOptions(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

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
        className="store-filters-modal relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
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

          {/* Store Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Type
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Types</option>
              <option value="grocery">Grocery Store</option>
              <option value="butcher">Butcher Shop</option>
              <option value="bakery">Bakery</option>
              <option value="deli">Deli</option>
              <option value="convenience">Convenience Store</option>
              <option value="specialty">Specialty Food Store</option>
              <option value="kosher_market">Kosher Market</option>
            </select>
          </div>

          {/* Kosher Agency Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kosher Agency
            </label>
            <select
              value={filters.agency || ''}
              onChange={(e) => handleFilterChange('agency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Agencies</option>
              {filterOptions?.agencies.map((agency) => (
                <option key={agency} value={agency}>
                  {agency} ({filterOptions.counts.agencies[agency] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Dietary Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dietary Type
            </label>
            <select
              value={filters.dietary || ''}
              onChange={(e) => handleFilterChange('dietary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Types</option>
              {filterOptions?.kosherCategories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({filterOptions.counts.kosherCategories[category] || 0})
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
                  value={filters.priceMin || ''}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">Min Price</option>
                  {filterOptions?.priceRanges.map((price) => {
                    const priceValue = price.length; // Convert $ to 1, $$ to 2, etc.
                    return (
                      <option key={price} value={priceValue}>
                        {price} ({filterOptions.counts.priceRanges[price] || 0})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <select
                  value={filters.priceMax || ''}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">Max Price</option>
                  {filterOptions?.priceRanges.map((price) => {
                    const priceValue = price.length; // Convert $ to 1, $$ to 2, etc.
                    return (
                      <option key={price} value={priceValue}>
                        {price} ({filterOptions.counts.priceRanges[price] || 0})
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

          {/* Open Now Filter */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.openNow || false}
                onChange={(e) => handleFilterChange('openNow', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Open Now</span>
            </label>
          </div>

          {/* Store Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Features
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.hasParking || false}
                  onChange={(e) => handleFilterChange('hasParking', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Parking Available</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.hasDelivery || false}
                  onChange={(e) => handleFilterChange('hasDelivery', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Delivery Available</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.hasPickup || false}
                  onChange={(e) => handleFilterChange('hasPickup', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Pickup Available</span>
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
