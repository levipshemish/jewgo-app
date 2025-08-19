'use client';

import { Mail, CheckCircle, AlertCircle, X, ChefHat, Star, Users, Bell } from 'lucide-react';
import React, { useState } from 'react';

export interface NewsletterData {
  email: string;
  firstName?: string;
  lastName?: string;
  preferences: {
    newRestaurants: boolean;
    specialOffers: boolean;
    kosherTips: boolean;
    communityEvents: boolean;
    weeklyDigest: boolean;
  };
  location?: string;
  dietaryRestrictions?: string[];
  frequency: 'weekly' | 'biweekly' | 'monthly';
  source: string;
}

interface NewsletterSignupProps {
  variant?: 'inline' | 'modal' | 'popup';
  onClose?: () => void;
  onSubmit?: (data: NewsletterData) => void;
  className?: string;
  title?: string;
  description?: string;
}

const DIETARY_RESTRICTIONS = [
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Soy-Free',
  'Fish-Free',
  'Vegetarian',
  'Vegan',
  'Low-Sodium',
  'Low-Carb',
  'Keto-Friendly'
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', description: 'Get updates every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Get updates every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Get updates once a month' }
];

export default function NewsletterSignup({ 
  variant = 'inline', onClose, onSubmit, className = '', title = "Join the Kosher Foodie Community", description = "Stay updated with the latest kosher restaurants, special offers, and community events in your area."
}: NewsletterSignupProps) {
  const [formData, setFormData] = useState<NewsletterData>({
    email: '',
    firstName: '',
    lastName: '',
    preferences: {
      newRestaurants: true,
      specialOffers: true,
      kosherTips: true,
      communityEvents: false,
      weeklyDigest: true
    },
    location: '',
    dietaryRestrictions: [],
    frequency: 'weekly',
    source: 'newsletter_signup'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreferences, setShowPreferences] = useState(false);

  const handleInputChange = (field: keyof NewsletterData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePreferenceChange = (preference: keyof NewsletterData['preferences'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const handleDietaryRestrictionChange = (restriction: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: checked
        ? [...(prev.dietaryRestrictions || []), restriction]
        : (prev.dietaryRestrictions || []).filter(r => r !== restriction)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors['email'] = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors['email'] = 'Please enter a valid email address';
    }

    // Check if at least one preference is selected
    const hasPreferences = Object.values(formData.preferences).some(pref => pref);
    if (!hasPreferences) {
      newErrors['preferences'] = 'Please select at least one newsletter preference';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      setSubmitStatus('success');
      
      // Track newsletter signup
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.trackUserEngagement('newsletter_signup', {
          email: formData.email,
          preferences: formData.preferences,
          frequency: formData.frequency,
          source: formData.source,
        });
      }

      // Call custom onSubmit if provided
      if (onSubmit) {
        onSubmit(formData);
      }

      // Auto-close after success for modal/popup variants
      if (variant !== 'inline') {
        setTimeout(() => {
          onClose?.();
        }, 3000);
      }

    } catch {
      // // console.error('Error subscribing to newsletter:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'modal':
        return 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
      case 'popup':
        return 'fixed bottom-6 right-6 bg-white rounded-lg shadow-xl z-50 max-w-md';
      default:
        return 'bg-white rounded-lg shadow-md';
    }
  };

  const getContentClasses = () => {
    switch (variant) {
      case 'modal':
        return 'bg-white rounded-lg shadow-lg p-6 max-w-md w-full';
      case 'popup':
        return 'p-6';
      default:
        return 'p-6';
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className={getContainerClasses()}>
        <div className={getContentClasses()}>
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to the Community!
            </h3>
            <p className="text-gray-600 mb-4">
              Thank you for subscribing to our newsletter. You&apos;ll receive your first update soon!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What to expect:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• New kosher restaurant discoveries</li>
                <li>• Exclusive special offers and deals</li>
                <li>• Kosher cooking tips and recipes</li>
                <li>• Community events and meetups</li>
              </ul>
            </div>
            {variant !== 'inline' && (
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      <div className={getContentClasses()}>
        {variant !== 'inline' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-gray-600">
            {description}
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <ChefHat className="w-4 h-4 mr-2 text-blue-500" />
            New Restaurants
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Star className="w-4 h-4 mr-2 text-blue-500" />
            Special Offers
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-blue-500" />
            Community Events
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Bell className="w-4 h-4 mr-2 text-blue-500" />
            Weekly Updates
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors['email'] ? 'border-red-500' : 'border-gray-300'
            }`}
              placeholder="your@email.com"
            />
            {errors['email'] && (
              <p className="mt-1 text-sm text-red-600">{errors['email']}</p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Last name"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City, State"
            />
          </div>

          {/* Preferences Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showPreferences ? 'Hide' : 'Show'} Newsletter Preferences
            </button>
          </div>

          {/* Preferences */}
          {showPreferences && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Newsletter Preferences</h4>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.newRestaurants}
                    onChange={(e) => handlePreferenceChange('newRestaurants', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">New Restaurant Discoveries</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.specialOffers}
                    onChange={(e) => handlePreferenceChange('specialOffers', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Special Offers & Deals</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.kosherTips}
                    onChange={(e) => handlePreferenceChange('kosherTips', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Kosher Cooking Tips</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.communityEvents}
                    onChange={(e) => handlePreferenceChange('communityEvents', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Community Events</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.weeklyDigest}
                    onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Weekly Digest</span>
                </label>
              </div>

                          {errors['preferences'] && (
              <p className="text-sm text-red-600">{errors['preferences']}</p>
            )}

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Frequency
                </label>
                <div className="space-y-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="frequency"
                        value={option.value}
                        checked={formData.frequency === option.value}
                        onChange={(e) => handleInputChange('frequency', e.target.value)}
                        className="mr-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">{option.label}</span>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Restrictions (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DIETARY_RESTRICTIONS.map((restriction) => (
                    <label key={restriction} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.dietaryRestrictions?.includes(restriction)}
                        onChange={(e) => handleDietaryRestrictionChange(restriction, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700">{restriction}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit Status */}
          {submitStatus === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">
                  Failed to subscribe. Please try again.
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Subscribing...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Subscribe to Newsletter
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </form>
      </div>
    </div>
  );
} 