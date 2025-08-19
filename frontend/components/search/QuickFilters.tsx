import { MapPin } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils/classNames';

interface QuickFiltersProps {
  openNow: boolean;
  nearMe: boolean;
  onToggleOpenNow: (value: boolean) => void;
  onToggleNearMe: (value: boolean) => void;
  userLocation: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  onRequestLocation?: () => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  openNow, nearMe, onToggleOpenNow, onToggleNearMe, userLocation, locationLoading, onRequestLocation
}) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Quick Filters
      </h4>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onToggleOpenNow(!openNow)}
          disabled={locationLoading}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2",
            "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
            openNow
              ? "bg-green-100 text-green-800 border-2 border-green-200"
              : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>Open Now</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!userLocation && onRequestLocation) {
              onRequestLocation();
              return;
            }
            onToggleNearMe(!nearMe);
          }}
          disabled={locationLoading}
          title={!userLocation ? 'Enable location to use this filter' : ''}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2",
            "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
            (!userLocation || locationLoading) ? "opacity-50" : "",
            nearMe
              ? "bg-blue-100 text-blue-800 border-2 border-blue-200"
              : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
          )}
        >
          <MapPin className="w-4 h-4" />
          <span>Near Me</span>
        </button>
      </div>
    </div>
  );
}; 