'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShtelFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onFiltersChange: (filters: ShtelFilters) => void;
  currentFilters: ShtelFilters;
}

export interface ShtelFilters {
  transaction_type?: 'sale' | 'gemach' | 'trade' | 'donation' | '';
  category?: string;
  subcategory?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
  is_gemach?: boolean;
  kosher_verified?: boolean;
  kosher_agency?: string;
  holiday_category?: string;
  city?: string;
  state?: string;
  community_verified?: boolean;
  rabbi_endorsed?: boolean;
}

const JEWISH_CATEGORIES = [
  { value: 'judaica', label: 'Judaica', subcategories: ['Mezuzot', 'Kiddush Cups', 'Tallitot', 'Tefillin', 'Ritual Items'] },
  { value: 'holiday_items', label: 'Holiday Items', subcategories: ['Passover', 'Sukkot', 'Purim', 'Chanukah', 'Rosh Hashana'] },
  { value: 'religious_books', label: 'Religious Books', subcategories: ['Siddur', 'Chumash', 'Gemara', 'Halacha', 'Mussar'] },
  { value: 'kosher_food', label: 'Kosher Food', subcategories: ['Meat', 'Dairy', 'Bakery', 'Wine', 'Groceries'] },
  { value: 'baby_items', label: 'Baby Items', subcategories: ['Strollers', 'Car Seats', 'High Chairs', 'Toys', 'Clothes'] },
  { value: 'appliances', label: 'Appliances', subcategories: ['Kitchen', 'Laundry', 'Cleaning', 'Small Appliances'] },
  { value: 'furniture', label: 'Furniture', subcategories: ['Living Room', 'Bedroom', 'Dining Room', 'Office'] },
  { value: 'electronics', label: 'Electronics', subcategories: ['Computers', 'Phones', 'Audio', 'TV'] },
  { value: 'clothing', label: 'Clothing', subcategories: ['Men', 'Women', 'Children', 'Formal Wear'] },
  { value: 'other', label: 'Other', subcategories: ['Tools', 'Sports', 'Books', 'Miscellaneous'] }
];

const KOSHER_AGENCIES = [
  'OU (Orthodox Union)',
  'OK (Organized Kashrus)',
  'Star-K',
  'CRC (Chicago Rabbinical Council)',
  'Rabbi Landau',
  'Chof-K',
  'Local Rabbinate'
];

const HOLIDAY_CATEGORIES = [
  'Passover',
  'Sukkot',
  'Purim',
  'Chanukah',
  'Rosh Hashana',
  'Yom Kippur',
  'Shavuot',
  'Tu BiShvat',
  'Lag BaOmer'
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used_like_new', label: 'Like New' },
  { value: 'used_good', label: 'Good' },
  { value: 'used_fair', label: 'Fair' }
];

const FLORIDA_CITIES = [
  'Miami Beach',
  'Aventura',
  'Hollywood',
  'Hallandale',
  'Sunny Isles',
  'Bal Harbour',
  'North Miami Beach',
  'Plantation',
  'Davie',
  'Boca Raton',
  'Delray Beach',
  'West Palm Beach',
  'Orlando',
  'Tampa',
  'Jacksonville'
];

export default function _ShtelFilters({ isOpen, onClose, onFiltersChange, currentFilters }: ShtelFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ShtelFilters>(currentFilters);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  useEffect(() => {
    setLocalFilters(currentFilters);
    if (currentFilters.category) {
      const category = JEWISH_CATEGORIES.find(cat => cat.label === currentFilters.category);
      if (category) {
        setSelectedCategory(category.value);
        setAvailableSubcategories(category.subcategories);
      }
    }
  }, [currentFilters]);

  useEffect(() => {
    const category = JEWISH_CATEGORIES.find(cat => cat.value === selectedCategory);
    if (category) {
      setAvailableSubcategories(category.subcategories);
      setLocalFilters(prev => ({ ...prev, category: category.label, subcategory: '' }));
    }
  }, [selectedCategory]);

  const handleFilterChange = (key: keyof ShtelFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: ShtelFilters = {};
    setLocalFilters(clearedFilters);
    setSelectedCategory('');
    setAvailableSubcategories([]);
    onFiltersChange(clearedFilters);
  };

  const activeFilterCount = Object.values(localFilters).filter(value => 
    value !== undefined && value !== '' && value !== null && value !== false
  ).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Filter Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold text-gray-900">
                  Community Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filter Content */}
              <div className="flex-1 p-4 space-y-6">
                {/* Transaction Type */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Transaction Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '', label: 'All', icon: '🏪' },
                      { value: 'sale', label: 'For Sale', icon: '💰' },
                      { value: 'gemach', label: 'Gemach (Free)', icon: '🤝' },
                      { value: 'trade', label: 'Trade/Swap', icon: '🔄' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleFilterChange('transaction_type', type.value as any)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          localFilters.transaction_type === type.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg mb-1">{type.icon}</div>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Community Trust Indicators */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Community Trust</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localFilters.is_gemach || false}
                        onChange={(e) => handleFilterChange('is_gemach', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">🤝 Gemach Items Only</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localFilters.kosher_verified || false}
                        onChange={(e) => handleFilterChange('kosher_verified', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">✅ Kosher Verified</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localFilters.community_verified || false}
                        onChange={(e) => handleFilterChange('community_verified', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">🏘️ Community Verified</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={localFilters.rabbi_endorsed || false}
                        onChange={(e) => handleFilterChange('rabbi_endorsed', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">📜 Rabbi Endorsed</span>
                    </label>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {JEWISH_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                {availableSubcategories.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Subcategory</h3>
                    <select
                      value={localFilters.subcategory || ''}
                      onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Subcategories</option>
                      {availableSubcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Condition */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Condition</h3>
                  <select
                    value={localFilters.condition || ''}
                    onChange={(e) => handleFilterChange('condition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Any Condition</option>
                    {CONDITIONS.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range (only if not showing Gemach only) */}
                {!localFilters.is_gemach && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Price</label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={localFilters.min_price || ''}
                          onChange={(e) => handleFilterChange('min_price', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="$0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max Price</label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={localFilters.max_price || ''}
                          onChange={(e) => handleFilterChange('max_price', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="$1000"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Kosher Agency */}
                {localFilters.kosher_verified && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Kosher Agency</h3>
                    <select
                      value={localFilters.kosher_agency || ''}
                      onChange={(e) => handleFilterChange('kosher_agency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Any Agency</option>
                      {KOSHER_AGENCIES.map((agency) => (
                        <option key={agency} value={agency}>
                          {agency}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Holiday Category */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Holiday/Season</h3>
                  <select
                    value={localFilters.holiday_category || ''}
                    onChange={(e) => handleFilterChange('holiday_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Any Holiday</option>
                    {HOLIDAY_CATEGORIES.map((holiday) => (
                      <option key={holiday} value={holiday}>
                        {holiday}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Location</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">City</label>
                      <select
                        value={localFilters.city || ''}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Any City</option>
                        {FLORIDA_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">State</label>
                      <select
                        value={localFilters.state || ''}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Any State</option>
                        <option value="FL">Florida</option>
                        <option value="NY">New York</option>
                        <option value="NJ">New Jersey</option>
                        <option value="CA">California</option>
                        <option value="IL">Illinois</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                <div className="flex space-x-3">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1">({activeFilterCount})</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}