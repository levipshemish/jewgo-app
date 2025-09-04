'use client';

import React from 'react';
import { Star, Award, CheckCircle } from 'lucide-react';

interface StoreSetupData {
  storeType: string;
  plan: 'free' | 'basic' | 'premium';
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

const STORE_TYPES = [
  {
    id: 'retail',
    name: 'Retail Store',
    description: 'Sell physical products to the community',
    icon: '🛍️',
    examples: 'Judaica, clothing, books, gifts'
  },
  {
    id: 'food',
    name: 'Food & Grocery',
    description: 'Sell kosher food and grocery items',
    icon: '🥘',
    examples: 'Bakery, market, kosher wine, specialty foods'
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Offer professional or community services',
    icon: '🔧',
    examples: 'Cleaning, tutoring, events, home repair'
  },
  {
    id: 'gemach',
    name: 'Gemach (Free Loans)',
    description: 'Share community resources for free',
    icon: '🤝',
    examples: 'Baby gear, books, tools, medical equipment'
  }
];

const PLANS = [
  {
    id: 'free',
    name: 'Community',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '1 store',
      '5 products per store',
      '3 images per product',
      '50 monthly messages',
      '7 days analytics retention',
      'Basic store listing',
      'Contact form',
      'Basic analytics',
      'Community support'
    ],
    limitations: [
      'Limited to 5 products',
      'Basic features only',
      'No custom URL'
    ]
  },
  {
    id: 'basic',
    name: 'Business',
    price: '$29.99',
    period: 'month',
    description: 'Great for growing businesses',
    features: [
      '3 stores',
      '25 products per store',
      '10 images per product',
      '500 monthly messages',
      '30 days analytics retention',
      'Advanced analytics',
      'Promotional tools',
      'Custom store URL',
      'Priority support',
      'Sale badges',
      'Email notifications'
    ],
    popular: true
  },
  {
    id: 'premium',
    name: 'Enterprise',
    price: '$99.99',
    period: 'month',
    description: 'For established businesses',
    features: [
      'Unlimited stores',
      'Unlimited products',
      'Unlimited images',
      'Unlimited messages',
      '365 days analytics retention',
      'Featured placement',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'Advanced SEO tools',
      'Bulk import/export'
    ]
  }
];

export default function WelcomeStep({
  storeData,
  updateStoreData,
  onNext,
  onPrev,
  currentStep
}: WelcomeStepProps) {
  const handleStoreTypeSelect = (storeType: string) => {
    updateStoreData({ storeType });
  };

  const handlePlanSelect = (plan: 'free' | 'basic' | 'premium') => {
    updateStoreData({ plan });
  };

  const canProceed = storeData.storeType && storeData.plan;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">🏛️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Shtel Marketplace
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Create your Jewish community store and start connecting with customers. 
          Choose your store type and plan to get started.
        </p>
      </div>

      {/* Store Type Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What type of store are you creating?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STORE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleStoreTypeSelect(type.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                storeData.storeType === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{type.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{type.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Examples: {type.examples}</p>
                </div>
                {storeData.storeType === type.id && (
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Choose your plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 border-2 rounded-lg transition-all duration-200 ${
                storeData.plan === plan.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <button
                onClick={() => handlePlanSelect(plan.id as 'free' | 'basic' | 'premium')}
                className="w-full text-left"
              >
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={`feature-${feature}-${index}`} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.limitations && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Limitations:</h5>
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, index) => (
                        <li key={`limitation-${limitation}-${index}`} className="text-xs text-gray-600">
                          • {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {storeData.plan === plan.id && (
                  <div className="mt-4 flex justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Gamification Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3 mb-3">
          <Award className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Earn Points & Achievements</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Complete each step to earn points and unlock achievements. Build your reputation in the Jewish community!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Store Creator: 500 points</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Product Master: 200 points</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Professional: 300 points</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrev}
          disabled={currentStep === 1}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Next Step</span>
          <span className="text-sm">+100 points</span>
        </button>
      </div>
    </div>
  );
}
