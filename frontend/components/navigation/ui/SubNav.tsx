'use client';

import React from 'react';
import { MapPin, Plus, SlidersHorizontal, Map, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubNavProps {
  variant?: 'simple' | 'eatery' | 'complex';
  className?: string;
  // Complex variant props
  onShowFilters?: () => void;
  onShowMap?: () => void;
  onAddEatery?: () => void;
}

const SubNav: React.FC<SubNavProps> = ({ 
  variant = 'simple', className = '', onShowFilters, onShowMap, onAddEatery
}) => {
  const router = useRouter();

  // Simple variant (original /components/layout/ActionButtons.tsx)
  if (variant === 'simple') {
    return (
      <div className="bg-white border-b border-gray-200 px-2 py-2 sm:px-4 sm:py-3">
        <div className="w-full">
          <div className="flex items-center justify-between space-x-1.5 sm:space-x-3">
            <button
              onClick={onShowMap || (() => router.push('/live-map'))}
              className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-transparent text-gray-600 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm transition-all duration-200 flex-1 justify-center text-xs sm:text-sm font-medium group"
            >
              <Map size={12} className="sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
              <span className="truncate">Map</span>
            </button>
            
            <button
              onClick={onAddEatery || (() => router.push('/add-eatery'))}
              className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-transparent text-gray-600 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm transition-all duration-200 flex-1 justify-center text-xs sm:text-sm font-medium group"
            >
              <Plus size={12} className="sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
              <span className="truncate">Add</span>
            </button>
            
            <button
              onClick={onShowFilters || (() => {
                if (process.env.NODE_ENV === 'development') {
                  }
              })}
              className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-transparent text-gray-600 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm transition-all duration-200 flex-1 justify-center text-xs sm:text-sm font-medium group"
            >
              <Filter size={12} className="sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
              <span className="truncate">Filters</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Eatery variant (original /components/eatery/ui/SubNav.tsx)
  if (variant === 'eatery') {
    const navItems = [
      {
        id: 'live-map',
        label: 'Live Map',
        icon: MapPin,
        onClick: () => router.push('/live-map'),
      },
      {
        id: 'add-eatery',
        label: 'Add Eatery',
        icon: Plus,
        onClick: () => router.push('/add-eatery'),
      },
      {
        id: 'advanced-filters',
        label: 'Filters',
        icon: SlidersHorizontal,
        onClick: () => {
          // Replace with modal or filter logic
          if (process.env.NODE_ENV === 'development') {
            }
        },
      },
    ];

    return (
      <div className={`w-full ${className}`}>
        <div className="flex flex-wrap justify-between gap-2 sm:gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm transition-all duration-200 text-sm font-medium text-gray-700"
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Complex variant (original /components/ActionButtons.tsx - simplified for now)
  // This would need the full complex implementation with all the filtering logic
  return (
    <div className="bg-white border-b border-gray-200 px-2 py-2 sm:px-4 sm:py-3">
      <div className="w-full">
        <div className="flex items-center justify-between space-x-1.5 sm:space-x-3">
          <button
            onClick={onShowMap || (() => router.push('/live-map'))}
            className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-transparent text-gray-600 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm transition-all duration-200 flex-1 justify-center text-xs sm:text-sm font-medium group"
          >
            <Map size={12} className="sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
            <span className="truncate">Map</span>
          </button>
          
          <button
            onClick={onAddEatery || (() => router.push('/add-eatery'))}
            className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-transparent text-gray-600 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm transition-all duration-200 flex-1 justify-center text-xs sm:text-sm font-medium group"
          >
            <Plus size={12} className="sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
            <span className="truncate">Add</span>
          </button>
          
          <button
            onClick={onShowFilters || (() => {
              if (process.env.NODE_ENV === 'development') {
                }
            })}
            className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-transparent text-gray-600 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 hover:shadow-sm transition-all duration-200 flex-1 justify-center text-xs sm:text-sm font-medium group"
          >
            <Filter size={12} className="sm:w-4 sm:h-4 group-hover:scale-110 transition-transform duration-200" />
            <span className="truncate">Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubNav; 