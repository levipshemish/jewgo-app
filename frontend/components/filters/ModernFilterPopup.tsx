'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Wifi, Car, Clock } from 'lucide-react';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { useLocalFilters } from '@/lib/hooks/useLocalFilters';
import { useFilterOptions } from '@/lib/hooks/useFilterOptions';
import { cn } from '@/lib/utils/classNames';

interface ModernFilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  initialFilters: AppliedFilters;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
}

const quickFilterOptions = [
  { id: 'openNow', label: 'Open Now', icon: Clock },
  { id: 'freeWifi', label: 'Free Wi-Fi', icon: Wifi },
  { id: 'parking', label: 'Parking Available', icon: Car },
];

export function ModernFilterPopup({
  isOpen,
  onClose,
  onApplyFilters,
  initialFilters,
  userLocation,
  locationLoading,
  onRequestLocation
}: ModernFilterPopupProps) {
  // Use our existing local filters hook
  const {
    draftFilters,
    hasDraftFilters,
    draftFilterCount,
    setDraftFilter,
    resetDraftFilters,
    clearAllDraftFilters,
    applyFilters,
    isApplying,
  } = useLocalFilters(initialFilters);

  // Fetch filter options from database
  const { filterOptions, loading: filterOptionsLoading, error: filterOptionsError } = useFilterOptions();

  // Local state for quick filters
  const [quickFilters, setQuickFilters] = useState<string[]>([]);

  // Reset quick filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuickFilters([]);
    }
  }, [isOpen]);

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
      openNow: quickFilters.includes('openNow'),
      // Add other quick filter mappings as needed
    };
    
    applyFilters((filters) => onApplyFilters(filters), true);
    onClose();
  };

  const handleClearAll = () => {
    clearAllDraftFilters();
    setQuickFilters([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white border-0 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-black">Filters</h2>
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

        <div className="p-6 space-y-6">
          {/* Distance Filter */}
          {userLocation ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <label className="text-sm font-medium text-black">Distance from You</label>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={draftFilters.maxDistance || 25}
                  onChange={(e) => setDraftFilter('maxDistance', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-green"
                  style={{
                    background: `linear-gradient(to right, #16a34a 0%, #16a34a ${((draftFilters.maxDistance || 25) / 50) * 100}%, #e5e7eb ${((draftFilters.maxDistance || 25) / 50) * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>1 mile</span>
                  <span className="font-medium text-black">{draftFilters.maxDistance || 25} miles</span>
                  <span>50 miles</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-600">Distance from You</label>
              </div>
              <div className="text-center py-4">
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
          <div className="space-y-3">
            <label className="text-sm font-medium text-black">Quick Filters</label>
            <div className="flex flex-wrap gap-2">
              {quickFilterOptions.map((filter) => {
                const Icon = filter.icon;
                const isActive = quickFilters.includes(filter.id);
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleQuickFilter(filter.id)}
                    className={cn(
                      "h-10 px-4 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                      isActive
                        ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                        : "bg-white text-black border-gray-300 hover:bg-gray-50 border"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Certifying Agency Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">Certifying Agency</label>
            <select
              value={draftFilters.agency || ''}
              onChange={(e) => setDraftFilter('agency', e.target.value || undefined)}
              className="w-full bg-white border border-gray-300 text-black rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={filterOptionsLoading}
            >
              <option value="">Select certifying agency</option>
              {filterOptionsLoading ? (
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
              value={draftFilters.category || ''}
              onChange={(e) => setDraftFilter('category', e.target.value || undefined)}
              className="w-full bg-white border border-gray-300 text-black rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={filterOptionsLoading}
            >
              <option value="">Select kosher type</option>
              {filterOptionsLoading ? (
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
              value={draftFilters.priceRange?.[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                setDraftFilter('priceRange', value ? [parseInt(value), parseInt(value) + 1] : undefined);
              }}
              className="w-full bg-white border border-gray-300 text-black rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={filterOptionsLoading}
            >
              <option value="">Select price range</option>
              {filterOptionsLoading ? (
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
              value={draftFilters.ratingMin || ''}
              onChange={(e) => setDraftFilter('ratingMin', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-white border border-gray-300 text-black rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select minimum rating</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClearAll}
              className="flex-1 bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-full py-3 px-4 font-medium transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 rounded-full py-3 px-4 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
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
        `}</style>
      </div>
    </div>
  );
}
