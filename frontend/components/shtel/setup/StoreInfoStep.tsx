'use client';

import React, { useState } from 'react';
import { Store, Edit3, CheckCircle } from 'lucide-react';

interface StoreSetupData {
  storeName: string;
  description: string;
  category: string;
  subcategory: string;
  [key: string]: any;
}

interface WelcomeStepProps {
  storeData: StoreSetupData;
  updateStoreData: (updates: Partial<StoreSetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  currentStep: number;
  totalSteps: number;
}

const CATEGORIES = {
  'FOOD & GROCERY': [
    'Bakery',
    'Market',
    'Kosher Wine',
    'Catering',
    'Specialty Foods'
  ],
  'SERVICES': [
    'Cleaning',
    'Tutoring',
    'Events',
    'Home Repair',
    'Childcare'
  ],
  'RETAIL': [
    'Judaica',
    'Clothing',
    'Books',
    'Gifts',
    'Home Goods'
  ],
  'PROFESSIONAL': [
    'Real Estate',
    'Insurance',
    'Legal',
    'Accounting',
    'Medical'
  ],
  'COMMUNITY': [
    'Gemachs',
    'Schools',
    'Shuls',
    'Organizations',
    'Chesed'
  ]
};

export default function StoreInfoStep({
  storeData,
  updateStoreData,
  onNext,
  onPrev,
  isSubmitting,
  onSubmit,
  currentStep,
  totalSteps
}: WelcomeStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!storeData.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    } else if (storeData.storeName.length < 3) {
      newErrors.storeName = 'Store name must be at least 3 characters';
    }

    if (!storeData.description.trim()) {
      newErrors.description = 'Store description is required';
    } else if (storeData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!storeData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!storeData.subcategory) {
      newErrors.subcategory = 'Please select a subcategory';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    updateStoreData({ [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryChange = (category: string) => {
    updateStoreData({ 
      category,
      subcategory: '' // Reset subcategory when category changes
    });
    setErrors(prev => ({ ...prev, category: '', subcategory: '' }));
  };

  const handleSubcategoryChange = (subcategory: string) => {
    updateStoreData({ subcategory });
    setErrors(prev => ({ ...prev, subcategory: '' }));
  };

  const canProceed = storeData.storeName && storeData.description && storeData.category && storeData.subcategory;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your store
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Help customers find your store by providing clear, descriptive information about what you offer.
        </p>
      </div>

      {/* Store Name */}
      <div>
        <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
          Store Name *
        </label>
        <div className="relative">
          <input
            type="text"
            id="storeName"
            value={storeData.storeName}
            onChange={(e) => handleInputChange('storeName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.storeName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Cohen's Kosher Market"
            maxLength={100}
          />
          <div className="absolute right-3 top-3">
            <Store className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {errors.storeName && (
          <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Choose a name that's easy to remember and reflects your business
        </p>
      </div>

      {/* Store Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Store Description *
        </label>
        <div className="relative">
          <textarea
            id="description"
            value={storeData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe what makes your store special. What products or services do you offer? What's your unique value proposition?"
            maxLength={500}
          />
          <div className="absolute right-3 top-3">
            <Edit3 className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-500">
            Be specific about your offerings and what makes you unique
          </p>
          <p className="text-xs text-gray-500">
            {storeData.description.length}/500
          </p>
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(CATEGORIES).map(([category, subcategories]) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                storeData.category === category
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{category}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {subcategories.length} subcategories
                  </p>
                </div>
                {storeData.category === category && (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </button>
          ))}
        </div>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Subcategory Selection */}
      {storeData.category && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CATEGORIES[storeData.category as keyof typeof CATEGORIES]?.map((subcategory) => (
              <button
                key={subcategory}
                onClick={() => handleSubcategoryChange(subcategory)}
                className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${
                  storeData.subcategory === subcategory
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="font-medium text-gray-900">{subcategory}</span>
                  {storeData.subcategory === subcategory && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {errors.subcategory && (
            <p className="mt-1 text-sm text-red-600">{errors.subcategory}</p>
          )}
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for a great store profile</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use a clear, memorable store name</li>
          <li>• Write a detailed description that highlights your unique offerings</li>
          <li>• Choose the most specific category and subcategory</li>
          <li>• Mention any special kosher certifications or community involvement</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Previous
        </button>
        
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Next Step</span>
          <span className="text-sm">+200 points</span>
        </button>
      </div>
    </div>
  );
}
