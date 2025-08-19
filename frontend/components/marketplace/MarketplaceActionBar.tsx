'use client';

import { ChevronDown, Filter, Plus } from 'lucide-react';
import React, { useState } from 'react';

interface MarketplaceActionBarProps {
  onSell: () => void;
  onShowCategories: () => void;
  onShowFilters: () => void;
}

export default function MarketplaceActionBar({
  onSell,
  onShowCategories,
  onShowFilters,
}: MarketplaceActionBarProps) {
  const [isMobile] = useState(false);

  const handleSellClick = () => {
    onSell();
  };

  const handleCategoriesClick = () => {
    onShowCategories();
  };

  const handleFiltersClick = () => {
    onShowFilters();
  };

  return (
    <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between space-x-2 sm:space-x-3 lg:space-x-6">
          {/* Sell Button */}
          <button
            type="button"
            onClick={handleSellClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
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
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Sell</span>
          </button>
          
          {/* Categories Dropdown Button */}
          <button
            type="button"
            onClick={handleCategoriesClick}
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
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Categories</span>
            <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          </button>
          
          {/* Filters Button */}
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
            <Filter className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
