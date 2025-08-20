'use client';

import { Star, Upload, X, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';
import { isSupabaseConfigured, handleUserLoadError } from '@/lib/utils/auth-utils';

// NextAuth removed - using Supabase only

interface ReviewFormProps {
  restaurantId: number;
  restaurantName: string;
  onSubmit: (review: ReviewData) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export interface ReviewData {
  restaurantId: number;
  rating: number;
  title?: string;
  content: string;
  images: string[];
}

export default function ReviewForm({
  restaurantId, restaurantName, onSubmit, onCancel, className = ''
}: ReviewFormProps) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get Supabase session using centralized approach
  useEffect(() => {
    const getSession = async () => {
      try {
        // Use centralized configuration check
        if (!isSupabaseConfigured()) {
          console.log('[ReviewForm] Supabase not configured');
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabaseBrowser.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error getting session:', error);
        handleUserLoadError(error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
    if (errors['rating']) {
      setErrors(prev => ({ ...prev, rating: '' }));
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    
    if (errors['content']) {
      setErrors(prev => ({ ...prev, content: '' }));
    }
    
    // Character count validation
    if (value.length < 10) {
      setErrors(prev => ({ 
        ...prev, 
        content: 'Review must be at least 10 characters long' 
      }));
    } else if (value.length > 2000) {
      setErrors(prev => ({ 
        ...prev, 
        content: 'Review must be less than 2000 characters' 
      }));
    } else {
      setErrors(prev => ({ ...prev, content: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      return;
    }

    // Limit to 5 images
    if (images.length + files.length > 5) {
      setErrors(prev => ({ 
        ...prev, 
        images: 'Maximum 5 images allowed' 
      }));
      return;
    }

    Array.from(files).forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ 
          ...prev, 
          images: 'Only image files are allowed' 
        }));
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ 
          ...prev, 
          images: 'Image size must be less than 5MB' 
        }));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImages(prev => [...prev, result]);
        setErrors(prev => ({ ...prev, images: '' }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors['rating'] = 'Please select a rating';
    }

    if (content.length < 10) {
      newErrors['content'] = 'Review must be at least 10 characters long';
    }

    if (content.length > 2000) {
      newErrors['content'] = 'Review must be less than 2000 characters';
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
      await onSubmit({
        restaurantId,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        images
      });
    } catch {
      // // console.error('Error submitting review:', error);
      setErrors(prev => ({ 
        ...prev, 
        submit: 'Failed to submit review. Please try again.' 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white border rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/';
    return (
      <div className={`bg-white border rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please sign in to write a review for {restaurantName}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push(`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Sign Up
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Write a Review for {restaurantName}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingClick(star)}
                className="text-2xl text-gray-300 hover:text-yellow-400 transition-colors"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating ? 'text-yellow-400 fill-current' : ''
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Select rating'}
            </span>
          </div>
          {errors['rating'] && (
            <p className="mt-1 text-sm text-red-600">{errors['rating']}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Summarize your experience..."
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Content *
          </label>
          <textarea
            value={content}
            onChange={handleContentChange}
            rows={6}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Share your experience with this restaurant..."
          />
          <div className="flex justify-between items-center mt-1">
            {errors['content'] && (
              <p className="text-sm text-red-600">{errors['content']}</p>
            )}
            <span className="text-sm text-gray-500 ml-auto">
              {content.length}/2000
            </span>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Photos (Optional)
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Upload Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-500">
                {images.length}/5 images
              </span>
            </div>
            
            {errors['images'] && (
              <p className="text-sm text-red-600">{errors['images']}</p>
            )}

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Review image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors['submit'] && (
          <p className="text-sm text-red-600">{errors['submit']}</p>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
