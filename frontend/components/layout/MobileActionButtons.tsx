'use client';

import { Map, Plus, Filter } from 'lucide-react';
import React from 'react';

interface MobileActionButtonsProps {
  onShowFilters: () => void;
  onShowMap: () => void;
  onAddEatery: () => void;
}

export default function MobileActionButtons({
  onShowFilters, onShowMap, onAddEatery, }: MobileActionButtonsProps) {
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
    <div className="bg-white border-b border-gray-200 px-3 py-2">
      <div className="w-full">
        <div className="flex items-center justify-between space-x-2">
          {/* Live Map Button */}
          <button
            onClick={handleMapClick}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 flex-1 font-semibold text-xs group shadow-sm touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <Map size={14} className="group-hover:scale-110 transition-transform duration-200" />
            <span className="truncate">Live Map</span>
          </button>
          
          {/* Add Eatery Button */}
          <button
            onClick={handleAddEateryClick}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 flex-1 font-semibold text-xs group shadow-sm touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <Plus size={14} className="group-hover:scale-110 transition-transform duration-200" />
            <span className="truncate">Add a Eatery</span>
          </button>
          
          {/* Advanced Filters Button */}
          <button
            onClick={handleFiltersClick}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 flex-1 font-semibold text-xs group shadow-sm touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <Filter size={14} className="group-hover:scale-110 transition-transform duration-200" />
            <span className="truncate">Advanced Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
} 