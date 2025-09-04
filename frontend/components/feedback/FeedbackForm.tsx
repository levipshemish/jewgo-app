'use client';

import { AlertCircle, CheckCircle, Send, X } from 'lucide-react';
import React, { useState } from 'react';

export interface FeedbackData {
  type: 'correction' | 'suggestion' | 'general';
  restaurantId?: number;
  restaurantName?: string;
  category: string;
  description: string;
  contactEmail?: string;
  priority: 'low' | 'medium' | 'high';
  attachments?: File[];
}

interface FeedbackFormProps {
  restaurantId?: number;
  restaurantName?: string;
  onClose: () => void;
  onSubmit?: (data: FeedbackData) => void;
  className?: string;
}

const FEEDBACK_CATEGORIES = {
  correction: [
    'incorrect_hours',
    'wrong_address',
    'wrong_phone',
    'wrong_website',
    'wrong_kosher_status',
    'wrong_category',
    'closed_restaurant',
    'duplicate_listing',
    'other_correction'
  ],
  suggestion: [
    'add_restaurant',
    'add_photos',
    'add_specials',
    'add_reviews',
    'improve_description',
    'add_menu',
    'other_suggestion'
  ],
  general: [
    'bug_report',
    'feature_request',
    'general_feedback',
    'partnership_inquiry',
    'other'
  ]
};

const CATEGORY_LABELS = {
  // Correction categories
  incorrect_hours: 'Incorrect Hours',
  wrong_address: 'Wrong Address',
  wrong_phone: 'Wrong Phone Number',
  wrong_website: 'Wrong Website',
  wrong_kosher_status: 'Wrong Kosher Status',
  wrong_category: 'Wrong Category',
  closed_restaurant: 'Restaurant is Closed',
  duplicate_listing: 'Duplicate Listing',
  other_correction: 'Other Correction',
  
  // Suggestion categories
  add_restaurant: 'Add New Restaurant',
  add_photos: 'Add Photos',
  add_specials: 'Add Specials',
  add_reviews: 'Add Reviews',
  improve_description: 'Improve Description',
  add_menu: 'Add Menu',
  other_suggestion: 'Other Suggestion',
  
  // General categories
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  general_feedback: 'General Feedback',
  partnership_inquiry: 'Partnership Inquiry',
  other: 'Other'
};

export default function FeedbackForm({ 
  restaurantId, restaurantName, onClose, onSubmit, className = '' 
}: FeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackData>({
    type: 'correction',
    restaurantId,
    restaurantName,
    category: '',
    description: '',
    contactEmail: '',
    priority: 'medium',
    attachments: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof FeedbackData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({ 
      ...prev, 
      attachments: [...(prev.attachments || []), ...files] 
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors['category'] = 'Please select a category';
    }

    if (!formData.description.trim()) {
      newErrors['description'] = 'Please provide a description';
    } else if (formData.description.trim().length < 10) {
      newErrors['description'] = 'Description must be at least 10 characters';
    }

    if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
      newErrors['contactEmail'] = 'Please enter a valid email address';
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
      // Create FormData for file uploads
      const submitData = new FormData();
      submitData.append('type', formData.type);
      submitData.append('category', formData.category);
      submitData.append('description', formData.description);
      submitData.append('priority', formData.priority);
      
      if (formData.restaurantId) {
        submitData.append('restaurantId', formData.restaurantId.toString());
      }
      if (formData.restaurantName) {
        submitData.append('restaurantName', formData.restaurantName);
      }
      if (formData.contactEmail) {
        submitData.append('contactEmail', formData.contactEmail);
      }

      // Add attachments
      formData.attachments?.forEach((file, _index) => {
        submitData.append(`attachment_${_index}`, file);
      });

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitStatus('success');
      
      // Track feedback submission
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.trackFeedbackSubmission(formData.type, formData.restaurantId, {
          category: formData.category,
          priority: formData.priority,
          has_attachments: formData.attachments && formData.attachments.length > 0,
        });
      }

      // Call custom onSubmit if provided
      if (onSubmit) {
        onSubmit(formData);
      }

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch {
      // // console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto ${className}`}>
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Thank You!
          </h3>
          <p className="text-gray-600">
            Your feedback has been submitted successfully. We&apos;ll review it and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Submit Feedback
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {restaurantName && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-1">Restaurant</h3>
          <p className="text-blue-700">{restaurantName}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['correction', 'suggestion', 'general'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleInputChange('type', type)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  formData.type === type
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors['category'] ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a category</option>
            {FEEDBACK_CATEGORIES[formData.type].map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
              </option>
            ))}
          </select>
                      {errors['category'] && (
              <p className="mt-1 text-sm text-red-600">{errors['category']}</p>
            )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => handleInputChange('priority', priority)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  formData.priority === priority
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            placeholder="Please provide detailed information about your feedback..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors['description'] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
                      {errors['description'] && (
              <p className="mt-1 text-sm text-red-600">{errors['description']}</p>
            )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/1000 characters
          </p>
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email (Optional)
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            placeholder="your@email.com"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors['contactEmail'] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
                      {errors['contactEmail'] && (
              <p className="mt-1 text-sm text-red-600">{errors['contactEmail']}</p>
            )}
          <p className="mt-1 text-xs text-gray-500">
            We&apos;ll use this to follow up on your feedback
          </p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments (Optional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Images, PDFs, or documents (max 5 files, 10MB total)
          </p>
          
          {/* File list */}
          {formData.attachments && formData.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.attachments.map((file, index) => (
                <div key={file.name || `file-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Status */}
        {submitStatus === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">
                Failed to submit feedback. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 
