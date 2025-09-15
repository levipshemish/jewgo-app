'use client';

import React from 'react';

interface MapLegendProps {
  showRatingBubbles: boolean;
}

export default function MapLegend({ showRatingBubbles }: MapLegendProps) {
  return (
    <div 
      className="absolute top-28 left-2 sm:top-32 sm:left-4 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2 shadow-lg z-10 max-w-[100px] sm:max-w-[120px] md:max-w-none"
      role="region"
      aria-label="Map legend showing kosher restaurant types"
    >
      <div className="text-xs font-medium text-gray-700 mb-1 sm:mb-2">
        Kosher Types:
      </div>
      {showRatingBubbles ? (
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#A70000]"></div>
            <span className="text-xs text-gray-600">Meat</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#ADD8E6]"></div>
            <span className="text-xs text-gray-600">Dairy</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#FFCE6D]"></div>
            <span className="text-xs text-gray-600">Pareve</span>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#A70000]"></div>
            <span className="text-xs text-gray-600">Meat</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ADD8E6]"></div>
            <span className="text-xs text-gray-600">Dairy</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFCE6D]"></div>
            <span className="text-xs text-gray-600">Pareve</span>
          </div>
        </div>
      )}
    </div>
  );
}
