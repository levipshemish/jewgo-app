'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Star, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import ReviewCard, { Review } from './ReviewCard';
import ReviewForm, { ReviewData } from './ReviewForm';

interface ReviewsProps {
  restaurantId: number;
  restaurantName: string;
  className?: string;
  showAddReview?: boolean;
  maxReviews?: number;
}

export default function Reviews({ 
  restaurantId, 
  restaurantName, 
  className = '',
  showAddReview = true,
  maxReviews = 10
}: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock reviews data - in a real app, this would come from an API
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data - replace with actual API call
        const mockReviews: Review[] = [
          {
            id: '1',
            restaurant_id: restaurantId,
            user_id: 'user1',
            user_name: 'Sarah Cohen',
            user_email: 'sarah@example.com',
            rating: 5,
            title: 'Amazing Kosher Experience!',
            content: 'The food was absolutely delicious and the service was outstanding. The kosher certification made me feel confident about the meal. Highly recommend the falafel wrap!',
            images: [],
            status: 'approved',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            helpful_count: 12,
            report_count: 0,
            verified_purchase: true
          },
          {
            id: '2',
            restaurant_id: restaurantId,
            user_id: 'user2',
            user_name: 'David Levy',
            user_email: 'david@example.com',
            rating: 4,
            title: 'Great Food, Friendly Staff',
            content: 'Really enjoyed the meal here. The hummus was creamy and the pita was fresh. Staff was very accommodating with our dietary restrictions.',
            images: [],
            status: 'approved',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            helpful_count: 8,
            report_count: 0,
            verified_purchase: true
          },
          {
            id: '3',
            restaurant_id: restaurantId,
            user_id: 'user3',
            user_name: 'Rachel Green',
            user_email: 'rachel@example.com',
            rating: 5,
            title: 'Perfect for Family Dining',
            content: 'Brought the whole family here and everyone loved it. The kids menu options were great and the portions were generous. Will definitely be back!',
            images: [],
            status: 'approved',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            helpful_count: 15,
            report_count: 0,
            verified_purchase: true
          }
        ];
        
        setReviews(mockReviews);
        setError(null);
      } catch (err) {
        setError('Failed to load reviews');
        console.error('Error loading reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [restaurantId]);

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

      setReviews(prev => [newReview, ...prev]);
      setShowReviewForm(false);
    } catch (err) {
      console.error('Error adding review:', err);
      throw err;
    }
  };

  const handleHelpful = (reviewId: string) => {
    setReviews(prev => 
      prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful_count: review.helpful_count + 1 }
          : review
      )
    );
  };

  const handleReport = (reviewId: string) => {
    setReviews(prev => 
      prev.map(review => 
        review.id === reviewId 
          ? { ...review, report_count: review.report_count + 1 }
          : review
      )
    );
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  };

  const averageRating = calculateAverageRating();
  const displayedReviews = reviews.slice(0, maxReviews);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Reviews</span>
          </h3>
          {reviews.length > 0 && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={`${restaurantId}-avg-star-${index}`}
                    className={cn(
                      'w-4 h-4',
                      index < Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {averageRating} ({reviews.length} reviews)
              </span>
            </div>
          )}
        </div>

        {showAddReview && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Write a Review</span>
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
          <p className="text-gray-600 mb-4">Be the first to share your experience with this restaurant!</p>
          {showAddReview && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Write the First Review</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={handleHelpful}
              onReport={handleReport}
            />
          ))}
          
          {reviews.length > maxReviews && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">
                Showing {maxReviews} of {reviews.length} reviews
              </p>
            </div>
          )}
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onSubmit={handleAddReview}
          onClose={() => setShowReviewForm(false)}
        />
      )}
    </div>
  );
}
