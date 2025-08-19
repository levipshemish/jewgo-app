import React from 'react';

import { cn } from '@/lib/utils/classNames';

interface DietaryFiltersProps {
  selectedDietary: string | undefined;
  onDietaryChange: (dietary: string) => void;
  dietaryCounts?: Record<string, number>;
  totalCount?: number;
}

const DIETARY_OPTIONS = [
  { id: 'meat', name: 'Meat', icon: '🥩', color: 'bg-red-500', description: 'Meat restaurants' },
  { id: 'dairy', name: 'Dairy', icon: '🥛', color: 'bg-blue-500', description: 'Dairy restaurants' },
  { id: 'pareve', name: 'Pareve', icon: '🥬', color: 'bg-green-500', description: 'Pareve restaurants' }
];

export const DietaryFilters: React.FC<DietaryFiltersProps> = ({
  selectedDietary, onDietaryChange, dietaryCounts, totalCount
}) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Dietary Preferences
        </div>
        {totalCount && (
          <span className="text-xs text-gray-500">
            {totalCount} total
          </span>
        )}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {DIETARY_OPTIONS.map((option) => {
          const count = dietaryCounts?.[option.id] || 0;
          return (
            <button
              key={option.id}
              onClick={() => onDietaryChange(selectedDietary === option.id ? '' : option.id)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200 text-center",
                "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                selectedDietary === option.id
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
                  selectedDietary === option.id
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