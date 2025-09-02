'use client';

import React, { useState } from 'react';
import { X, Star, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import ReviewCard, { Review } from '../reviews/ReviewCard';
import ReviewForm, { ReviewData } from '../reviews/ReviewForm';

interface ReviewsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: number;
  restaurantName: string;
  reviews: Review[];
  className?: string;
}

export default function ReviewsPopup({ 
  isOpen, 
  onClose, 
  restaurantId, 
  restaurantName, 
  reviews, 
  className = '' 
}: ReviewsPopupProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentReviews, setCurrentReviews] = useState<Review[]>(reviews);

  const handleAddReview = async (reviewData: ReviewData) => {
    try {
      // In a real app, this would submit to the API
      const newReview: Review = {
        id: Date.now().toString(),
        restaurant_id: reviewData.restaurantId,
        user_id: 'current-user', // Would come from auth context
        user_name: 'Current User', // Would come from auth context
        user_email: 'user@example.com', // Would come from auth context
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        images: [], // Would handle image upload to storage
        status: 'pending',
        created_at: new Date().toISOString(),
        helpful_count: 0,
        report_count: 0,
        verified_purchase: false
      };

      setCurrentReviews(prev => [newReview, ...prev]);
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  };

  const handleHelpful = (reviewId: string) => {
    setCurrentReviews(prev => 
      prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful_count: review.helpful_count + 1 }
          : review
      )
    );
  };

  const handleReport = (reviewId: string) => {
    setCurrentReviews(prev => 
      prev.map(review => 
        review.id === reviewId 
          ? { ...review, report_count: review.report_count + 1 }
          : review
      )
    );
  };

  const calculateAverageRating = () => {
    if (currentReviews.length === 0) return 0;
    const total = currentReviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / currentReviews.length) * 10) / 10;
  };

  const averageRating = calculateAverageRating();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        className
      )}>
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
                <p className="text-sm text-gray-600">{restaurantName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Rating Summary */}
              {currentReviews.length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          'w-4 h-4',
                          index < Math.round(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {averageRating} ({currentReviews.length} reviews)
                  </span>
                </div>
              )}

              {/* Add Review Button */}
              <button
                onClick={() => setShowReviewForm(true)}
                className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Write Review</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {currentReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                <p className="text-gray-600 mb-6">Be the first to share your experience with this restaurant!</p>
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Write the First Review</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentReviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onHelpful={handleHelpful}
                    onReport={handleReport}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onSubmit={handleAddReview}
          onClose={() => setShowReviewForm(false)}
        />
      )}
    </>
  );
}
