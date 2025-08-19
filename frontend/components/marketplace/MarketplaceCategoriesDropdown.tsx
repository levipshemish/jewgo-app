'use client';

import { ChevronDown, X } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { fetchMarketplaceCategories } from '@/lib/api/marketplace';
import { MarketplaceCategory } from '@/lib/types/marketplace';

interface MarketplaceCategoriesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelect: (category: MarketplaceCategory) => void;
  selectedCategory?: MarketplaceCategory;
}

export default function MarketplaceCategoriesDropdown({
  isOpen,
  onClose,
  onCategorySelect,
  selectedCategory,
}: MarketplaceCategoriesDropdownProps) {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load categories when component mounts
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen, categories.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchMarketplaceCategories();
      
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setError(response.error || 'Failed to load categories');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: MarketplaceCategory) => {
    onCategorySelect(category);
    onClose();
  };

  const handleClearSelection = () => {
    onCategorySelect({} as MarketplaceCategory);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Dropdown */}
      <div 
        ref={dropdownRef}
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-96 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading categories...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-500">{error}</p>
              <button
                onClick={loadCategories}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500">No categories available</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Clear selection option */}
              <button
                onClick={handleClearSelection}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !selectedCategory?.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                All Categories
              </button>
              
              {/* Category list */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory?.id === category.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    {category.productCount !== undefined && (
                      <span className="text-sm text-gray-500">
                        {category.productCount}
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {category.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
