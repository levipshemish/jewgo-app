'use client';

import React, { useState } from 'react';
import { Star, X, Upload, Image as ImageIcon } from 'lucide-react';
import { LoadingButton } from '@/components/ui/LoadingStates';
import { cn } from '@/lib/utils/cn';

export interface ReviewData {
  restaurantId: number;
  rating: number;
  title: string;
  content: string;
  images: File[];
}

interface ReviewFormProps {
  restaurantId: number;
  restaurantName: string;
  onSubmit: (data: ReviewData) => Promise<void>;
  onClose: () => void;
  className?: string;
}

export default function ReviewForm({ 
  restaurantId, 
  restaurantName, 
  onSubmit, 
  onClose, 
  className = '' 
}: ReviewFormProps) {
  const [formData, setFormData] = useState<ReviewData>({
    restaurantId,
    rating: 0,
    title: '',
    content: '',
    images: []
  });
  
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: '' }));
    }
  };

  const handleInputChange = (field: keyof Omit<ReviewData, 'restaurantId' | 'rating' | 'images'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        setErrors(prev => ({ ...prev, images: 'Please select only image files' }));
        return false;
      }
      
      if (!isValidSize) {
        setErrors(prev => ({ ...prev, images: 'Image size must be less than 5MB' }));
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...validFiles] }));
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Please provide a title for your review';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Please provide a review';
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'Review must be at least 10 characters';
    }

    if (formData.images.length > 5) {
      newErrors.images = 'Maximum 5 images allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to submit review. Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoveredRating || formData.rating);
      
      return (
        <button
          key={index}
          type="button"
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
          onClick={() => handleRatingChange(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
        >
          <Star
            className={cn(
              'w-8 h-8 transition-colors',
              isFilled 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'fill-gray-200 text-gray-200 hover:fill-yellow-300 hover:text-yellow-300'
            )}
          />
        </button>
      );
    });
  };

  return (
    <div className={cn(
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50',
      className
    )}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Write a Review</h2>
            <p className="text-sm text-gray-600">{restaurantName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating *
            </label>
            <div className="flex items-center space-x-2">
              {renderStars()}
              <span className="ml-3 text-sm text-gray-600">
                {formData.rating > 0 ? `${formData.rating} out of 5` : 'Select rating'}
              </span>
            </div>
            {errors.rating && (
              <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Summarize your experience"
              maxLength={100}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Review *
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your experience with this restaurant..."
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content && (
                <p className="text-sm text-red-600">{errors.content}</p>
              )}
              <span className="text-sm text-gray-500 ml-auto">
                {formData.content.length}/1000
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (Optional)
            </label>
            <div className="space-y-3">
              {/* Upload Button */}
              {formData.images.length < 5 && (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-600">Upload photos</span>
                    <span className="text-xs text-gray-500">Max 5 images, 5MB each</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* Image Preview */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Review image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.images && (
                <p className="text-sm text-red-600">{errors.images}</p>
              )}
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <p className="text-sm text-red-600">{errors.submit}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <LoadingButton
              onClick={() => handleSubmit({} as React.FormEvent)}
              loading={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit Review
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
