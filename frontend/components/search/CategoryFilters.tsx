import React from 'react';

import { cn } from '@/lib/utils/classNames';

interface CategoryFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
}

const CATEGORY_OPTIONS = [
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️', color: 'bg-blue-500', description: 'Full-service restaurants' },
  { id: 'bakery', name: 'Bakeries', icon: '🥖', color: 'bg-yellow-500', description: 'Bread and pastries' },
  { id: 'catering', name: 'Catering', icon: '🎉', color: 'bg-purple-500', description: 'Event catering services' },
  { id: 'grocery', name: 'Grocery', icon: '🛒', color: 'bg-green-500', description: 'Kosher grocery stores' },
  { id: 'deli', name: 'Deli', icon: '🥪', color: 'bg-amber-500', description: 'Deli and sandwiches' },
  { id: 'pizza', name: 'Pizza', icon: '🍕', color: 'bg-red-500', description: 'Pizza restaurants' },
  { id: 'ice-cream', name: 'Ice Cream', icon: '🍦', color: 'bg-blue-300', description: 'Ice cream shops' },
  { id: 'coffee', name: 'Coffee', icon: '☕', color: 'bg-brown-500', description: 'Coffee shops' }
];

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  selectedCategory, onCategoryChange, categoryCounts, totalCount
}) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Business Categories
        </div>
        {totalCount && (
          <span className="text-xs text-gray-500">
            {totalCount} total
          </span>
        )}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORY_OPTIONS.map((option) => {
          const count = categoryCounts?.[option.id] || 0;
          return (
            <button
              key={option.id}
              onClick={() => onCategoryChange(selectedCategory === option.id ? '' : option.id)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200 text-center relative",
                "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                selectedCategory === option.id
                  ? `${option.color} text-white border-transparent`
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              )}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-semibold text-sm mb-1">{option.name}</div>
              <p className="text-xs opacity-80 mb-2">{option.description}</p>
              {count > 0 && (
                <div className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  selectedCategory === option.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {count} {count === 1 ? 'place' : 'places'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
