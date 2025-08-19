'use client';

import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@/lib/utils/cn';

export interface BusinessType {
  value: string;
  label: string;
  count: number;
  icon?: string;
}

interface BusinessTypeFilterProps {
  selectedTypes: string[];
  onTypeChange: (types: string[]) => void;
  availableTypes: BusinessType[];
  className?: string;
  disabled?: boolean;
}

export default function BusinessTypeFilter({
  selectedTypes, onTypeChange, availableTypes, className = '', disabled = false
}: BusinessTypeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter business types based on search query
  const filteredTypes = availableTypes.filter(type =>
    type.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTypeToggle = (typeValue: string) => {
    if (disabled) {
      return;
    }
    
    const newSelectedTypes = selectedTypes.includes(typeValue)
      ? selectedTypes.filter(t => t !== typeValue)
      : [...selectedTypes, typeValue];
    
    onTypeChange(newSelectedTypes);
  };

  const handleSelectAll = () => {
    if (disabled) {
      return;
    }
    onTypeChange(filteredTypes.map(t => t.value));
  };

  const handleClearAll = () => {
    if (disabled) {
      return;
    }
    onTypeChange([]);
  };

  const selectedCount = selectedTypes.length;
  const totalCount = availableTypes.length;

  return (
    <div className={cn('relative', className)}>
      {/* Filter Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left border rounded-lg transition-colors',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
        )}
      >
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">Business Type</span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedCount}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search business types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Select All / Clear All */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={handleSelectAll}
              disabled={disabled}
              className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              disabled={disabled}
              className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>

          {/* Business Type List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredTypes.length > 0 ? (
              filteredTypes.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    'flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
                    selectedTypes.includes(type.value) && 'bg-blue-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.value)}
                    onChange={() => handleTypeToggle(type.value)}
                    disabled={disabled}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {type.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {type.count}
                      </span>
                    </div>
                  </div>
                  {selectedTypes.includes(type.value) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </label>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No business types found
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            {selectedCount} of {totalCount} business types selected
          </div>
        </div>
      )}
    </div>
  );
}
