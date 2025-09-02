'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, MapPin, Star, DollarSign, Shield, Utensils } from 'lucide-react';
import { useLocalFilters } from '@/lib/hooks/useLocalFilters';
import { useLazyFilterOptions } from '@/lib/hooks/useFilterOptions';
import { DraftFilters, AppliedFilters } from '@/lib/filters/filters.types';
import { cn } from '@/lib/utils/classNames';

// Helper function to normalize UI state ↔ form control
const toSelectValue = (v?: string | null) => {
  // Handle undefined, null, and empty string cases
  if (v === undefined || v === null || v === '') {
    return '';
  }
  return v;
};

// Helper function to ensure dropdown value is always valid
const getDropdownValue = (value?: string | null) => {
  // If the value is not in the available options, default to empty string
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return value;
};

// One canonical cleaner for filters (use it everywhere)
function cleanFilters<T extends Record<string, any>>(raw: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) {continue;}
    if (typeof v === "string" && v.trim() === "") {continue;}
    if (Array.isArray(v) && v.length === 0) {continue;}
    out[k as keyof T] = v as any;
  }
  return out;
}

interface ModernFilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  initialFilters: AppliedFilters;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
  // Optional pre-loaded filter options for combined API approach
  preloadedFilterOptions?: {
    agencies: string[];
    kosherCategories: string[];
    listingTypes: string[];
    priceRanges: string[];
    cities: string[];
    states: string[];
  } | null;
}

const quickFilterOptions = [
  { id: 'openNow', label: 'Open Now', icon: Star, supported: false }, // TODO: Implement hours table
  { id: 'freeWifi', label: 'Free Wi-Fi', icon: Shield, supported: false }, // TODO: Add wifi column
  { id: 'parking', label: 'Parking Available', icon: DollarSign, supported: false }, // TODO: Add parking column
  { id: 'kosher', label: 'Kosher', icon: Utensils, supported: true }, // Already filtered by kosher_category
];

