'use client';

import React, { useEffect } from 'react';
import { X, MapPin, Clock } from 'lucide-react';
import { CustomDropdown } from '../ui/CustomDropdown';
import { useLocalFilters } from '@/lib/hooks/useLocalFilters';
import { useLazyFilterOptions } from '@/lib/hooks/useFilterOptions';
import { AppliedFilters } from '@/lib/filters/filters.types';


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


  // Conditionally trigger filter options load when modal opens
  useEffect(() => {
    if (isOpen) {
      // Only load filter options if we don't have preloaded ones
      if (!preloadedFilterOptions) {
        loadFilterOptions(); // Lazy load filter options only when needed
      }
    }
  }, [isOpen, loadFilterOptions, preloadedFilterOptions]); // Now safe to include since loadFilterOptions is memoized


  const handleApply = () => {
    applyFilters((filters) => onApplyFilters(filters), true);
    onClose();
  };


  const handleClearAll = () => {
    // Apply an empty filter object to clear all active filters
    onApplyFilters({});
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end sm:items-center sm:justify-center p-2 sm:p-4">
      {/* Responsive container: bottom sheet on mobile, centered modal on larger screens.
          Width scales by device: full on mobile, then sm→lg→xl breakpoints. */}
      <div className="w-full mx-auto bg-white border-0 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-200 flex-shrink-0">
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
          <div className="px-6 py-4 sm:px-8 sm:py-6 space-y-4 sm:space-y-6">
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
              <div className="space-y-3">
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


            {/* Certifying Agency Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-black">Certifying Agency</label>
              <CustomDropdown
                value={draftFilters.agency || ""}
                onChange={(value) => setDraftFilter('agency', value || undefined)}
                options={[
                  { value: "", label: "All Agencies" },
                  ...(effectiveFilterOptionsLoading 
                    ? [{ value: "", label: "Loading..." }]
                    : (filterOptions?.agencies?.map((agency) => ({
                        value: agency,
                        label: agency
                      })) || [])
                  )
                ]}
                placeholder="All Agencies"
                disabled={effectiveFilterOptionsLoading}
              />
            </div>

            {/* Kosher Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-black">Kosher Type</label>
              <CustomDropdown
                key={`category-${draftFilters.category || 'empty'}`}
                value={draftFilters.category || ""}
                onChange={(value) => setDraftFilter('category', value || undefined)}
                options={[
                  { value: "", label: "All Kosher Types" },
                  ...(effectiveFilterOptionsLoading 
                    ? [{ value: "", label: "Loading..." }]
                    : (filterOptions?.kosherCategories?.map((category) => ({
                        value: category,
                        label: category
                      })) || [])
                  )
                ]}
                placeholder="All Kosher Types"
                disabled={effectiveFilterOptionsLoading}
              />
            </div>

            {/* Price Range Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-black">Price Range</label>
              <CustomDropdown
                value={(() => {
                  // Convert numeric price range back to symbol for display
                  const priceValue = draftFilters.priceRange?.[0];
                  if (priceValue === 1) {return '$';}
                  if (priceValue === 2) {return '$$';}
                  if (priceValue === 3) {return '$$$';}
                  if (priceValue === 4) {return '$$$$';}
                  return '';
                })()}
                onChange={(value) => {
                  if (value === '') {
                    setDraftFilter('priceRange', undefined);
                  } else {
                    // Convert symbol back to numeric value
                    const numericValue = value === '$' ? 1 : 
                                       value === '$$' ? 2 : 
                                       value === '$$$' ? 3 : 
                                       value === '$$$$' ? 4 : undefined;
                    if (numericValue) {
                      setDraftFilter('priceRange', [numericValue, numericValue]);
                    }
                  }
                }}
                options={[
                  { value: "", label: "All Price Ranges" },
                  ...(effectiveFilterOptionsLoading 
                    ? [{ value: "", label: "Loading..." }]
                    : (filterOptions?.priceRanges?.map((priceRange) => ({
                        value: priceRange,
                        label: `${priceRange} - ${priceRange === '$' ? 'Budget Friendly' : 
                          priceRange === '$$' ? 'Moderate' : 
                          priceRange === '$$$' ? 'Expensive' : 'Very Expensive'}`
                      })) || [])
                  )
                ]}
                placeholder="All Price Ranges"
                disabled={effectiveFilterOptionsLoading}
              />
            </div>

            {/* Rating Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-black">Minimum Rating</label>
              <CustomDropdown
                value={draftFilters.ratingMin?.toString() || ""}
                onChange={(value) => {
                  if (value === "") {
                    setDraftFilter('ratingMin', undefined);
                  } else {
                    const ratingValue = Number(value);
                    if (!isNaN(ratingValue)) {
                      setDraftFilter('ratingMin', ratingValue);
                    }
                  }
                }}
                options={[
                  { value: "", label: "All Ratings" },
                  { value: "3", label: "3+ Stars" },
                  { value: "4", label: "4+ Stars" },
                  { value: "4.5", label: "4.5+ Stars" }
                ]}
                placeholder="All Ratings"
              />
            </div>

            {/* Hours Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <label className="text-sm font-medium text-black">Available Hours</label>
              </div>
              <CustomDropdown
                value={draftFilters.hoursFilter || ""}
                onChange={(value) => setDraftFilter('hoursFilter', value || undefined)}
                options={[
                  { value: "", label: "All Hours" },
                  { value: "openNow", label: "Open Now" },
                  { value: "morning", label: "Morning (6 AM - 12 PM)" },
                  { value: "afternoon", label: "Afternoon (12 PM - 6 PM)" },
                  { value: "evening", label: "Evening (6 PM - 10 PM)" },
                  { value: "lateNight", label: "Late Night (10 PM - 6 AM)" }
                ]}
                placeholder="All Hours"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-4 px-6 py-6 sm:px-8 sm:py-8 border-t border-gray-200 flex-shrink-0 bg-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          <button
            onClick={handleClearAll}
            className="flex-1 bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-full py-3 sm:py-4 px-4 font-medium transition-colors text-sm"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 bg-green-600 text-white hover:bg-green-700 rounded-full py-3 sm:py-4 px-4 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
          
        `}</style>
      </div>
    </div>
  );
}
