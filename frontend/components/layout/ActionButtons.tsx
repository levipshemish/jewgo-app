'use client';

import { Map, Plus, SlidersHorizontal } from 'lucide-react';
import React from 'react';

interface ActionButtonsProps {
  onShowFilters: () => void;
  onShowMap: () => void;
  onAddEatery: () => void;
}

export default function ActionButtons({
  onShowFilters, onShowMap, onAddEatery, }: ActionButtonsProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleMapClick = () => {
    onShowMap();
  };

  const handleAddEateryClick = () => {
    onAddEatery();
  };

  const handleFiltersClick = () => {
    onShowFilters();
  };

  return (
    <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between space-x-2 sm:space-x-3 lg:space-x-6">
          {/* Live Map Button */}
          <button
            type="button"
            onClick={handleMapClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              ...(isMobile && {
                transition: 'all 0.1s ease-out'
              })
            }}
          >
            <Map className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Live Map</span>
          </button>
          
          {/* Add a Eatery Button */}
          <button
            type="button"
            onClick={handleAddEateryClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              ...(isMobile && {
                transition: 'all 0.1s ease-out'
              })
            }}
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Add Eatery</span>
          </button>
          
          {/* Advanced Filters Button */}
          <button
            type="button"
            onClick={handleFiltersClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              ...(isMobile && {
                transition: 'all 0.1s ease-out'
              })
            }}
          >
            <SlidersHorizontal className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
} 