export function ModernFilterPopup({
  isOpen,
  onClose,
  onApplyFilters,
  initialFilters,
  userLocation,
  locationLoading,
  onRequestLocation,
  preloadedFilterOptions
}: ModernFilterPopupProps) {
  // Use our existing local filters hook
  const {
    draftFilters,
    draftFilterCount,
    setDraftFilter,
    applyFilters,
    isApplying,
  } = useLocalFilters(initialFilters);

  // Use preloaded filter options if available, otherwise lazy load
  const { filterOptions: fetchedFilterOptions, loading: filterOptionsLoading, trigger: loadFilterOptions } = useLazyFilterOptions();
  
  // Use preloaded options when available, fallback to fetched options
  const filterOptions = preloadedFilterOptions || fetchedFilterOptions;
  
  // Loading state - if we have preloaded options, we're not loading
  const effectiveFilterOptionsLoading = preloadedFilterOptions ? false : filterOptionsLoading;

  // Local state for quick filters
  const [quickFilters, setQuickFilters] = useState<string[]>([]);

  // Reset quick filters and conditionally trigger filter options load when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuickFilters([]);
      // Only load filter options if we don't have preloaded ones
      if (!preloadedFilterOptions) {
        loadFilterOptions(); // Lazy load filter options only when needed
      }
    }
  }, [isOpen, loadFilterOptions, preloadedFilterOptions]); // Now safe to include since loadFilterOptions is memoized

  const toggleQuickFilter = (filterId: string) => {
    setQuickFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handleApply = () => {
    // Combine draft filters with quick filters
    const finalFilters = {
      ...draftFilters,
      openNow: quickFilters.includes('openNow'),
      // Add other quick filter mappings as needed
    };
    
    applyFilters((filters) => onApplyFilters(filters), true);
    onClose();
  };

  // Explicit category change logic (no state races, no leaky keys)
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;           // "" for All, otherwise a string
    const nextCategory = raw === "" ? undefined : raw;

    // Update draft synchronously via functional set to avoid lost updates
    setDraftFilter('category', nextCategory);
  }, [setDraftFilter]);

  const handleAgencyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const nextAgency = raw === "" ? undefined : raw;

    setDraftFilter('agency', nextAgency);
  }, [setDraftFilter]);

  const handlePriceRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setDraftFilter('priceRange', undefined);
    } else {
      // Map price symbols to numeric values correctly
      const priceMap: Record<string, number> = {
        '$': 1,
        '$$': 2, 
        '$$$': 3,
        '$$$$': 4
      };
      
      const priceValue = priceMap[raw];
      if (priceValue) {
        // Create range: for $$ (value 2), range is [2,2] not [2,3]
        const nextPriceRange = [priceValue, priceValue] as [number, number];
        setDraftFilter('priceRange', nextPriceRange);
      }
    }
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

  const handleClearAll = () => {
    // clearAllDraftFilters(); // This line was removed as per the edit hint
    setQuickFilters([]);
    // Apply an empty filter object to clear all active filters
    onApplyFilters({});
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center p-2 sm:p-4">
      <div className="w-full max-w-md mx-auto bg-white border-0 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[70vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-black">Filters</h2>
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
                    value={draftFilters.distanceMi || draftFilters.maxDistanceMi || draftFilters.maxDistance || 25}
                    onChange={(e) => setDraftFilter('distanceMi', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-green"
                    style={{
                      background: `linear-gradient(to right, #16a34a 0%, #16a34a ${(((draftFilters.distanceMi || draftFilters.maxDistanceMi || draftFilters.maxDistance || 25)) / 50) * 100}%, #e5e7eb ${(((draftFilters.distanceMi || draftFilters.maxDistanceMi || draftFilters.maxDistance || 25)) / 50) * 100}%, #e5e7eb 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>1 mile</span>
                    <span className="font-medium text-black">{draftFilters.distanceMi || draftFilters.maxDistanceMi || draftFilters.maxDistance || 25} miles</span>
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
              <label className="text-sm font-medium text-black">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                {quickFilterOptions
                  .filter(filter => filter.supported) // Only show supported filters
                  .map((filter) => {
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
              {quickFilterOptions.some(filter => !filter.supported) && (
                <p className="text-xs text-gray-500">
                  More filters coming soon! We're working on adding hours, Wi-Fi, and parking information.
                </p>
              )}
            </div>

            {/* Certifying Agency Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Certifying Agency</label>
              <select
                value={getDropdownValue(draftFilters.agency)}
                onChange={handleAgencyChange}
                className="w-full bg-white text-black border border-green-500 rounded-full px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm appearance-none cursor-pointer modern-select"
                disabled={effectiveFilterOptionsLoading}
              >
                <option value="">All Agencies</option>
                {effectiveFilterOptionsLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : filterOptions?.agencies?.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
              </select>
            </div>

            {/* Kosher Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Kosher Type</label>
              <select
                key={`category-${draftFilters.category || 'empty'}`}
                value={getDropdownValue(draftFilters.category)}
                onChange={handleCategoryChange}
                className="w-full bg-white text-black border border-green-500 rounded-full px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm appearance-none cursor-pointer modern-select"
                disabled={effectiveFilterOptionsLoading}
              >
                <option value="">All Kosher Types</option>
                {effectiveFilterOptionsLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : filterOptions?.kosherCategories?.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Price Range</label>
              <select
                value={(() => {
                  // Convert numeric price range back to symbol for display
                  const priceValue = draftFilters.priceRange?.[0];
                  if (priceValue === 1) {return '$';}
                  if (priceValue === 2) {return '$$';}
                  if (priceValue === 3) {return '$$$';}
                  if (priceValue === 4) {return '$$$$';}
                  return '';
                })()}
                onChange={handlePriceRangeChange}
                className="w-full bg-white text-black border border-green-500 rounded-full px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm appearance-none cursor-pointer modern-select"
                disabled={effectiveFilterOptionsLoading}
              >
                <option value="">All Price Ranges</option>
                {effectiveFilterOptionsLoading ? (
                  <option value="" disabled>Loading...</option>
                ) : filterOptions?.priceRanges?.map((priceRange) => (
                  <option key={priceRange} value={priceRange}>
                    {priceRange} - {priceRange === '$' ? 'Budget Friendly' : 
                      priceRange === '$$' ? 'Moderate' : 
                      priceRange === '$$$' ? 'Expensive' : 'Very Expensive'}
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
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
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
          
          /* Modern select dropdown styling */
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
