'use client';

import { Plus, MessageCircle, ExternalLink } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { StarRating } from '@/components/ui/StarRating';
import { supabaseBrowser } from '@/lib/supabase/client';
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
  const [session, setSession] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Get Supabase session
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error getting session:', error);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Safe JSON parsing for potentially malformed Google reviews payloads
  const googleReviews: GoogleReview[] = React.useMemo(() => {
    const source = restaurant?.google_reviews;
    if (!source) { return []; }
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) { return parsed as GoogleReview[]; }
      if (parsed && Array.isArray((parsed as any).reviews)) { return (parsed as any).reviews; }
      return [];
    } catch {
      // Attempt to repair common non-JSON formats (e.g., Python dict string with single quotes, True/False/None)
      try {
        let repaired = source.trim();
        // Normalize Python literals to JSON
        repaired = repaired
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');

        // More permissive wrapper match that handles newlines
        if (/^[\[{][\s\S]*[\]}]$/.test(repaired)) {
          repaired = repaired
            // Replace property name quotes 'key': -> "key":
            .replace(/'([A-Za-z0-9_]+)'\s*:/g, '"$1":')
            // Replace string quotes 'value' -> "value" (only for simple tokens)
            .replace(/:\s*'([^']*)'/g, ': "$1"')
            // Arrays with single-quoted strings
            .replace(/\['/g, '["')
            .replace(/'\]/g, '"]')
            // Remove trailing commas before object/array close
            .replace(/,\s*([}\]])/g, '$1');
        }

        const reparsed = JSON.parse(repaired);
        if (Array.isArray(reparsed)) { return reparsed as GoogleReview[]; }
        if (reparsed && Array.isArray((reparsed as any).reviews)) { return (reparsed as any).reviews; }
        return [];
      } catch {
        // Silently fall back to empty in production
        return [];
      }
    }
  }, [restaurant?.google_reviews]);

  // Combine and sort all reviews
  const combinedReviews: CombinedReview[] = React.useMemo(() => {
    const combined: CombinedReview[] = [];

    // Add Google reviews
    googleReviews.forEach((review, index) => {
      combined.push({
        id: `google-${index}`,
        type: 'google' as const,
        author_name: review.author_name || review.user?.name || 'Anonymous',
        rating: review.rating || 0,
        text: review.text,
        date: review.relative_time_description || new Date(review.time * 1000).toLocaleDateString(),
        profile_photo_url: review.profile_photo_url || review.user?.image_url,
        author_url: review.author_url,
        relative_time_description: review.relative_time_description,
      });
    });

    // Add user reviews
    userReviews.forEach((_review) => {
      combined.push({
        id: _review.id,
        type: 'user' as const,
        author_name: _review.user_name || 'Anonymous',
        rating: _review.rating,
        text: _review.content,
        date: new Date(_review.created_at).toLocaleDateString(),
        profile_photo_url: undefined, // User reviews don't have profile photos in this interface
        helpful_count: _review.helpful_count,
        user_id: _review.user_id,
        status: _review.status,
        title: _review.title,
      });
    });

    // Sort by date (newest first) and then by type (Google reviews first)
    return combined.sort((a, b) => {
      // Sort by type first (Google reviews first)
      if (a.type !== b.type) {
        return a.type === 'google' ? -1 : 1;
      }
      // Then by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [googleReviews, userReviews]);

  // Get reviews to display (all or limited)
  const displayedReviews = showAllReviews ? combinedReviews : combinedReviews.slice(0, 6);

  const fetchReviews = useCallback(async (pageNum = 0, append = false) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reviews?restaurantId=${restaurantId}&status=approved&limit=10&offset=${pageNum * 10}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          // Reviews API not available - show a friendly message
          setUserReviews([]);
          setError('User reviews feature is temporarily unavailable. Please check back later.');
          return;
        }
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      
      if (append) {
        setUserReviews(prev => [...prev, ...data.reviews]);
      } else {
        setUserReviews(data.reviews);
      }
      
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch {
      // eslint-disable-next-line no-console
      // // console.error('Error fetching reviews:', error);
      setError('Failed to load user reviews');
      setUserReviews([]); // Ensure userReviews is set to empty array on error
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchReviews();
  }, [restaurantId, fetchReviews]);

  const handleSubmitReview = async (reviewData: ReviewData) => {
    try {
      setError(null);

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...reviewData,
          userId: session?.user?.email || 'anonymous',
          userName: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'Anonymous',
          userEmail: session?.user?.email || '',
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Reviews feature is temporarily unavailable. Please check back later.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      const result = await response.json();
      // Add the new review to the list (it will be pending)
      setUserReviews(prev => [result.review, ...prev]);
      setShowForm(false);
      
      // Show success message
      alert('Review submitted successfully! It will be reviewed by our team before being published.');
      
    } catch (error) {
      // eslint-disable-next-line no-console
      // // console.error('Error submitting review:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit review');
    }
  };

  const handleUpdateReview = async (reviewData: ReviewData) => {
    if (!editingReview) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`/api/reviews/${editingReview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update review');
      }

      const result = await response.json();
      // Update the review in the list
      setUserReviews(prev => prev.map(review => 
        review.id === editingReview.id ? result.review : review
      ));
      setEditingReview(null);
      
    } catch (error) {
      // // console.error('Error updating review:', error);
      setError(error instanceof Error ? error.message : 'Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete review');
      }

      // Remove the review from the list
      setUserReviews(prev => prev.filter(review => review.id !== reviewId));
      
    } catch (error) {
      // // console.error('Error deleting review:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete review');
    }
  };

  const handleFlagReview = async (reviewId: string, reason: string, description?: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to flag review');
      }

      alert('Review reported successfully. Thank you for helping keep our community safe.');
      
    } catch (error) {
      // // console.error('Error flagging review:', error);
      setError(error instanceof Error ? error.message : 'Failed to flag review');
    }
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark review as helpful');
      }

      const result = await response.json();
      // Update the review in the list
      setUserReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful_count: result.helpful_count }
          : review
      ));
      
    } catch (error) {
      // // console.error('Error marking review as helpful:', error);
      setError(error instanceof Error ? error.message : 'Failed to mark review as helpful');
    }
  };

  const loadMoreReviews = () => {
    if (hasMore && !loading) {
      fetchReviews(page + 1, true);
    }
  };

  // Calculate average rating from all reviews
  const averageRating = combinedReviews.length > 0 
    ? combinedReviews.reduce((sum, review) => sum + review.rating, 0) / combinedReviews.length 
    : 0;

  const userReview = userReviews.find(review => review.user_id === (session as any)?.user?.email);

  // Using unified StarRating component

  // Render a combined review
  const renderCombinedReview = (review: CombinedReview) => (
    <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
      <div className="flex items-start space-x-3">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          <img
            src={review.profile_photo_url || '/default-avatar.svg'}
            alt={review.author_name}
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
              {review.author_name}
            </span>
            <div className="flex items-center">
              <StarRating rating={review.rating} showHalfStars={true} />
            </div>
            {review.type === 'google' && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-blue-600 font-medium">Google</span>
                {review.author_url && (
                  <a
                    href={review.author_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-500 mb-2">
            {review.date}
          </p>
          
          {review.title && (
            <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
          )}
          
          <p className="text-gray-700 leading-relaxed">
            {review.text}
          </p>

          {/* User review specific actions */}
          {review.type === 'user' && review.helpful_count !== undefined && (
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
              <button
                onClick={() => handleHelpful(review.id)}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <span>👍</span>
                <span>{review.helpful_count} helpful</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Reviews Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-gray-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Reviews</h3>
            {combinedReviews.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="text-lg text-yellow-400">⭐</span>
                  <span className="ml-1">{averageRating.toFixed(1)}</span>
                </div>
                <span>•</span>
                <span>{combinedReviews.length} review{combinedReviews.length !== 1 ? 's' : ''}</span>
                {googleReviews.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{googleReviews.length} from Google</span>
                  </>
                )}
                {userReviews.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">{userReviews.length} from community</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Write Review Button (always visible; prompts sign-in if needed) */}
        {!userReview && (
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <ReviewForm
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onSubmit={handleSubmitReview}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit Review Form */}
      {editingReview && (
        <ReviewForm
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onSubmit={handleUpdateReview}
          onCancel={() => setEditingReview(null)}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && page === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading reviews...</p>
          </div>
        ) : combinedReviews.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No reviews yet</p>
            {(session as any) && (
              <p className="text-sm text-gray-500 mt-1">
                Be the first to review {restaurantName}
              </p>
            )}
          </div>
        ) : (
          <>
            {displayedReviews.map((review) => renderCombinedReview(review))}

            {/* Show More/Less Button */}
            {combinedReviews.length > 6 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {showAllReviews ? 'Show Less' : `Show All ${combinedReviews.length} Reviews`}
                </button>
              </div>
            )}

            {/* Load More User Reviews Button */}
            {hasMore && showAllReviews && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMoreReviews}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More User Reviews'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
