'use client';

import React, { useState, useEffect } from 'react';
import { appLogger } from '@/lib/utils/logger';

interface StoreSettingsProps {
  storeData: any;
  onRefresh: () => void;
}

interface StoreSettings {
  store_name: string;
  store_description: string;
  store_type: string;
  store_category: string;
  subcategory: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number;
  longitude: number;
  phone_number: string;
  email: string;
  website: string;
  business_hours: string;
  timezone: string;
  delivery_enabled: boolean;
  delivery_radius_miles: number;
  delivery_fee: number;
  delivery_minimum: number;
  pickup_enabled: boolean;
  kosher_certification: string;
  kosher_agency: string;
  kosher_level: string;
  is_cholov_yisroel: boolean;
  is_pas_yisroel: boolean;
  shabbos_orders: boolean;
  shabbos_delivery: boolean;
  logo_url: string;
  banner_url: string;
  color_scheme: string;
  custom_domain: string;
  plan_type: string;
  is_active: boolean;
}

export default function StoreSettings({ storeData, onRefresh }: StoreSettingsProps) {
  const [settings, setSettings] = useState<StoreSettings>(storeData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/shtel/store/${storeData.store_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to update store settings');
      
      onRefresh();
      alert('Store settings updated successfully!');
    } catch (err) {
      appLogger.error('Error updating store settings:', err);
      alert('Failed to update store settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!confirm('Are you sure you want to delete your store? This action cannot be undone.')) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/shtel/store/${storeData.store_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete store');
      
      // Redirect to shtel page
      window.location.href = '/shtel';
    } catch (err) {
      appLogger.error('Error deleting store:', err);
      alert('Failed to delete store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '🏪' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'delivery', label: 'Delivery', icon: '🚚' },
    { id: 'kosher', label: 'Kosher', icon: '✡️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings settings={settings} updateSetting={updateSetting} />;
      case 'location':
        return <LocationSettings settings={settings} updateSetting={updateSetting} />;
      case 'delivery':
        return <DeliverySettings settings={settings} updateSetting={updateSetting} />;
      case 'kosher':
        return <KosherSettings settings={settings} updateSetting={updateSetting} />;
      case 'appearance':
        return <AppearanceSettings settings={settings} updateSetting={updateSetting} />;
      case 'billing':
        return <BillingSettings settings={settings} updateSetting={updateSetting} />;
      case 'advanced':
        return <AdvancedSettings settings={settings} updateSetting={updateSetting} onDelete={handleDeleteStore} />;
      default:
        return <GeneralSettings settings={settings} updateSetting={updateSetting} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Store Settings</h2>
          <p className="text-gray-600">Manage your store configuration and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// General Settings Component
function GeneralSettings({ settings, updateSetting }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">General Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Name *</label>
          <input
            type="text"
            value={settings.store_name}
            onChange={(e) => updateSetting('store_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Type</label>
          <select
            value={settings.store_type}
            onChange={(e) => updateSetting('store_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General Store</option>
            <option value="judaica">Judaica Store</option>
            <option value="kosher_food">Kosher Food</option>
            <option value="restaurant">Restaurant</option>
            <option value="catering">Catering</option>
            <option value="bakery">Bakery</option>
            <option value="butcher">Butcher</option>
            <option value="grocery">Grocery</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={settings.store_category}
            onChange={(e) => updateSetting('store_category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General</option>
            <option value="food">Food & Dining</option>
            <option value="judaica">Judaica</option>
            <option value="services">Services</option>
            <option value="retail">Retail</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={settings.phone_number || ''}
            onChange={(e) => updateSetting('phone_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={settings.email || ''}
            onChange={(e) => updateSetting('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <input
            type="url"
            value={settings.website || ''}
            onChange={(e) => updateSetting('website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
        <textarea
          value={settings.store_description || ''}
          onChange={(e) => updateSetting('store_description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe your store and what makes it special..."
        />
      </div>
    </div>
  );
}

// Location Settings Component
function LocationSettings({ settings, updateSetting }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Location & Address</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
          <input
            type="text"
            value={settings.address}
            onChange={(e) => updateSetting('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={settings.city}
            onChange={(e) => updateSetting('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <input
            type="text"
            value={settings.state}
            onChange={(e) => updateSetting('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
          <input
            type="text"
            value={settings.zip_code || ''}
            onChange={(e) => updateSetting('zip_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            value={settings.country}
            onChange={(e) => updateSetting('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={settings.timezone || 'America/New_York'}
            onChange={(e) => updateSetting('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="America/Anchorage">Alaska Time</option>
            <option value="Pacific/Honolulu">Hawaii Time</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
        <textarea
          value={settings.business_hours || ''}
          onChange={(e) => updateSetting('business_hours', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Monday-Friday: 9AM-6PM, Saturday: 10AM-4PM, Sunday: Closed"
        />
      </div>
    </div>
  );
}

// Delivery Settings Component
function DeliverySettings({ settings, updateSetting }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Delivery & Pickup Options</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.delivery_enabled}
              onChange={(e) => updateSetting('delivery_enabled', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Enable Delivery</span>
          </label>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.pickup_enabled}
              onChange={(e) => updateSetting('pickup_enabled', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Enable Pickup</span>
          </label>
        </div>
      </div>
      
      {settings.delivery_enabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Radius (miles)</label>
            <input
              type="number"
              step="0.1"
              value={settings.delivery_radius_miles}
              onChange={(e) => updateSetting('delivery_radius_miles', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Fee ($)</label>
            <input
              type="number"
              step="0.01"
              value={settings.delivery_fee}
              onChange={(e) => updateSetting('delivery_fee', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order ($)</label>
            <input
              type="number"
              step="0.01"
              value={settings.delivery_minimum}
              onChange={(e) => updateSetting('delivery_minimum', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Kosher Settings Component
function KosherSettings({ settings, updateSetting }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Kosher Certification</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kosher Certification</label>
          <select
            value={settings.kosher_certification || ''}
            onChange={(e) => updateSetting('kosher_certification', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No Certification</option>
            <option value="OU">OU (Orthodox Union)</option>
            <option value="OK">OK Kosher</option>
            <option value="Star-K">Star-K</option>
            <option value="Kof-K">Kof-K</option>
            <option value="CRC">CRC (Chicago Rabbinical Council)</option>
            <option value="Vaad">Local Vaad</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kosher Level</label>
          <select
            value={settings.kosher_level || ''}
            onChange={(e) => updateSetting('kosher_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Not Applicable</option>
            <option value="glatt">Glatt Kosher</option>
            <option value="mehadrin">Mehadrin</option>
            <option value="cholov_yisroel">Cholov Yisroel</option>
            <option value="pas_yisroel">Pas Yisroel</option>
            <option value="yoshon">Yoshon</option>
            <option value="regular">Regular Kosher</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.is_cholov_yisroel}
              onChange={(e) => updateSetting('is_cholov_yisroel', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Cholov Yisroel</span>
          </label>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.is_pas_yisroel}
              onChange={(e) => updateSetting('is_pas_yisroel', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Pas Yisroel</span>
          </label>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.shabbos_orders}
              onChange={(e) => updateSetting('shabbos_orders', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Accept Shabbos Orders</span>
          </label>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.shabbos_delivery}
              onChange={(e) => updateSetting('shabbos_delivery', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Shabbos Delivery Available</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Appearance Settings Component
function AppearanceSettings({ settings, updateSetting }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Store Appearance</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
          <input
            type="url"
            value={settings.logo_url || ''}
            onChange={(e) => updateSetting('logo_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Banner URL</label>
          <input
            type="url"
            value={settings.banner_url || ''}
            onChange={(e) => updateSetting('banner_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
          <select
            value={settings.color_scheme}
            onChange={(e) => updateSetting('color_scheme', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="purple">Purple</option>
            <option value="red">Red</option>
            <option value="orange">Orange</option>
            <option value="gray">Gray</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
          <input
            type="text"
            value={settings.custom_domain || ''}
            onChange={(e) => updateSetting('custom_domain', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="yourstore.com"
          />
        </div>
      </div>
    </div>
  );
}

// Billing Settings Component
function BillingSettings({ settings, updateSetting }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Billing & Plan</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Current Plan: {settings.plan_type}</h4>
            <p className="text-sm text-gray-600">
              {settings.plan_type === 'free' && 'Free plan with basic features'}
              {settings.plan_type === 'basic' && 'Basic plan with enhanced features'}
              {settings.plan_type === 'premium' && 'Premium plan with all features'}
            </p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Upgrade Plan
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
          <select
            value={settings.plan_type}
            onChange={(e) => updateSetting('plan_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          >
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Contact support to change your plan</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Status</label>
          <select
            value={settings.is_active ? 'active' : 'inactive'}
            onChange={(e) => updateSetting('is_active', e.target.value === 'active')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Advanced Settings Component
function AdvancedSettings({ settings, updateSetting, onDelete }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-400 text-xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Danger Zone</h4>
            <p className="text-sm text-yellow-700 mt-1">
              These actions cannot be undone. Please be careful.
            </p>
          </div>
        </div>
      </div>
      
      <div className="border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Delete Store</h4>
            <p className="text-sm text-gray-600">
              Permanently delete your store and all associated data. This action cannot be undone.
            </p>
          </div>
          <button
            onClick={onDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Delete Store
          </button>
        </div>
      </div>
    </div>
  );
}
