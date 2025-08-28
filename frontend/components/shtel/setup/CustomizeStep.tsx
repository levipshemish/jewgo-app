'use client';

import React, { useState } from 'react';
import { Palette, Upload, Star, CheckCircle } from 'lucide-react';

interface StoreSetupData {
  logo: string;
  banner: string;
  colorScheme: string;
  kosherCert: string;
  kosherAgency: string;
  shabbosOrders: boolean;
  [key: string]: any;
}

interface CustomizeStepProps {
  storeData: StoreSetupData;
  updateStoreData: (updates: Partial<StoreSetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  currentStep: number;
  totalSteps: number;
}

const COLOR_SCHEMES = [
  { id: 'blue', name: 'Classic Blue', primary: '#3B82F6', secondary: '#1E40AF' },
  { id: 'green', name: 'Natural Green', primary: '#10B981', secondary: '#059669' },
  { id: 'purple', name: 'Royal Purple', primary: '#8B5CF6', secondary: '#7C3AED' },
  { id: 'orange', name: 'Warm Orange', primary: '#F59E0B', secondary: '#D97706' },
  { id: 'red', name: 'Bold Red', primary: '#EF4444', secondary: '#DC2626' },
  { id: 'teal', name: 'Ocean Teal', primary: '#14B8A6', secondary: '#0D9488' }
];

const KOSHER_AGENCIES = [
  'OU (Orthodox Union)',
  'OK (Organized Kashrut)',
  'Star-K',
  'CRC (Chicago Rabbinical Council)',
  'Kof-K',
  'Local Rabbi',
  'Other',
  'Not Applicable'
];

const KOSHER_LEVELS = [
  'Glatt Kosher',
  'Kosher Dairy',
  'Kosher Pareve',
  'Kosher Meat',
  'Cholov Yisrael',
  'Pas Yisrael',
  'Yoshon',
  'Not Applicable'
];

export default function CustomizeStep({
  storeData,
  updateStoreData,
  onNext,
  onPrev,
  isSubmitting,
  onSubmit,
  currentStep,
  totalSteps
}: CustomizeStepProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // In a real implementation, you'd upload to a service and get a URL
      updateStoreData({ logo: URL.createObjectURL(file) });
    }
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerFile(file);
      // In a real implementation, you'd upload to a service and get a URL
      updateStoreData({ banner: URL.createObjectURL(file) });
    }
  };

  const handleColorSchemeSelect = (colorScheme: string) => {
    updateStoreData({ colorScheme });
  };

  const handleKosherSettingsChange = (field: string, value: string | boolean) => {
    updateStoreData({ [field]: value });
  };

  const canProceed = true; // This step is optional

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">🎨</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Customize Your Store
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Make your store unique with custom branding and kosher certification details.
        </p>
      </div>

      {/* Visual Branding */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Visual Branding
        </h3>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Logo
          </label>
          <div className="flex items-center space-x-4">
            {storeData.logo ? (
              <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden">
                <img 
                  src={storeData.logo} 
                  alt="Store logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
              >
                Upload Logo
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 200x200px, PNG or JPG
              </p>
            </div>
          </div>
        </div>

        {/* Banner Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Banner
          </label>
          <div className="space-y-2">
            {storeData.banner ? (
              <div className="w-full h-32 rounded-lg border border-gray-200 overflow-hidden">
                <img 
                  src={storeData.banner} 
                  alt="Store banner" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
                id="banner-upload"
              />
              <label
                htmlFor="banner-upload"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
              >
                Upload Banner
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 1200x300px, PNG or JPG
              </p>
            </div>
          </div>
        </div>

        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Scheme
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COLOR_SCHEMES.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => handleColorSchemeSelect(scheme.id)}
                className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                  storeData.colorScheme === scheme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <div>
                    <div className="font-medium text-sm">{scheme.name}</div>
                    <div className="text-xs text-gray-500">Primary color</div>
                  </div>
                  {storeData.colorScheme === scheme.id && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kosher Certification */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Star className="w-5 h-5 mr-2" />
          Kosher Certification
        </h3>

        {/* Kosher Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kosher Level
          </label>
          <select
            value={storeData.kosherCert}
            onChange={(e) => handleKosherSettingsChange('kosherCert', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Kosher Level</option>
            {KOSHER_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Kosher Agency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certifying Agency
          </label>
          <select
            value={storeData.kosherAgency}
            onChange={(e) => handleKosherSettingsChange('kosherAgency', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Certifying Agency</option>
            {KOSHER_AGENCIES.map((agency) => (
              <option key={agency} value={agency}>{agency}</option>
            ))}
          </select>
        </div>

        {/* Shabbos Orders */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Accept Shabbos Orders</h4>
            <p className="text-sm text-gray-600">
              Allow customers to place orders for pickup after Shabbos
            </p>
          </div>
          <button
            onClick={() => handleKosherSettingsChange('shabbosOrders', !storeData.shabbosOrders)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              storeData.shabbosOrders ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                storeData.shabbosOrders ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Store Preview */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Preview</h3>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Banner */}
          {storeData.banner && (
            <div className="w-full h-24 bg-cover bg-center" style={{ backgroundImage: `url(${storeData.banner})` }} />
          )}
          
          {/* Store Info */}
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              {storeData.logo && (
                <div className="w-12 h-12 rounded-lg overflow-hidden">
                  <img src={storeData.logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900">
                  {storeData.storeName || 'Your Store Name'}
                </h4>
                <p className="text-sm text-gray-600">
                  {storeData.category && storeData.subcategory 
                    ? `${storeData.category} • ${storeData.subcategory}`
                    : 'Category • Subcategory'
                  }
                </p>
              </div>
            </div>
            
            {/* Kosher Badge */}
            {storeData.kosherCert && storeData.kosherCert !== 'Not Applicable' && (
              <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                <Star className="w-3 h-3 mr-1" />
                {storeData.kosherCert}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Customization Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use high-quality images for logo and banner</li>
          <li>• Choose colors that reflect your brand personality</li>
          <li>• Accurate kosher certification builds trust with customers</li>
          <li>• Shabbos order settings help accommodate religious customers</li>
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
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>Next Step</span>
          <span className="text-sm">+150 points</span>
        </button>
      </div>
    </div>
  );
}
