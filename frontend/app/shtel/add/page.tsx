'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import { useAuth } from '@/hooks/useAuth';
import { appLogger } from '@/lib/utils/logger';

interface ListingFormData {
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  condition: string;
  category: string;
  subcategory: string;
  transaction_type: 'sale' | 'gemach' | 'trade' | 'donation';
  is_gemach: boolean;
  kosher_verified: boolean;
  kosher_agency: string;
  holiday_category: string;
  city: string;
  state: string;
  images: string[];
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
  'Local Rabbinate',
  'Other'
];

const CONDITIONS = [
  { value: 'new', label: 'New - Never Used' },
  { value: 'used_like_new', label: 'Like New - Barely Used' },
  { value: 'used_good', label: 'Good - Normal Wear' },
  { value: 'used_fair', label: 'Fair - Some Wear' }
];

export default function AddShtelListingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('shtel');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price_cents: 0,
    currency: 'USD',
    condition: 'used_good',
    category: '',
    subcategory: '',
    transaction_type: 'sale',
    is_gemach: false,
    kosher_verified: false,
    kosher_agency: '',
    holiday_category: '',
    city: '',
    state: 'FL',
    images: []
  });

  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/shtel/add');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const category = JEWISH_CATEGORIES.find(cat => cat.value === selectedCategory);
    if (category) {
      setAvailableSubcategories(category.subcategories);
      setFormData(prev => ({ ...prev, category: category.label, subcategory: '' }));
    }
  }, [selectedCategory]);

  const handleInputChange = (field: keyof ListingFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-set Gemach flag when price is 0
    if (field === 'price_cents' && value === 0) {
      setFormData(prev => ({ ...prev, is_gemach: true, transaction_type: 'gemach' }));
    }
    
    // Auto-unset Gemach flag when price is > 0
    if (field === 'price_cents' && typeof value === 'number' && value > 0) {
      setFormData(prev => ({ ...prev, is_gemach: false, transaction_type: 'sale' }));
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'mikvah':
        router.push('/mikvah');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'marketplace':
        router.push('/marketplace');
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      case 'shtel':
        router.push('/shtel');
        break;
    }
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }
    if (!formData.description.trim()) {
      return 'Description is required';
    }
    if (!formData.category) {
      return 'Category is required';
    }
    if (!formData.city.trim()) {
      return 'City is required';
    }
    if (formData.price_cents < 0) {
      return 'Price cannot be negative';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/shtel-listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create listing');
      }

      setSuccess(true);
      appLogger.info('Shtetl listing created successfully', { listingId: data.data?.id });
      
      // Redirect to the new listing or back to shtel page
      setTimeout(() => {
        if (data.data?.id) {
          router.push(`/shtel/product/${data.data.id}`);
        } else {
          router.push('/shtel');
        }
      }, 2000);

    } catch (err) {
      appLogger.error('Error creating shtetl listing', { error: String(err) });
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting to login
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f4f4f4] pb-20">
        <Header />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Created!</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            Your community listing has been successfully created and will be visible to other community members.
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirecting to your listing...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-20">
      <Header />
      
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Add Community Listing</h1>
            <p className="text-sm text-gray-600 mt-1">
              Share items with your Jewish community - for sale, Gemach (free loan), or trade
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sterling Silver Mezuzah Case"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide details about the item, its condition, kosher status, etc."
                  maxLength={1000}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/1000 characters
                </div>
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Type</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'sale', label: 'For Sale', icon: '💰' },
                  { value: 'gemach', label: 'Gemach (Free)', icon: '🤝' },
                  { value: 'trade', label: 'Trade/Swap', icon: '🔄' },
                  { value: 'donation', label: 'Donation', icon: '❤️' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      handleInputChange('transaction_type', type.value as any);
                      if (type.value === 'gemach') {
                        handleInputChange('price_cents', 0);
                        handleInputChange('is_gemach', true);
                      }
                    }}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.transaction_type === type.value
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

            {/* Price */}
            {formData.transaction_type === 'sale' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_cents / 100}
                    onChange={(e) => handleInputChange('price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Category & Condition</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {JEWISH_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {availableSubcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory
                    </label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a subcategory</option>
                      {availableSubcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition *
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => handleInputChange('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kosher Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Kosher Information</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="kosher_verified"
                  checked={formData.kosher_verified}
                  onChange={(e) => handleInputChange('kosher_verified', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="kosher_verified" className="ml-2 text-sm font-medium text-gray-700">
                  This item has kosher certification/verification
                </label>
              </div>

              {formData.kosher_verified && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kosher Agency/Authority
                  </label>
                  <select
                    value={formData.kosher_agency}
                    onChange={(e) => handleInputChange('kosher_agency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select kosher agency</option>
                    {KOSHER_AGENCIES.map((agency) => (
                      <option key={agency} value={agency}>
                        {agency}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Location</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Miami Beach"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="FL">Florida</option>
                    <option value="NY">New York</option>
                    <option value="NJ">New Jersey</option>
                    <option value="CA">California</option>
                    <option value="IL">Illinois</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Listing...
                    </div>
                  ) : (
                    'Create Listing'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}