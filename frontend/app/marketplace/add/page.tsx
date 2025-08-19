'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { BottomNavigation } from '@/components/navigation/ui';
import { createMarketplaceListing, fetchMarketplaceCategories } from '@/lib/api/marketplace';
import { CreateListingRequest, VehicleAttributes, ApplianceAttributes, RegularAttributes } from '@/lib/types/marketplace';

interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: {
    id: number;
    name: string;
    slug: string;
  }[];
}

type ListingKind = 'regular' | 'vehicle' | 'appliance';

export default function AddListingPage() {
  const router = useRouter();
  
  // Form state
  const [kind, setKind] = useState<ListingKind>('regular');
  const [formData, setFormData] = useState<CreateListingRequest>({
    title: '',
    description: '',
    kind: 'regular',
    txn_type: 'sale',
    price_cents: 0,
    currency: 'USD',
    condition: 'used_good',
    category_id: 0,
    subcategory_id: undefined,
    city: '',
    region: '',
    zip: '',
    country: 'US',
    lat: undefined,
    lng: undefined,
    seller_user_id: '',
    attributes: {}
  });

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Kind-specific attributes
  const [vehicleAttributes, setVehicleAttributes] = useState<VehicleAttributes>({
    vehicle_type: 'car',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    transmission: 'automatic',
    fuel_type: 'gasoline',
    color: '',
    vin: '',
    title_status: 'clear'
  });

  const [applianceAttributes, setApplianceAttributes] = useState<ApplianceAttributes>({
    appliance_type: 'refrigerator',
    kosher_use: 'unspecified',
    brand: '',
    model_number: '',
    energy_rating: '',
    warranty_remaining: '',
    installation_required: false
  });

  const [regularAttributes, setRegularAttributes] = useState<RegularAttributes>({
    brand: '',
    size: '',
    color: '',
    material: '',
    weight: '',
    dimensions: ''
  });

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetchMarketplaceCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleKindChange = (newKind: ListingKind) => {
    setKind(newKind);
    setFormData(prev => ({ ...prev, kind: newKind }));
  };

  const handleFormChange = (field: keyof CreateListingRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    setFormData(prev => ({ 
      ...prev, 
      category_id: categoryId,
      subcategory_id: undefined 
    }));
  };

  const getKindSpecificAttributes = () => {
    switch (kind) {
      case 'vehicle':
        return vehicleAttributes;
      case 'appliance':
        return applianceAttributes;
      case 'regular':
      default:
        return regularAttributes;
    }
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }
    if (!formData.category_id) {
      return 'Category is required';
    }
    if (formData.price_cents < 0) {
      return 'Price cannot be negative';
    }

    // Kind-specific validation
    if (kind === 'vehicle') {
      if (!vehicleAttributes.make.trim()) {
        return 'Vehicle make is required';
      }
      if (!vehicleAttributes.model.trim()) {
        return 'Vehicle model is required';
      }
      if (vehicleAttributes.year < 1900 || vehicleAttributes.year > new Date().getFullYear() + 1) {
        return 'Please enter a valid year';
      }
      if (vehicleAttributes.mileage < 0) {
        return 'Mileage cannot be negative';
      }
    }

    if (kind === 'appliance') {
      if (!applianceAttributes.brand?.trim()) {
        return 'Brand is required for appliances';
      }
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
      const listingData: CreateListingRequest = {
        ...formData,
        attributes: getKindSpecificAttributes()
      };

      const response = await createMarketplaceListing(listingData);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/marketplace');
        }, 2000);
      } else {
        setError(response.error || 'Failed to create listing');
      }
    } catch (err) {
      setError('Failed to create listing. Please try again.');
      console.error('Error creating listing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Listing Created Successfully!
            </h1>
            <p className="text-gray-600 mb-6">
              Your listing has been created and is now live on the marketplace.
            </p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Create New Listing</h1>
            <p className="text-gray-600 mt-1">
              Choose what type of item you want to list and fill out the details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Listing Kind Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What are you listing?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'regular', label: 'General Item', icon: '📦', description: 'Books, clothes, household items, etc.' },
                  { value: 'vehicle', label: 'Vehicle', icon: '🚗', description: 'Cars, motorcycles, boats, etc.' },
                  { value: 'appliance', label: 'Appliance', icon: '🏠', description: 'Kitchen appliances, electronics, etc.' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleKindChange(option.value as ListingKind)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      kind === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What are you selling?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_cents / 100}
                  onChange={(e) => handleFormChange('price_cents', Math.round(parseFloat(e.target.value) * 100))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your item..."
              />
            </div>

            {/* Category Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleCategoryChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategory && selectedCategory.subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory_id || ''}
                    onChange={(e) => handleFormChange('subcategory_id', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a subcategory</option>
                    {selectedCategory.subcategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition *
              </label>
              <select
                value={formData.condition}
                onChange={(e) => handleFormChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="new">New</option>
                <option value="used_like_new">Used - Like New</option>
                <option value="used_good">Used - Good</option>
                <option value="used_fair">Used - Fair</option>
              </select>
            </div>

            {/* Kind-specific fields */}
            {kind === 'vehicle' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Make *</label>
                    <input
                      type="text"
                      value={vehicleAttributes.make}
                      onChange={(e) => setVehicleAttributes(prev => ({ ...prev, make: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Toyota"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                    <input
                      type="text"
                      value={vehicleAttributes.model}
                      onChange={(e) => setVehicleAttributes(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Camry"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={vehicleAttributes.year}
                      onChange={(e) => setVehicleAttributes(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mileage *</label>
                    <input
                      type="number"
                      min="0"
                      value={vehicleAttributes.mileage}
                      onChange={(e) => setVehicleAttributes(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Miles"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type *</label>
                    <select
                      value={vehicleAttributes.vehicle_type}
                      onChange={(e) => setVehicleAttributes(prev => ({ ...prev, vehicle_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="car">Car</option>
                      <option value="truck">Truck</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="suv">SUV</option>
                      <option value="van">Van</option>
                      <option value="boat">Boat</option>
                      <option value="rv">RV</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                    <select
                      value={vehicleAttributes.transmission}
                      onChange={(e) => setVehicleAttributes(prev => ({ ...prev, transmission: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                      <option value="cvt">CVT</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {kind === 'appliance' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Appliance Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Appliance Type *</label>
                    <select
                      value={applianceAttributes.appliance_type}
                      onChange={(e) => setApplianceAttributes(prev => ({ ...prev, appliance_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="refrigerator">Refrigerator</option>
                      <option value="freezer">Freezer</option>
                      <option value="oven">Oven</option>
                      <option value="stove">Stove</option>
                      <option value="dishwasher">Dishwasher</option>
                      <option value="microwave">Microwave</option>
                      <option value="washer">Washer</option>
                      <option value="dryer">Dryer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kosher Use *</label>
                    <select
                      value={applianceAttributes.kosher_use}
                      onChange={(e) => setApplianceAttributes(prev => ({ ...prev, kosher_use: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="unspecified">Unspecified</option>
                      <option value="meat">Meat (Fleishig)</option>
                      <option value="dairy">Dairy (Milchig)</option>
                      <option value="pareve">Pareve (Neutral)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <input
                      type="text"
                      value={applianceAttributes.brand}
                      onChange={(e) => setApplianceAttributes(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., KitchenAid"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model Number</label>
                    <input
                      type="text"
                      value={applianceAttributes.model_number}
                      onChange={(e) => setApplianceAttributes(prev => ({ ...prev, model_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Model number"
                    />
                  </div>
                </div>
              </div>
            )}

            {kind === 'regular' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <input
                      type="text"
                      value={regularAttributes.brand}
                      onChange={(e) => setRegularAttributes(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brand name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                    <input
                      type="text"
                      value={regularAttributes.size}
                      onChange={(e) => setRegularAttributes(prev => ({ ...prev, size: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Large, Medium, XL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <input
                      type="text"
                      value={regularAttributes.color}
                      onChange={(e) => setRegularAttributes(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Color"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                    <input
                      type="text"
                      value={regularAttributes.material}
                      onChange={(e) => setRegularAttributes(prev => ({ ...prev, material: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Cotton, Wood, Metal"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State/Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => handleFormChange('region', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State or Region"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => handleFormChange('zip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ZIP Code"
                  />
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 border-t pt-6">
              <button
                type="button"
                onClick={() => router.push('/marketplace')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
