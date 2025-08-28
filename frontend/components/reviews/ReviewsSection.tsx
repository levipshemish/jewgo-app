'use client';

import { Plus, MessageCircle, ExternalLink } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';

import { StarRating } from '@/components/ui/StarRating';
import { supabaseClient } from '@/lib/supabase/client-secure';
import { isSupabaseConfigured, handleUserLoadError } from '@/lib/utils/auth-utils';
import { Restaurant } from '@/lib/types/restaurant';

import ReviewCard, { Review } from './ReviewCard';
import ReviewForm, { ReviewData } from './ReviewForm';

// Google Review interface
interface GoogleReview {
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

// Combined review interface for unified display
interface CombinedReview {
  id: string;
  type: 'google' | 'user';
  author_name: string;
  rating: number;
  text: string;
  date: string;
  profile_photo_url?: string;
  helpful_count?: number;
  user_id?: string;
  status?: string;
  // Google-specific fields
  author_url?: string;
  relative_time_description?: string;
  // User-specific fields
  title?: string;
}

interface ReviewsSectionProps {
  restaurantId: number;
  restaurantName: string;
  restaurant?: Restaurant; // Add restaurant data to access Google reviews
  className?: string;
}

export default function ReviewsSection({
  restaurantId, restaurantName, restaurant, className = ''
}: ReviewsSectionProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Get Supabase session using centralized approach
  useEffect(() => {
    const getSession = async () => {
      try {
        // Use centralized configuration check
        if (!isSupabaseConfigured()) {

          setLoading(false);
          return;
        }

        const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
        setSession(currentSession);
      } catch (error) {
        console.error('Error getting session:', error);
        handleUserLoadError(error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event: string, authSession: Session | null) => {
      setSession(authSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safe JSON parsing for potentially malformed Google reviews payloads
  const googleReviews: GoogleReview[] = React.useMemo(() => {
    const source = restaurant?.google_reviews;
    if (!source) { return []; }
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) { return parsed as GoogleReview[]; }
      return [];
    } catch {
      return [];
    }
  }, [restaurant?.google_reviews]);

  // Load user reviews
  const loadUserReviews = useCallback(async (pageNum: number = 0) => {
    try {
      const response = await fetch(`/api/reviews?restaurantId=${restaurantId}&page=${pageNum}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to load reviews');
      }
      
      const data = await response.json();
      const newReviews = data.reviews || [];
      
      if (pageNum === 0) {
        setUserReviews(newReviews);
      } else {
        setUserReviews(prev => [...prev, ...newReviews]);
      }
      
      setHasMore(newReviews.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setError('Failed to load reviews');
    }
  }, [restaurantId]);

  // Load initial reviews
  useEffect(() => {
    loadUserReviews();
  }, [loadUserReviews]);

  // Handle review submission
  const handleSubmitReview = async (reviewData: ReviewData) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...reviewData,
          restaurantName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Reload reviews to show the new one
      await loadUserReviews();
      setShowForm(false);
      setEditingReview(null);
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  // Handle review update
  const handleUpdateReview = async (reviewData: ReviewData) => {
    if (!editingReview) {return;}

    try {
      const response = await fetch(`/api/reviews/${editingReview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error('Failed to update review');
      }

      // Reload reviews to show the updated one
      await loadUserReviews();
      setShowForm(false);
      setEditingReview(null);
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  };

  // Handle review deletion
  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      // Remove the review from the list
      setUserReviews(prev => prev.filter(review => review.id !== reviewId));
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  };

  // Handle helpful vote
  const handleHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark review as helpful');
      }

      // Update the review in the list
      setUserReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful_count: review.helpful_count + 1 }
          : review
      ));
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      throw error;
    }
  };

  // Handle review flagging
  const handleFlag = async (reviewId: string, reason: string, description?: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to flag review');
      }
    } catch (error) {
      console.error('Error flagging review:', error);
      throw error;
    }
  };

  // Combine and sort reviews
  const combinedReviews: CombinedReview[] = React.useMemo(() => {
    const userReviewsCombined: CombinedReview[] = userReviews.map(review => ({
      id: review.id,
      type: 'user' as const,
      author_name: review.user_name,
      rating: review.rating,
      text: review.content,
      date: review.created_at,
      helpful_count: review.helpful_count,
      user_id: review.user_id,
      status: review.status,
      title: review.title,
    }));

    const googleReviewsCombined: CombinedReview[] = googleReviews.map((review, index) => ({
      id: `google-${index}`,
      type: 'google' as const,
      author_name: review.author_name || 'Anonymous',
      rating: review.rating || 0,
      text: review.text,
      date: new Date(review.time * 1000).toISOString(),
      profile_photo_url: review.profile_photo_url,
      author_url: review.author_url,
      relative_time_description: review.relative_time_description,
    }));

    return [...userReviewsCombined, ...googleReviewsCombined].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [userReviews, googleReviews]);

  // Show limited reviews initially
  const displayedReviews = showAllReviews ? combinedReviews : combinedReviews.slice(0, 5);

  if (loading) {
    return (
      <div className={`bg-white border rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
          <p className="text-sm text-gray-600">
            {combinedReviews.length} total reviews
          </p>
        </div>
        
        {session && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Write Review
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="mb-6">
          <ReviewForm
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            onSubmit={editingReview ? handleUpdateReview : handleSubmitReview}
            onCancel={() => {
              setShowForm(false);
              setEditingReview(null);
            }}
          />
        </div>
      )}

      {/* Reviews List */}
      {displayedReviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No reviews yet</p>
          {session && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-700 underline"
            >
              Be the first to write a review
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg p-4">
              {review.type === 'google' ? (
                // Google Review Display
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    {review.profile_photo_url && (
                      <img
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{review.author_name}</span>
                        {review.author_url && (
                          <a
                            href={review.author_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <StarRating rating={review.rating} />
                        <span>{review.relative_time_description}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700">{review.text}</p>
                </div>
              ) : (
                // User Review Display
                <ReviewCard
                  review={review as unknown as Review}
                  onHelpful={handleHelpful}
                  onFlag={handleFlag}
                  onEdit={(review) => {
                    setEditingReview(review);
                    setShowForm(true);
                  }}
                  onDelete={handleDeleteReview}
                  showActions={session?.user?.id === review.user_id}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!showAllReviews && combinedReviews.length > 5 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAllReviews(true)}
            className="px-4 py-2 text-blue-600 hover:text-blue-700 underline"
          >
            Show all {combinedReviews.length} reviews
          </button>
        </div>
      )}

      {/* Load More User Reviews */}
      {showAllReviews && hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => loadUserReviews(page + 1)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
}
