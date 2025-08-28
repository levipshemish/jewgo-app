'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Truck, CheckCircle } from 'lucide-react';

interface StoreSetupData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  deliveryEnabled: boolean;
  deliveryRadius: number;
  deliveryFee: number;
  businessHours: string;
  [key: string]: any;
}

interface LocationStepProps {
  storeData: StoreSetupData;
  updateStoreData: (updates: Partial<StoreSetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  currentStep: number;
  totalSteps: number;
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const BUSINESS_HOURS_OPTIONS = [
  'Monday-Friday: 9AM-6PM, Saturday: 10AM-4PM, Sunday: Closed',
  'Monday-Friday: 8AM-8PM, Saturday: 9AM-6PM, Sunday: 12PM-5PM',
  'Monday-Saturday: 10AM-7PM, Sunday: Closed',
  'Monday-Friday: 9AM-5PM, Saturday: 9AM-3PM, Sunday: Closed',
  'Monday-Sunday: 24/7',
  'Custom hours'
];

export default function LocationStep({
  storeData,
  updateStoreData,
  onNext,
  onPrev
}: LocationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!storeData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!storeData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!storeData.state) {
      newErrors.state = 'State is required';
    }

    if (!storeData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(storeData.zipCode)) {
      newErrors.zipCode = 'Please enter a valid ZIP code';
    }

    if (!storeData.businessHours) {
      newErrors.businessHours = 'Business hours are required';
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

  const handleDeliveryToggle = () => {
    updateStoreData({ deliveryEnabled: !storeData.deliveryEnabled });
  };

  const handleGeocodeAddress = async () => {
    if (!storeData.address || !storeData.city || !storeData.state) {
      return;
    }

    setIsGeocoding(true);
    
    try {
      const fullAddress = `${storeData.address}, ${storeData.city}, ${storeData.state} ${storeData.zipCode}`;
      
      // Use a geocoding service (this is a placeholder - you'd use Google Maps API or similar)
      const response = await fetch(`https://api.example.com/geocode?address=${encodeURIComponent(fullAddress)}`);
      
      if (response.ok) {
        const data = await response.json();
        updateStoreData({
          latitude: data.lat,
          longitude: data.lng
        });
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const canProceed = storeData.address && storeData.city && storeData.state && storeData.zipCode && storeData.businessHours;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">📍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Location & Delivery
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Help customers find your store and understand your delivery options and business hours.
        </p>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Store Address
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Street Address */}
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              id="address"
              value={storeData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123 Main Street"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              id="city"
              value={storeData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Miami"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <select
              id="state"
              value={storeData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.state ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select State</option>
              {STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">{errors.state}</p>
            )}
          </div>

          {/* ZIP Code */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              id="zipCode"
              value={storeData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.zipCode ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="33101"
              maxLength={10}
            />
            {errors.zipCode && (
              <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
            )}
          </div>

          {/* Geocode Button */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={isGeocoding || !storeData.address || !storeData.city || !storeData.state}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeocoding ? 'Getting coordinates...' : 'Get coordinates from address'}
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          Delivery Options
        </h3>
        
        <div className="space-y-4">
          {/* Delivery Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Enable Delivery</h4>
              <p className="text-sm text-gray-600">Allow customers to request delivery to their location</p>
            </div>
            <button
              onClick={handleDeliveryToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                storeData.deliveryEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  storeData.deliveryEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Delivery Settings */}
          {storeData.deliveryEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label htmlFor="deliveryRadius" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Radius (miles)
                </label>
                <input
                  type="number"
                  id="deliveryRadius"
                  value={storeData.deliveryRadius}
                  onChange={(e) => updateStoreData({ deliveryRadius: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="50"
                />
              </div>
              
              <div>
                <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Fee ($)
                </label>
                <input
                  type="number"
                  id="deliveryFee"
                  value={storeData.deliveryFee}
                  onChange={(e) => updateStoreData({ deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Business Hours
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operating Hours *
          </label>
          <div className="space-y-2">
            {BUSINESS_HOURS_OPTIONS.map((option, index) => (
              <button
                key={index}
                onClick={() => handleInputChange('businessHours', option)}
                className={`w-full p-3 border-2 rounded-lg text-left transition-all duration-200 ${
                  storeData.businessHours === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{option}</span>
                  {storeData.businessHours === option && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {errors.businessHours && (
            <p className="mt-1 text-sm text-red-600">{errors.businessHours}</p>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Location & Delivery Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Accurate address helps customers find your store easily</li>
          <li>• Consider Shabbat and Jewish holiday hours in your business schedule</li>
          <li>• Delivery radius should cover your target community area</li>
          <li>• Competitive delivery fees can attract more customers</li>
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
          <span className="text-sm">+150 points</span>
        </button>
      </div>
    </div>
  );
}
