'use client';

import { Package, Car, Home, ShoppingBag, Utensils, Cake, ChefHat } from 'lucide-react';
import React from 'react';

interface MarketplaceCategoryTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

const MarketplaceCategoryTabs: React.FC<MarketplaceCategoryTabsProps> = ({ 
  activeTab, onTabChange, className = ''
}) => {
  // Use the same categories as the eatery page
  const categories = [
    {
      id: 'all',
      label: 'All',
      icon: ShoppingBag
    },
    {
      id: 'restaurant',
      label: 'Restaurants',
      icon: Utensils
    },
    {
      id: 'bakery',
      label: 'Bakeries',
      icon: Cake
    },
    {
      id: 'catering',
      label: 'Catering',
      icon: ChefHat
    }
  ];

  const handleTabClick = (category: typeof categories[0]) => {
    if (onTabChange) {
      onTabChange(category.id);
    }
  };

  return (
    <div className={`bg-white px-3 sm:px-4 lg:px-6 py-2 lg:py-3 ${className}`}>
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between space-x-1 lg:space-x-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeTab === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => handleTabClick(category)}
                role="tab"
                aria-selected={isActive}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 h-14 lg:h-16 rounded-xl transition-all duration-200 whitespace-nowrap category-tab-button ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <Icon 
                  size={18} 
                  className={`${isActive ? 'text-white' : 'text-gray-600'} mb-1 lg:w-5 lg:h-5`} 
                />
                <span className={`text-xs lg:text-sm font-bold truncate px-1 ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceCategoryTabs;
