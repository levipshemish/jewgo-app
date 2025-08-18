'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Send, X, Building2, User, FileText, Clock } from 'lucide-react';

export interface ClaimData {
  restaurantId: number;
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessLicense: string;
  proofOfOwnership: File[];
  additionalDocuments: File[];
  claimReason: string;
  proposedChanges: string;
  contactPreference: 'email' | 'phone' | 'both';
  preferredContactTime: string;
  verificationMethod: 'license' | 'documentation' | 'phone_call' | 'in_person';
}

interface RestaurantClaimFormProps {
  restaurantId: number;
  restaurantName: string;
  onClose: () => void;
  onSubmit?: (data: ClaimData) => void;
  className?: string;
}

const VERIFICATION_METHODS = [
  { value: 'license', label: 'Business License Verification', description: 'Verify through official business license' },
  { value: 'documentation', label: 'Documentation Review', description: 'Review of ownership documents' },
  { value: 'phone_call', label: 'Phone Call Verification', description: 'Verification call to business phone' },
  { value: 'in_person', label: 'In-Person Verification', description: 'Visit to restaurant location' }
];

const CONTACT_PREFERENCES = [
  { value: 'email', label: 'Email Only' },
  { value: 'phone', label: 'Phone Only' },
  { value: 'both', label: 'Email and Phone' }
];

const CONTACT_TIMES = [
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 5 PM)',
  'Evening (5 PM - 8 PM)',
  'Any time during business hours'
];

