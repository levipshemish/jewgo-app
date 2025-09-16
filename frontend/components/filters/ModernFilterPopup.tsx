'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { CustomDropdown } from '../ui/CustomDropdown';
import { useLocalFilters } from '@/lib/hooks/useLocalFilters';
import { useLazyFilterOptions } from '@/lib/hooks/useFilterOptions';
import { AppliedFilters } from '@/lib/filters/filters.types';
import { validateFilters, normalizeFilters, getCanonicalDistance } from '@/lib/utils/filterValidation';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterPreview } from './FilterPreview';


interface ModernFilterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AppliedFilters) => void;
  initialFilters: AppliedFilters;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
  entityType?: 'restaurants' | 'synagogues' | 'mikvahs';
  // Optional pre-loaded filter options for combined API approach
  preloadedFilterOptions?: {
    agencies: string[];
    kosherCategories: string[];
    listingTypes: string[];
    priceRanges: string[];
    cities: string[];
    states: string[];
    ratings: number[];
    kosherDetails: string[];
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
  entityType = 'restaurants',
  preloadedFilterOptions
}: ModernFilterPopupProps) {
  // Use our existing local filters hook
  const {
    draftFilters,
    draftFilterCount,
    setDraftFilter,
    applyFilters,
    isApplying,
    clearAllDraftFilters,
    resetDraftFilters,
  } = useLocalFilters(initialFilters);

  // Sync draft filters with initial filters when they change (e.g., when filters are removed from chips)
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length === 0) {
      // If initialFilters is empty, clear draft filters
      resetDraftFilters({});
    } else {
      // Otherwise, reset draft filters to match initial filters
      resetDraftFilters(initialFilters);
    }
  }, [initialFilters, resetDraftFilters]);

  // Use preloaded filter options if available, otherwise lazy load
  const { filterOptions: fetchedFilterOptions, loading: filterOptionsLoading, trigger: loadFilterOptions } = useLazyFilterOptions(entityType);
  
  // Use preloaded options when available, fallback to fetched options
  const filterOptions = preloadedFilterOptions || fetchedFilterOptions;
  
  // Loading state - if we have preloaded options, we're not loading
  const effectiveFilterOptionsLoading = preloadedFilterOptions ? false : filterOptionsLoading;

  // Validation state
  const [validation, setValidation] = useState(() => validateFilters(draftFilters, userLocation));
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Update validation when filters or location change
  useEffect(() => {
    const newValidation = validateFilters(draftFilters, userLocation);
    setValidation(newValidation);
    setShowValidationErrors(newValidation.errors.length > 0);
  }, [draftFilters, userLocation]);


  // Debug: Log when preloadedFilterOptions changes (only in development and when not undefined)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && preloadedFilterOptions !== undefined) {
      console.log('ModernFilterPopup preloadedFilterOptions changed:', preloadedFilterOptions);
    }
  }, [preloadedFilterOptions]);

  // Conditionally trigger filter options load when modal opens
  useEffect(() => {
    if (isOpen) {
      // Wait a bit for preloaded filter options to be available
      const timer = setTimeout(() => {
        // Only load filter options if we don't have preloaded ones and haven't triggered yet
        if (!preloadedFilterOptions && !fetchedFilterOptions) {
          // Note: This fallback should rarely be needed since filter options should come from main API
          console.warn('No preloaded filter options available after timeout, falling back to separate API call');
          loadFilterOptions(); // Lazy load filter options only when needed
        }
      }, 100); // Small delay to allow filter options to be passed down
      
      return () => clearTimeout(timer);
    }
    // No cleanup needed when modal is closed
    return undefined;
  }, [isOpen, loadFilterOptions, preloadedFilterOptions, fetchedFilterOptions]); // Now safe to include since loadFilterOptions is memoized



  const handleApply = () => {
    // Check validation before applying
    if (validation.errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }

    // Normalize filters before applying
    const normalizedFilters = normalizeFilters(draftFilters);
    applyFilters((_filters) => onApplyFilters(normalizedFilters), true);
    onClose();
  };

  const handleClearAll = () => {
    clearAllDraftFilters();
    onApplyFilters({});
  };

  const handleRemoveFilter = (filterKey: string) => {
    setDraftFilter(filterKey as any, undefined);
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end sm:items-center sm:justify-center p-2 sm:p-4">
      {/* Responsive container: bottom sheet on mobile, centered modal on larger screens.
          Width scales by device: full on mobile, then sm→lg→xl breakpoints. */}
      <div className="w-full mx-auto bg-white border-0 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] md:max-h-[90vh] sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
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
          <div className="px-6 py-4 sm:px-8 sm:py-6 space-y-6">
            {/* Validation Errors */}
            {showValidationErrors && validation.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Warnings */}
            {validation.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-medium text-amber-800">Warnings:</h3>
                </div>
                <ul className="text-sm text-amber-700 space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Active Filter Chips */}
            <ActiveFilterChips
              filters={draftFilters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAll}
              showClearAll={false}
              variant="compact"
            />

            {/* Filter Preview */}
            <FilterPreview
              filters={draftFilters}
              userLocation={userLocation}
              className="mb-4"
            />
            {/* Distance Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-900">Distance from You</label>
              </div>
              {userLocation ? (
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={getCanonicalDistance(draftFilters) || 25}
                    onChange={(e) => setDraftFilter('distanceMi', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider-green"
                    style={{
                      background: `linear-gradient(to right, #16a34a 0%, #16a34a ${(((getCanonicalDistance(draftFilters) || 25)) / 50) * 100}%, #e5e7eb ${(((getCanonicalDistance(draftFilters) || 25)) / 50) * 100}%, #e5e7eb 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>0.5 mi</span>
                    <span className="font-medium text-black">{getCanonicalDistance(draftFilters) || 25} miles</span>
                    <span>50 mi</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 sm:py-4">
                  <p className="text-sm text-gray-500 mb-3">
                    {locationLoading ? 'Getting your location...' : 'Enable location to filter by distance'}
                  </p>
                  {/* Debug info in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-gray-400 mb-2">
                      Debug: userLocation={userLocation ? 'Available' : 'null'}, loading={locationLoading ? 'true' : 'false'}
                    </p>
                  )}
                  {!locationLoading && onRequestLocation && (
                    <button
                      onClick={onRequestLocation}
                      className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Enable Location
                    </button>
                  )}
                </div>
              )}
            </div>


            {/* Certifying Agency Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Certifying Agency</label>
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
              <label className="text-sm font-medium text-gray-900">Kosher Type</label>
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
              <label className="text-sm font-medium text-gray-900">Price Range</label>
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
              <label className="text-sm font-medium text-gray-900">Minimum Rating</label>
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
                  ...(effectiveFilterOptionsLoading 
                    ? [{ value: "", label: "Loading..." }]
                    : (filterOptions?.ratings?.map((rating) => ({
                        value: rating.toString(),
                        label: `${rating}+ Stars`
                      })) || [
                        { value: "3", label: "3+ Stars" },
                        { value: "4", label: "4+ Stars" },
                        { value: "4.5", label: "4.5+ Stars" }
                      ])
                  )
                ]}
                placeholder="All Ratings"
              />
            </div>

            {/* Hours Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-900">Available Hours</label>
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

            {/* Kosher Details Filter */}
            {filterOptions?.kosherDetails && filterOptions.kosherDetails.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-900">Kosher Details</label>
                <CustomDropdown
                  value={draftFilters.kosherDetails || ""}
                  onChange={(value) => setDraftFilter('kosherDetails', value || undefined)}
                  options={[
                    { value: "", label: "All Kosher Details" },
                    ...(filterOptions.kosherDetails.map((detail) => ({
                      value: detail,
                      label: detail
                    })))
                  ]}
                  placeholder="All Kosher Details"
                />
              </div>
            )}
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
            disabled={isApplying || validation.errors.length > 0}
            className={`flex-1 rounded-full py-3 sm:py-4 px-4 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 ${
              validation.errors.length > 0
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {validation.errors.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                Fix Errors
              </>
            ) : isApplying ? (
              'Applying...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Apply Filters
              </>
            )}
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
