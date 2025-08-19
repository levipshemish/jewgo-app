'use client';

import React from 'react';

interface MapControlsProps {
  userLocation: { latitude: number; longitude: number; accuracy?: number } | null;
  showDirections: boolean;
  setShowDirections: (show: boolean) => void;
  onLocationClick: () => void;
  onClearDirections: () => void;
}

export default function MapControls({
  userLocation, showDirections, setShowDirections: _setShowDirections, onLocationClick, onClearDirections
}: MapControlsProps) {
  return (
    <>
      {/* Directions Toggle Button */}
      {userLocation && showDirections && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <button
            onClick={onClearDirections}
            className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg hover:bg-white transition-colors flex items-center space-x-1 sm:space-x-2 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] touch-manipulation"
            title="Clear directions"
            aria-label="Clear directions"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">
              Clear
            </span>
          </button>
        </div>
      )}

      {/* Center on User Location Button - Mobile Optimized */}
      <div className="absolute top-2 right-16 sm:top-4 sm:right-20 z-10">
        <button
          onClick={onLocationClick}
          className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg hover:bg-white transition-colors flex items-center space-x-1 sm:space-x-2 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] touch-manipulation"
          title={userLocation ? "Back to your location" : "Get my location"}
          aria-label={userLocation ? "Center map on your location" : "Get your current location"}
          aria-describedby="location-button-description"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">
            {userLocation ? "My Location" : "Get Location"}
          </span>
        </button>
      </div>
    </>
  );
}
