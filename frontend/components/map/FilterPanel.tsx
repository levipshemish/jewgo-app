/**
 * Filter Panel - Advanced Filter UI with Modern Design
 * 
 * Restored the sophisticated filter panel with modern design and comprehensive filtering options.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, MapPin, Clock, Star } from 'lucide-react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import { onFiltersChanged } from '@/services/triggers';

export default function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<any>({});
  const filters = useLivemapStore((state) => state.filters);
  const setFilters = useLivemapStore((state) => state.setFilters);

  // Initialize draft filters from current filters
  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const handleKosherChange = (kosherType: 'MEAT' | 'DAIRY' | 'PAREVE') => {
    const currentKosher = draftFilters.kosher || [];
    const newKosher = currentKosher.includes(kosherType)
      ? currentKosher.filter((k: string) => k !== kosherType)
      : [...currentKosher, kosherType];
    
    setDraftFilters({ ...draftFilters, kosher: newKosher.length > 0 ? newKosher : undefined });
  };

  const handleRatingChange = (rating: number) => {
    setDraftFilters({ ...draftFilters, minRating: rating > 0 ? rating : undefined });
  };

  const handleOpenNowChange = () => {
    setDraftFilters({ ...draftFilters, openNow: !draftFilters.openNow });
  };

  const handleDistanceChange = (distance: number) => {
    setDraftFilters({ ...draftFilters, maxDistanceMi: distance > 0 ? distance : undefined });
  };

  const handleAgencyChange = (agency: string) => {
    const currentAgencies = draftFilters.agencies || [];
    const newAgencies = currentAgencies.includes(agency)
      ? currentAgencies.filter((a: string) => a !== agency)
      : [...currentAgencies, agency];
    
    setDraftFilters({ ...draftFilters, agencies: newAgencies.length > 0 ? newAgencies : undefined });
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    onFiltersChanged();
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    setDraftFilters(clearedFilters);
    setFilters(clearedFilters);
    onFiltersChanged();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (draftFilters.kosher?.length > 0) count++;
    if (draftFilters.minRating) count++;
    if (draftFilters.openNow) count++;
    if (draftFilters.maxDistanceMi) count++;
    if (draftFilters.agencies?.length > 0) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <>
      {/* Filter Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-3 hover:bg-white transition-colors flex items-center gap-2"
        >
          <SlidersHorizontal className="w-5 h-5 text-gray-700" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end sm:items-center sm:justify-center p-2 sm:p-4">
          <div className="w-full mx-auto bg-white border-0 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-black">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 sm:px-8 sm:py-6 space-y-6">
              {/* Kosher Type Filters */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Kosher Type
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {(['MEAT', 'DAIRY', 'PAREVE'] as const).map((type) => (
                    <label key={type} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.kosher?.includes(type) || false}
                        onChange={() => handleKosherChange(type)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Minimum Rating
                </h3>
                <select
                  value={draftFilters.minRating || 0}
                  onChange={(e) => handleRatingChange(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3}>3+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>

              {/* Distance Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Maximum Distance
                </h3>
                <select
                  value={draftFilters.maxDistanceMi || 0}
                  onChange={(e) => handleDistanceChange(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value={0}>Any Distance</option>
                  <option value={1}>Within 1 mile</option>
                  <option value={5}>Within 5 miles</option>
                  <option value={10}>Within 10 miles</option>
                  <option value={25}>Within 25 miles</option>
                </select>
              </div>

              {/* Open Now Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Availability
                </h3>
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftFilters.openNow || false}
                    onChange={handleOpenNowChange}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Open Now</span>
                </label>
              </div>

              {/* Certifying Agencies */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Certifying Agencies</h3>
                <div className="grid grid-cols-1 gap-3">
                  {['OU', 'Kof-K', 'Star-K', 'CRC', 'Chabad'].map((agency) => (
                    <label key={agency} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.agencies?.includes(agency) || false}
                        onChange={() => handleAgencyChange(agency)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{agency}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