export default function RestaurantClaimForm({ 
  restaurantId, restaurantName, onClose, onSubmit, className = '' 
}: RestaurantClaimFormProps) {
  const [formData, setFormData] = useState<ClaimData>({
    restaurantId,
    restaurantName,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    businessLicense: '',
    proofOfOwnership: [],
    additionalDocuments: [],
    claimReason: '',
    proposedChanges: '',
    contactPreference: 'email',
    preferredContactTime: 'Afternoon (12 PM - 5 PM)',
    verificationMethod: 'license'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleInputChange = (field: keyof ClaimData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (field: 'proofOfOwnership' | 'additionalDocuments', event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({ ...prev, [field]: files }));
  };

  const removeFile = (field: 'proofOfOwnership' | 'additionalDocuments', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.ownerName.trim()) {
          newErrors['ownerName'] = 'Owner name is required';
        }
        if (!formData.ownerEmail.trim()) {
          newErrors['ownerEmail'] = 'Email is required';
        } else if (!isValidEmail(formData.ownerEmail)) {
          newErrors['ownerEmail'] = 'Please enter a valid email address';
        }
        if (!formData.ownerPhone.trim()) {
          newErrors['ownerPhone'] = 'Phone number is required';
        }
        break;

      case 2: // Documentation
        if (!formData.businessLicense.trim()) {
          newErrors['businessLicense'] = 'Business license number is required';
        }
        if (formData.proofOfOwnership.length === 0) {
          newErrors['proofOfOwnership'] = 'At least one proof of ownership document is required';
        }
        break;

      case 3: // Claim Details
        if (!formData.claimReason.trim()) {
          newErrors['claimReason'] = 'Please explain why you are claiming this restaurant';
        } else if (formData.claimReason.trim().length < 20) {
          newErrors['claimReason'] = 'Please provide a more detailed explanation (at least 20 characters)';
        }
        break;

      case 4: // Contact Preferences
        // No validation needed for this step
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Create FormData for file uploads
      const submitData = new FormData();
      submitData.append('restaurantId', formData.restaurantId.toString());
      submitData.append('restaurantName', formData.restaurantName);
      submitData.append('ownerName', formData.ownerName);
      submitData.append('ownerEmail', formData.ownerEmail);
      submitData.append('ownerPhone', formData.ownerPhone);
      submitData.append('businessLicense', formData.businessLicense);
      submitData.append('claimReason', formData.claimReason);
      submitData.append('proposedChanges', formData.proposedChanges);
      submitData.append('contactPreference', formData.contactPreference);
      submitData.append('preferredContactTime', formData.preferredContactTime);
      submitData.append('verificationMethod', formData.verificationMethod);

      // Add proof of ownership files
      formData.proofOfOwnership.forEach((file, index) => {
        submitData.append(`proofOfOwnership_${index}`, file);
      });

      // Add additional documents
      formData.additionalDocuments.forEach((file, index) => {
        submitData.append(`additionalDocuments_${index}`, file);
      });

      const response = await fetch('/api/restaurants/claim', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit claim');
      }

      setSubmitStatus('success');
      
      // Track claim submission
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.trackEvent('restaurant_claim_submitted', {
          restaurant_id: formData.restaurantId,
          restaurant_name: formData.restaurantName,
          verification_method: formData.verificationMethod,
        });
      }

      // Call custom onSubmit if provided
      if (onSubmit) {
        onSubmit(formData);
      }

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch {
      // // console.error('Error submitting claim:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i + 1 < currentStep 
                ? 'bg-green-500 text-white' 
                : i + 1 === currentStep 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {i + 1 < currentStep ? '✓' : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-16 h-1 mx-2 ${
                i + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-600">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );

  if (submitStatus === 'success') {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto ${className}`}>
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Claim Submitted Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            Thank you for submitting your restaurant claim. We&apos;ll review your information and contact you within 3-5 business days.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• We&apos;ll verify your ownership documentation</li>
              <li>• You&apos;ll receive a confirmation email</li>
              <li>• Our team will contact you to discuss next steps</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Claim Restaurant Ownership
          </h2>
          <p className="text-gray-600 mt-1">
            Submit a claim to manage your restaurant listing
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Restaurant Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-1">Restaurant</h3>
        <p className="text-blue-700">{restaurantName}</p>
      </div>

      {renderStepIndicator()}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Owner Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name *
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['ownerName'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors['ownerName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['ownerName']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['ownerEmail'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your@email.com"
              />
              {errors['ownerEmail'] && (
                <p className="mt-1 text-sm text-red-600">{errors['ownerEmail']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['ownerPhone'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors['ownerPhone'] && (
                <p className="mt-1 text-sm text-red-600">{errors['ownerPhone']}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Documentation */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Documentation
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business License Number *
              </label>
              <input
                type="text"
                value={formData.businessLicense}
                onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['businessLicense'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your business license number"
              />
              {errors['businessLicense'] && (
                <p className="mt-1 text-sm text-red-600">{errors['businessLicense']}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proof of Ownership Documents *
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange('proofOfOwnership', e)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['proofOfOwnership'] ? 'border-red-500' : ''
                }`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload business registration, lease agreement, or other ownership documents (PDF, images, or Word docs)
              </p>
              {errors['proofOfOwnership'] && (
                <p className="mt-1 text-sm text-red-600">{errors['proofOfOwnership']}</p>
              )}
              
              {/* File list */}
              {formData.proofOfOwnership.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.proofOfOwnership.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('proofOfOwnership', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Documents (Optional)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileChange('additionalDocuments', e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Any additional documents that support your claim
              </p>
              
              {/* File list */}
              {formData.additionalDocuments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.additionalDocuments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('additionalDocuments', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Claim Details */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Claim Details
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Claim *
              </label>
              <textarea
                value={formData.claimReason}
                onChange={(e) => handleInputChange('claimReason', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['claimReason'] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please explain why you are claiming ownership of this restaurant..."
              />
              {errors['claimReason'] && (
                <p className="mt-1 text-sm text-red-600">{errors['claimReason']}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.claimReason.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Changes (Optional)
              </label>
              <textarea
                value={formData.proposedChanges}
                onChange={(e) => handleInputChange('proposedChanges', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What changes would you like to make to the listing? (hours, menu, photos, etc.)"
              />
            </div>
          </div>
        )}

        {/* Step 4: Contact Preferences */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Contact Preferences
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Contact Method
              </label>
              <div className="space-y-2">
                {CONTACT_PREFERENCES.map((pref) => (
                  <label key={pref.value} className="flex items-center">
                    <input
                      type="radio"
                      name="contactPreference"
                      value={pref.value}
                      checked={formData.contactPreference === pref.value}
                      onChange={(e) => handleInputChange('contactPreference', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{pref.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Contact Time
              </label>
              <select
                value={formData.preferredContactTime}
                onChange={(e) => handleInputChange('preferredContactTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONTACT_TIMES.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Method
              </label>
              <div className="space-y-3">
                {VERIFICATION_METHODS.map((method) => (
                  <label key={method.value} className="flex items-start">
                    <input
                      type="radio"
                      name="verificationMethod"
                      value={method.value}
                      checked={formData.verificationMethod === method.value}
                      onChange={(e) => handleInputChange('verificationMethod', e.target.value)}
                      className="mr-2 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{method.label}</span>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
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
                Failed to submit claim. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
} 