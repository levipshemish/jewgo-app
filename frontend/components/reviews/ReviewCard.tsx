'use client';

import React from 'react';
import { Star, ThumbsUp, Flag, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface Review {
  id: string;
  restaurant_id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  updated_at?: string;
  helpful_count: number;
  report_count: number;
  verified_purchase: boolean;
  moderator_notes?: string;
}

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  className?: string;
  showActions?: boolean;
}

export default function ReviewCard({ 
  review, 
  onHelpful, 
  onReport, 
  className = '',
  showActions = true 
}: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={`rev-${review.id}-star-${index}`}
        className={cn(
          'w-4 h-4',
          index < rating 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'fill-gray-200 text-gray-200'
        )}
      />
    ));
  };

  const handleHelpful = () => {
    if (onHelpful) {
      onHelpful(review.id);
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport(review.id);
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow',
      className
    )}>
      {/* Review Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{review.user_name}</div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(review.created_at)}</span>
              {review.verified_purchase && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Verified Purchase
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex items-center space-x-1">
          {renderStars(review.rating)}
          <span className="ml-2 text-sm font-medium text-gray-900">
            {review.rating}/5
          </span>
        </div>
      </div>

      {/* Review Content */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}
      
      <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {review.images.map((image, index) => (
            <img
              key={image || `img-${index}`}
              src={image}
              alt={`Review image ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            />
          ))}
        </div>
      )}

      {/* Review Actions */}
      {showActions && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleHelpful}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Helpful ({review.helpful_count})</span>
            </button>
            
            <button
              onClick={handleReport}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              <Flag className="w-4 h-4" />
              <span>Report</span>
            </button>
          </div>

          {/* Status Badge */}
          {review.status !== 'approved' && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              review.status === 'pending' && 'bg-yellow-100 text-yellow-800',
              review.status === 'rejected' && 'bg-red-100 text-red-800',
              review.status === 'flagged' && 'bg-orange-100 text-orange-800'
            )}>
              {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
