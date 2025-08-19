'use client';

import { ChevronDown, Search, X, Check } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { MarketplaceAPI } from '@/lib/api/marketplace';
import { MarketplaceCategory } from '@/lib/types/marketplace';

interface CategoryFilterProps {
  selectedCategory?: string;
  selectedSubcategory?: string;
  onCategoryChange: (category: string, subcategory?: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function CategoryFilter({
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onClose,
  isOpen
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load categories on mount
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen, categories.length]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await MarketplaceAPI.fetchCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: MarketplaceCategory, subcategory?: string) => {
    onCategoryChange(category.slug, subcategory);
    onClose();
  };

  const handleClearSelection = () => {
    onCategoryChange('');
    onClose();
  };

  const filteredCategories = categories.filter(category => {
    if (!searchQuery) return true;
    const matchesCategory = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubcategory = category.subcategories?.some(sub => 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCategory || matchesSubcategory;
  });

  const selectedCategoryData = categories.find(cat => cat.slug === selectedCategory);
  const selectedSubcategoryData = selectedCategoryData?.subcategories?.find(
    sub => sub.slug === selectedSubcategory
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Category</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Current Selection */}
          {(selectedCategory || selectedSubcategory) && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current selection:</p>
                  <p className="font-medium text-purple-900">
                    {selectedCategoryData?.name}
                    {selectedSubcategoryData && ` > ${selectedSubcategoryData.name}`}
                  </p>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading categories...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadCategories}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No categories found</p>
            </div>
          ) : (
            <div className="p-4">
              {filteredCategories.map((category) => (
                <div key={category.id} className="mb-4">
                  {/* Main Category */}
                  <button
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedCategory === category.slug
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{
                      minHeight: '44px',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {category.icon && (
                          <span className="text-2xl">{category.icon}</span>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                          {category.productCount !== undefined && (
                            <p className="text-xs text-gray-500">{category.productCount} items</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {selectedCategory === category.slug && (
                          <Check className="w-5 h-5 text-purple-600" />
                        )}
                        {category.subcategories && category.subcategories.length > 0 && (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Subcategories */}
                  {selectedCategory === category.slug && category.subcategories && category.subcategories.length > 0 && (
                    <div className="ml-6 mt-2 space-y-2">
                      {category.subcategories.map((subcategory) => (
                        <button
                          key={subcategory.id}
                          onClick={() => handleCategorySelect(category, subcategory.slug)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedSubcategory === subcategory.slug
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          style={{
                            minHeight: '44px',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{subcategory.name}</span>
                            {selectedSubcategory === subcategory.slug && (
                              <Check className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleClearSelection}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
