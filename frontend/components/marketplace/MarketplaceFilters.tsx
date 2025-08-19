'use client';

import { X, Filter, ChevronDown, ChevronUp, Star, DollarSign, Truck } from 'lucide-react';
import React, { useState } from 'react';

import { MarketplaceFilters as MarketplaceFiltersType, MarketplaceCategory } from '@/lib/types/marketplace';

interface MarketplaceFiltersProps {
  filters: MarketplaceFiltersType;
  categories: MarketplaceCategory[];
  onFiltersChange: (filters: MarketplaceFiltersType) => void;
  onClearFilters: () => void;
  className?: string;
}

export default function MarketplaceFiltersComponent({
  filters,
  categories,
  onFiltersChange,
  onClearFilters,
  className = ''
}: MarketplaceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleFilterChange = (key: keyof MarketplaceFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    handleFilterChange('categories', newCategories);
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    const currentRange = filters.priceRange || { min: undefined, max: undefined };
    
    handleFilterChange('priceRange', {
      ...currentRange,
      [type]: numValue
    });
  };

  const handleRatingChange = (rating: number) => {
    handleFilterChange('rating', filters.rating === rating ? undefined : rating);
  };

  const handleAvailabilityChange = (availability: 'in_stock' | 'out_of_stock' | 'all') => {
    handleFilterChange('availability', availability);
  };

  const handleSortByChange = (sortBy: string) => {
    handleFilterChange('sortBy', sortBy);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories && filters.categories.length > 0) { count++; }
    if (filters.priceRange && (filters.priceRange.min || filters.priceRange.max)) { count++; }
    if (filters.rating) { count++; }
    if (filters.availability && filters.availability !== 'all') { count++; }
    if (filters.sortBy) { count++; }
    if (filters.search) { count++; }
    return count;
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {getActiveFilterCount() > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getActiveFilterCount() > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Categories */}
          <div>
            <button
              onClick={() => toggleSection('categories')}
              className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
            >
              Categories
              {activeSection === 'categories' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {activeSection === 'categories' && (
              <div className="space-y-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.categories?.includes(category.id) || false}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                    <span className="text-xs text-gray-500">({category.productCount})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Price Range */}
          <div>
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Price Range
              </div>
              {activeSection === 'price' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {activeSection === 'price' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange?.min || ''}
                    onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange?.max || ''}
                    onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rating */}
          <div>
            <button
              onClick={() => toggleSection('rating')}
              className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Minimum Rating
              </div>
              {activeSection === 'rating' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {activeSection === 'rating' && (
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingChange(rating)}
                    className={`flex items-center gap-2 w-full text-left p-2 rounded-md transition-colors ${
                      filters.rating === rating
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-700">& up</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Availability */}
          <div>
            <button
              onClick={() => toggleSection('availability')}
              className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Availability
              </div>
              {activeSection === 'availability' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {activeSection === 'availability' && (
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Products' },
                  { value: 'in_stock', label: 'In Stock' },
                  { value: 'out_of_stock', label: 'Out of Stock' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      value={option.value}
                      checked={filters.availability === option.value}
                      onChange={() => handleAvailabilityChange(option.value as any)}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Sort By */}
          <div>
            <button
              onClick={() => toggleSection('sort')}
              className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-3"
            >
              Sort By
              {activeSection === 'sort' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {activeSection === 'sort' && (
              <div className="space-y-2">
                {[
                  { value: 'popular', label: 'Most Popular' },
                  { value: 'newest', label: 'Newest First' },
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'price_low', label: 'Price: Low to High' },
                  { value: 'price_high', label: 'Price: High to Low' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sortBy"
                      value={option.value}
                      checked={filters.sortBy === option.value}
                      onChange={() => handleSortByChange(option.value)}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
