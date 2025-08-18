'use client';

import React, { useState } from 'react';
import { Restaurant } from '@/lib/types/restaurant';
import { StarRating } from '@/components/ui/StarRating';

interface Review {
  author_name?: string;
  author_url?: string;
  language?: string;
  profile_photo_url?: string;
  rating?: number;
  relative_time_description?: string;
  text: string;
  time: number;
  translated?: boolean;
  user?: {
    id: string;
    profile_url: string;
    image_url: string;
    name: string;
  };
}

interface ReviewsProps {
  restaurant: Restaurant;
  onWriteReview?: () => void;
}

const Reviews: React.FC<ReviewsProps> = ({ restaurant, onWriteReview }) => {
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Parse review JSON strings with safety
  let googleReviews: Review[] = [];
  if (restaurant.google_reviews) {
    try {
      // Some backends may send an already-parsed array
      const raw = restaurant.google_reviews as unknown as string;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        googleReviews = parsed as Review[];
      }
    } catch (_err) {
      // Silently ignore malformed JSON
      googleReviews = [];
    }
  }

  const hasGoogleReviews = googleReviews.length > 0;
  const hasAnyReviews = hasGoogleReviews;

  if (!hasAnyReviews) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Reviews & Ratings</h2>
          {onWriteReview && (
            <button
              onClick={onWriteReview}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Write Review
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">⭐</div>
          <p className="text-gray-500 text-lg font-medium mb-2">No reviews yet</p>
          <p className="text-gray-400 text-sm mb-6">Be the first to share your experience!</p>
          {onWriteReview && (
            <button
              onClick={onWriteReview}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Add Review
            </button>
          )}
        </div>
      </div>
    );
  }

  // Using unified StarRating component

  const renderReview = (review: Review, index: number) => (
    <div key={index} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
      <div className="flex items-start space-x-3">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          <img
            src={review.profile_photo_url || review.user?.image_url || '/default-avatar.svg'}
            alt={review.author_name || review.user?.name || 'Reviewer'}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/default-avatar.svg';
            }}
          />
        </div>
        
        {/* Review Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900 truncate">
              {review.author_name || review.user?.name || 'Anonymous'}
            </span>
            <div className="flex items-center">
              <StarRating rating={review.rating || 0} showHalfStars={true} />
            </div>
          </div>
          
          {review.relative_time_description && (
            <p className="text-sm text-gray-500 mb-2">
              {review.relative_time_description}
            </p>
          )}
          
          <p className="text-gray-700 leading-relaxed">
            {review.text}
          </p>
        </div>
      </div>
    </div>
  );

  const displayedReviews = showAllReviews ? googleReviews : googleReviews.slice(0, 3);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Reviews & Ratings</h2>
        {onWriteReview && (
          <button
            onClick={onWriteReview}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Write Review
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {displayedReviews.map((review, index) => renderReview(review, index))}
      </div>
      
      {googleReviews.length > 3 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="text-green-600 hover:text-green-700 font-medium text-sm"
          >
            {showAllReviews ? 'Show less' : `Show all ${googleReviews.length} reviews`}
          </button>
        </div>
      )}
    </div>
  );
};

export default Reviews; 