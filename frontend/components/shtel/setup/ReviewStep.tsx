'use client';

import React from 'react';
import { CheckCircle, Star, MapPin, Award } from 'lucide-react';

interface StoreSetupData {
  storeType: string;
  plan: 'free' | 'basic' | 'premium';
  storeName: string;
  description: string;
  category: string;
  subcategory: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryEnabled: boolean;
  deliveryRadius: number;
  deliveryFee: number;
  businessHours: string;
  products: Array<{
    name: string;
    description: string;
    price: number;
    category: string;
    condition: 'new' | 'like_new' | 'good' | 'fair';
    images: string[];
  }>;
  logo: string;
  banner: string;
  colorScheme: string;
  kosherCert: string;
  kosherAgency: string;
  shabbosOrders: boolean;
  [key: string]: any;
}

interface ReviewStepProps {
  storeData: StoreSetupData;
  updateStoreData: (updates: Partial<StoreSetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  currentStep: number;
  totalSteps: number;
}

const PLAN_NAMES = {
  free: 'Community',
  basic: 'Business',
  premium: 'Enterprise'
};

const STORE_TYPE_NAMES = {
  retail: 'Retail Store',
  food: 'Food & Grocery',
  services: 'Services',
  gemach: 'Gemach (Free Loans)'
};

export default function ReviewStep({
  storeData,
  onPrev,
  isSubmitting,
  onSubmit
}: ReviewStepProps) {
  const completionPercentage = 100; // All steps completed

  const handleLaunch = () => {
    onSubmit();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review & Launch Your Store
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Review all your store details before going live. You&apos;re almost ready to start selling!
        </p>
      </div>

      {/* Completion Status */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Setup Complete!</h3>
        </div>
        <div className="w-full bg-green-200 rounded-full h-2 mb-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-green-700">
          All required information has been completed. Your store is ready to launch!
        </p>
      </div>

      {/* Store Summary */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Store Summary</h3>

        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
            Basic Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Store Name</span>
              <p className="text-gray-900">{storeData.storeName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Store Type</span>
              <p className="text-gray-900">{STORE_TYPE_NAMES[storeData.storeType as keyof typeof STORE_TYPE_NAMES]}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Plan</span>
              <p className="text-gray-900">{PLAN_NAMES[storeData.plan]}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Category</span>
              <p className="text-gray-900">{storeData.category} • {storeData.subcategory}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-gray-500">Description</span>
              <p className="text-gray-900">{storeData.description}</p>
            </div>
          </div>
        </div>

        {/* Location & Hours */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            Location & Hours
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Address</span>
              <p className="text-gray-900">
                {storeData.address}<br />
                {storeData.city}, {storeData.state} {storeData.zipCode}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Business Hours</span>
              <p className="text-gray-900">{storeData.businessHours}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Delivery</span>
              <p className="text-gray-900">
                {storeData.deliveryEnabled ? (
                  <>
                    Enabled<br />
                    Radius: {storeData.deliveryRadius} miles<br />
                    Fee: ${storeData.deliveryFee}
                  </>
                ) : (
                  'Not enabled'
                )}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Shabbos Orders</span>
              <p className="text-gray-900">
                {storeData.shabbosOrders ? 'Accepted' : 'Not accepted'}
              </p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
            Products ({storeData.products.length})
          </h4>
          <div className="space-y-3">
            {storeData.products.map((product, index) => (
              <div key={`${product.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.category} • {product.condition.replace('_', ' ')}</p>
                </div>
                <span className="font-semibold text-green-600">${product.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Kosher Certification */}
        {(storeData.kosherCert || storeData.kosherAgency) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-blue-600" />
              Kosher Certification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeData.kosherCert && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Kosher Level</span>
                  <p className="text-gray-900">{storeData.kosherCert}</p>
                </div>
              )}
              {storeData.kosherAgency && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Certifying Agency</span>
                  <p className="text-gray-900">{storeData.kosherAgency}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* What Happens Next */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4">What Happens Next?</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-medium text-blue-900">Store Review</p>
              <p className="text-sm text-blue-700">Our team will review your store within 24-48 hours</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-medium text-blue-900">Go Live</p>
              <p className="text-sm text-blue-700">Once approved, your store will be visible to customers</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-medium text-blue-900">Start Selling</p>
              <p className="text-sm text-blue-700">Begin receiving orders and growing your business</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Summary */}
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2" />
          Achievements Unlocked
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏪</span>
            <div>
              <p className="font-medium text-yellow-900">Store Creator</p>
              <p className="text-sm text-yellow-700">+500 points</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-medium text-yellow-900">Product Master</p>
              <p className="text-sm text-yellow-700">+200 points</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-medium text-yellow-900">Professional</p>
              <p className="text-sm text-yellow-700">+300 points</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-medium text-yellow-900">Setup Complete</p>
              <p className="text-sm text-yellow-700">+1000 points</p>
            </div>
          </div>
        </div>
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
          onClick={handleLaunch}
          disabled={isSubmitting}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-lg font-medium"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Launching...</span>
            </>
          ) : (
            <>
              <span>🚀 Launch Store</span>
              <span className="text-sm">+100 points</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
