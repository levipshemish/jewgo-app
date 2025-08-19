'use client';

import { Plus, SlidersHorizontal, Tag } from 'lucide-react';
import React from 'react';

interface MarketplaceActionButtonsProps {
  onShowFilters: () => void;
  onShowCategories: () => void;
  onAddListing: () => void;
}

export default function MarketplaceActionButtons({
  onShowFilters, onShowCategories, onAddListing, }: MarketplaceActionButtonsProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleCategoriesClick = () => {
    onShowCategories();
  };

  const handleAddListingClick = () => {
    onAddListing();
  };

  const handleFiltersClick = () => {
    onShowFilters();
  };

  return (
    <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between space-x-2 sm:space-x-3 lg:space-x-6">
          {/* Categories Button */}
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
            <Tag className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Categories</span>
          </button>
          
          {/* Add Listing Button */}
          <button
            type="button"
            onClick={handleAddListingClick}
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
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Sell</span>
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
            <SlidersHorizontal className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
