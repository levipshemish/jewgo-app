import React, { useState, useEffect } from 'react';

import { cn } from '@/lib/utils/classNames';
import { Filters } from '@/lib/filters/schema';

interface AdvancedFiltersProps {
  activeFilters: Filters;
  onFilterChange: (filterType: keyof Filters, value: Filters[keyof Filters]) => void;
  onToggleFilter: (filterType: keyof Filters) => void;
  onClearAll: () => void;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
}

interface FilterOptions {
  agencies: string[];
  kosherCategories: string[];
  listingTypes: string[];
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  activeFilters, onFilterChange, onToggleFilter, onClearAll, userLocation, locationLoading, onRequestLocation
}) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    agencies: [],
    kosherCategories: [],
    listingTypes: []
  });
  const [loading, setLoading] = useState(true);

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
            listingTypes: data.data.listingTypes || []
          });
        }
      } catch {
        // console.error('Failed to fetch filter options:', error);
        // Fallback to actual database data
        setFilterOptions({
          agencies: ['Kosher Miami', 'ORB'],
          kosherCategories: ['meat', 'dairy', 'pareve'],
          listingTypes: ['restaurant', 'bakery', 'catering']
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const hasActiveFilters = Object.values(activeFilters).some(filter => 
    filter !== undefined && filter !== false && filter !== '' && filter !== null
  );

  // Normalize kosher category for display
  const normalizeKosherCategory = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized === 'parve') {
      return 'pareve';
    }
    return normalized;
  };

  // Get display name for agency
  const getAgencyDisplayName = (agency: string) => {
    const displayNames: Record<string, string> = {
      'ORB': 'ORB',
      'Kosher Miami': 'Kosher Miami'
    };
    return displayNames[agency] || agency;
  };

  // Get display name for listing type
  const getListingTypeDisplayName = (type: string) => {
    const displayNames: Record<string, string> = {
      'restaurant': 'Restaurants',
      'bakery': 'Bakeries',
      'catering': 'Catering'
    };
    return displayNames[type] || type;
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
    <>
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          background: #2563EB;
          transform: scale(1.1);
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          background: #2563EB;
          transform: scale(1.1);
        }
      `}</style>
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
      </div>

      <div className="space-y-6">
        {/* Quick Filters */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Filters
          </h4>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onToggleFilter('openNow')}
              disabled={locationLoading}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2",
                "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                activeFilters.openNow
                  ? "bg-green-100 text-green-800 border-2 border-green-200"
                  : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Open Now</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleFilter('nearMe')}
              disabled={!userLocation || locationLoading}
              title={!userLocation ? 'Enable location to use this filter' : ''}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2",
                "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                !userLocation || locationLoading ? "opacity-50 cursor-not-allowed" : "",
                activeFilters.nearMe
                  ? "bg-blue-100 text-blue-800 border-2 border-blue-200"
                  : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Near Me</span>
            </button>
          </div>
        </div>

        {/* Distance Slider */}
        {userLocation ? (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Distance from My Location
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max Distance</span>
                <span className="text-sm font-medium text-jewgo-primary">
                  {activeFilters.maxDistanceMi || 25} miles
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={activeFilters.maxDistanceMi || 25}
                  onChange={(e) => onFilterChange('maxDistanceMi', parseInt(e.target.value))}
                  className={cn(
                    "w-full h-2 rounded-lg appearance-none cursor-pointer",
                    "bg-gray-200 slider-thumb",
                    "focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20"
                  )}
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((activeFilters.maxDistanceMi || 25) / 50) * 100}%, #E5E7EB ${((activeFilters.maxDistanceMi || 25) / 50) * 100}%, #E5E7EB 100%)`
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
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Distance from My Location
            </h4>
            <div className="space-y-3">
              <div className="text-center py-4">
                <div className="text-gray-500 text-sm mb-3">
                  {locationLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-jewgo-primary"></div>
                      <span>Getting your location...</span>
                    </div>
                  ) : (
                    <span>Enable location access to filter by distance</span>
                  )}
                </div>
                {!locationLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onRequestLocation) {
                        onRequestLocation();
                      }
                    }}
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
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Certifying Agency
            </h4>
            <div className="relative">
              <select
                value={activeFilters.agency || ''}
                onChange={(e) => onFilterChange('agency', e.target.value || undefined)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                  "appearance-none bg-white",
                  activeFilters.agency
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <option value="" className="py-2">All Agencies</option>
                {filterOptions.agencies.map((agency) => (
                  <option key={agency} value={agency} className="py-2">
                    {getAgencyDisplayName(agency)}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Dietary Preferences Dropdown */}
        {filterOptions.kosherCategories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Dietary Preference
            </h4>
            <div className="relative">
              <select
                value={activeFilters.dietary || ''}
                onChange={(e) => onFilterChange('dietary', e.target.value || undefined)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                  "appearance-none bg-white",
                  activeFilters.dietary
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <option value="" className="py-2">All Types</option>
                {filterOptions.kosherCategories.map((category) => {
                  const normalizedCategory = normalizeKosherCategory(category);
                  return (
                    <option key={category} value={normalizedCategory} className="py-2">
                      {normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1)}
                    </option>
                  );
                })}
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Categories Dropdown */}
        {filterOptions.listingTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Category
            </h4>
            <div className="relative">
              <select
                value={activeFilters.category || ''}
                onChange={(e) => onFilterChange('category', e.target.value || undefined)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                  "appearance-none bg-white",
                  activeFilters.category
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <option value="" className="py-2">All Categories</option>
                {filterOptions.listingTypes.map((type) => (
                  <option key={type} value={type} className="py-2">
                    {getListingTypeDisplayName(type)}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {Object.values(activeFilters).filter(f => 
                  f !== undefined && f !== false && f !== '' && f !== null
                ).length} active filter(s)
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-sm text-jewgo-primary hover:text-jewgo-primary-dark transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default AdvancedFilters; 