'use client';

import React from 'react';
import { cn } from '@/lib/utils/classNames';

// Common filter option interface
export interface FilterOption {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  count?: number;
}

// Common filter props interface
export interface FilterBaseProps {
  title: string;
  icon?: React.ReactNode;
  options: FilterOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  variant?: 'grid' | 'list' | 'tabs';
  showCounts?: boolean;
  totalCount?: number;
  className?: string;
}

// Shared filter option component
export const FilterOptionButton: React.FC<{
  option: FilterOption;
  isSelected: boolean;
  onClick: () => void;
  variant?: 'grid' | 'list' | 'tabs';
  showCount?: boolean;
}> = ({ option, isSelected, onClick, variant = 'grid', showCount = false }) => {
  const baseClasses = cn(
    "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
    "hover:scale-105 active:scale-95"
  );

  const gridClasses = cn(
    baseClasses,
    "p-3 rounded-lg border-2 text-center relative",
    isSelected
      ? `${option.color || 'bg-blue-500'} text-white border-transparent`
      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
  );

  const listClasses = cn(
    baseClasses,
    "w-full p-2 rounded-md border text-left",
    isSelected
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
  );

  const tabsClasses = cn(
    baseClasses,
    "px-4 py-2 rounded-md border",
    isSelected
      ? "bg-blue-500 text-white border-blue-500"
      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
  );

  const classes = variant === 'grid' ? gridClasses : 
                  variant === 'list' ? listClasses : 
                  tabsClasses;

  return (
    <button
      onClick={onClick}
      className={classes}
    >
      {variant === 'grid' && (
        <>
          {option.icon && <div className="text-2xl mb-2">{option.icon}</div>}
          <div className="font-semibold text-sm mb-1">{option.name}</div>
          {option.description && (
            <p className="text-xs opacity-80 mb-2">{option.description}</p>
          )}
          {showCount && option.count !== undefined && (
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              isSelected
                ? "bg-white/20 text-white"
                : "bg-gray-200 text-gray-600"
            )}>
              {option.count} {option.count === 1 ? 'item' : 'items'}
            </div>
          )}
        </>
      )}
      
      {variant === 'list' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {option.icon && <span className="mr-2">{option.icon}</span>}
            <span className="font-medium">{option.name}</span>
          </div>
          {showCount && option.count !== undefined && (
            <span className="text-sm text-gray-500">{option.count}</span>
          )}
        </div>
      )}
      
      {variant === 'tabs' && (
        <span className="font-medium">{option.name}</span>
      )}
    </button>
  );
};

// Main filter base component
export const FilterBase: React.FC<FilterBaseProps> = ({
  title,
  icon,
  options,
  selectedValue,
  onValueChange,
  variant = 'grid',
  showCounts = false,
  totalCount,
  className = ''
}) => {
  const handleOptionClick = (optionId: string) => {
    onValueChange(selectedValue === optionId ? '' : optionId);
  };

  const containerClasses = cn(
    variant === 'grid' && (className.includes('grid-cols-') ? `grid ${className} gap-3` : "grid grid-cols-2 gap-3"),
    variant === 'list' && "space-y-2",
    variant === 'tabs' && "flex flex-wrap gap-2",
    variant !== 'grid' && className
  );

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </div>
        {totalCount && (
          <span className="text-xs text-gray-500">
            {totalCount} total
          </span>
        )}
      </h4>
      
      <div className={containerClasses}>
        {options.map((option) => (
          <FilterOptionButton
            key={option.id}
            option={option}
            isSelected={selectedValue === option.id}
            onClick={() => handleOptionClick(option.id)}
            variant={variant}
            showCount={showCounts}
          />
        ))}
      </div>
    </div>
  );
};

export default FilterBase;
