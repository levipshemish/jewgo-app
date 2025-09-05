'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { X, MapPin, Star, Users, Building, Clock } from 'lucide-react';
import { useLocalFilters } from '@/lib/hooks/useLocalFilters';
import { useLazyShulFilterOptions } from '@/lib/hooks/useShulFilterOptions';
import { AppliedFilters } from '@/lib/filters/filters.types';

// ShulFilterOptions interface is defined in the hook file

interface ModernShulFilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  initialFilters: AppliedFilters;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
}

const quickFilterOptions = [
  { id: 'hasDailyMinyan', label: 'Daily Minyan', icon: Clock, supported: true },
  { id: 'hasShabbatServices', label: 'Shabbat Services', icon: Star, supported: true },
  { id: 'hasParking', label: 'Parking', icon: Building, supported: true },
  { id: 'acceptsVisitors', label: 'Welcomes Visitors', icon: Users, supported: true },
];

// Helper function to ensure dropdown value is always valid
const getDropdownValue = (value?: string | null) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return value;
};

export function ModernShulFilterPopup({
  isOpen,
  onClose,
  onApplyFilters,
  initialFilters,
  userLocation,
  locationLoading,
  onRequestLocation,
}: ModernShulFilterPopupProps) {
  const {
    draftFilters,
    draftFilterCount,
    setDraftFilter,
    isApplying,
  } = useLocalFilters(initialFilters);

  const { filterOptions, loading: filterOptionsLoading, trigger: loadFilterOptions } = useLazyShulFilterOptions();
  const [quickFilters, setQuickFilters] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuickFilters([]);
      loadFilterOptions();
    }
  }, [isOpen, loadFilterOptions]);

  const toggleQuickFilter = (filterId: string) => {
    setQuickFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handleApply = () => {
    // Combine draft filters with quick filters
    const combinedFilters = {
      ...draftFilters,
      // Map quick filters to actual filter properties
      hasDailyMinyan: quickFilters.includes('hasDailyMinyan'),
      hasShabbatServices: quickFilters.includes('hasShabbatServices'),
      hasParking: quickFilters.includes('hasParking'),
      acceptsVisitors: quickFilters.includes('acceptsVisitors'),
    };
    
    // Apply the combined filters
    onApplyFilters(combinedFilters);
    onClose();
  };

  const handleClearAll = () => {
    setQuickFilters([]);
    onApplyFilters({});
  };

  // Explicit filter change handlers
  const handleDenominationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const nextDenomination = raw === "" ? undefined : raw;
    setDraftFilter('denomination', nextDenomination);
  }, [setDraftFilter]);

  const handleShulTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const nextShulType = raw === "" ? undefined : raw;
    setDraftFilter('shulType', nextShulType);
  }, [setDraftFilter]);

  const handleRatingChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setDraftFilter('ratingMin', undefined);
    } else {
      const ratingValue = Number(raw);
      if (!isNaN(ratingValue)) {
        setDraftFilter('ratingMin', ratingValue);
      }
    }
  }, [setDraftFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end sm:items-center sm:justify-center p-2 sm:p-4">
      <div className="w-full mx-auto bg-white border-0 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        {/* Mobile handle bar */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 sm:hidden" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-black">Shul Filters</h2>
            {draftFilterCount > 0 && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {draftFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full text-black hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {/* Distance Filter */}
            {userLocation ? (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <label className="text-sm font-medium text-black">Distance from You</label>
                </div>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={draftFilters.distanceMi || draftFilters.maxDistanceMi || 25}
                    onChange={(e) => setDraftFilter('distanceMi', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-green"
                    style={{
                      background: `linear-gradient(to right, #16a34a 0%, #16a34a ${(((draftFilters.distanceMi || draftFilters.maxDistanceMi || 25)) / 50) * 100}%, #e5e7eb ${(((draftFilters.distanceMi || draftFilters.maxDistanceMi || 25)) / 50) * 100}%, #e5e7eb 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>1 mile</span>
                    <span className="font-medium text-black">{draftFilters.distanceMi || draftFilters.maxDistanceMi || 25} miles</span>
                    <span>50 miles</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <label className="text-sm font-medium text-gray-600">Distance from You</label>
                </div>
                <div className="text-center py-3 sm:py-4">
                  <p className="text-sm text-gray-500 mb-3">
                    {locationLoading ? 'Getting your location...' : 'Enable location to filter by distance'}
                  </p>
                  {!locationLoading && onRequestLocation && (
                    <button
                      onClick={onRequestLocation}
                      className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Enable Location
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Filters */}
            <div className="space-y-2 sm:space-y-3">
              <label className="text-sm font-medium text-black">Popular Features</label>
              <div className="flex flex-wrap gap-2">
                {quickFilterOptions.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = quickFilters.includes(filter.id);
                  
                  return (
                    <button
                      key={filter.id}
                      onClick={() => toggleQuickFilter(filter.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Denomination Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Denomination</label>
              <select
                value={getDropdownValue(draftFilters.denomination)}
                onChange={handleDenominationChange}
                className="w-full bg-white text-black border border-green-500 rounded-full px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm appearance-none cursor-pointer modern-select"
                disabled={filterOptionsLoading}
              >
                <option value="">All Denominations</option>
                {filterOptionsLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : filterOptions?.denominations?.map((denomination) => (
                  <option key={denomination} value={denomination}>
                    {denomination}
                  </option>
                ))}
              </select>
            </div>

            {/* Shul Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Shul Type</label>
              <select
                value={getDropdownValue(draftFilters.shulType)}
                onChange={handleShulTypeChange}
                className="w-full bg-white text-black border border-green-500 rounded-full px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm appearance-none cursor-pointer modern-select"
                disabled={filterOptionsLoading}
              >
                <option value="">All Types</option>
                {filterOptionsLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : filterOptions?.shulTypes?.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Minimum Rating</label>
              <select
                value={getDropdownValue(draftFilters.ratingMin?.toString())}
                onChange={handleRatingChange}
                className="w-full bg-white text-black border border-green-500 rounded-full px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm appearance-none cursor-pointer modern-select"
              >
                <option value="">All Ratings</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>

            {/* Services & Facilities Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Services & Facilities</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(filterOptions?.booleanOptions || {}).map(([key, label]) => {
                  const filterValue = draftFilters[key as keyof typeof draftFilters];
                  const isChecked = typeof filterValue === 'boolean' ? filterValue : false;
                  
                  return (
                    <label key={key} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setDraftFilter(key as keyof typeof draftFilters, e.target.checked)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button
            onClick={handleClearAll}
            className="flex-1 bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-full py-2.5 sm:py-3 px-4 font-medium transition-colors text-sm"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 bg-green-600 text-white hover:bg-green-700 rounded-full py-2.5 sm:py-3 px-4 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isApplying ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>

        <style jsx>{`
          .slider-green::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #16a34a;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .slider-green::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #16a34a;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          .modern-select {
            background-color: white !important;
            color: black !important;
            border-radius: 9999px !important;
            border: 1px solid #16a34a !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2316a34a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
            background-position: right 0.75rem center !important;
            background-repeat: no-repeat !important;
            background-size: 1.5em 1.5em !important;
            padding-right: 2.5rem !important;
          }
          
          .modern-select:focus {
            outline: none !important;
            border-color: #16a34a !important;
            box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2) !important;
          }
          
          .modern-select option {
            background-color: white !important;
            color: black !important;
            padding: 8px 12px !important;
            border-radius: 8px !important;
            margin: 2px 0 !important;
          }
          
          .modern-select option:hover {
            background-color: #16a34a !important;
            color: white !important;
          }
          
          .modern-select option:checked {
            background-color: #16a34a !important;
            color: white !important;
          }
        `}</style>
      </div>
    </div>
  );
}
