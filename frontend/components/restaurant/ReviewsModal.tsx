'use client';

import { X, MessageCircle, ExternalLink, Plus, Filter, SortAsc, SortDesc } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Review } from '@/components/reviews/ReviewCard';
import ReviewForm, { ReviewData } from '@/components/reviews/ReviewForm';
import { StarRating } from '@/components/ui/StarRating';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Restaurant } from '@/lib/types/restaurant';

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

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
}

export default function ReviewsModal({ isOpen, onClose, restaurant }: ReviewsModalProps) {
  const [session, setSession] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // Sort and filter state
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'helpful'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'google' | 'user'>('all');
  const [showFilters, setShowFilters] = useState(false);

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
      // Attempt to repair common non-JSON formats
      try {
        let repaired = source.trim();
        repaired = repaired
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');

        if (/^[\[{][\s\S]*[\]}]$/.test(repaired)) {
          repaired = repaired
            .replace(/'([A-Za-z0-9_]+)'\s*:/g, '"$1":')
            .replace(/:\s*'([^']*)'/g, ': "$1"')
            .replace(/\['/g, '["')
            .replace(/'\]/g, '"]')
            .replace(/,\s*([}\]])/g, '$1');
        }

        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed)) { return parsed as GoogleReview[]; }
        if (parsed && Array.isArray((parsed as any).reviews)) { return (parsed as any).reviews; }
        return [];
      } catch {
        return [];
      }
    }
  }, [restaurant?.google_reviews]);

  // Fetch user reviews
  const fetchUserReviews = useCallback(async (pageNum = 0, append = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews?restaurantId=${restaurant.id}&limit=10&offset=${pageNum * 10}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reviews');
      }
      
      const data = await response.json();
      const newReviews = data.reviews || [];
      
      if (append) {
        setUserReviews(prev => [...prev, ...newReviews]);
      } else {
        setUserReviews(newReviews);
      }
      
      setHasMore(data.pagination?.hasMore || false);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  // Load reviews when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserReviews(0, false);
    }
  }, [isOpen, fetchUserReviews]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle review submission
  const handleReviewSubmit = async (reviewData: ReviewData) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: reviewData.restaurantId,
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content,
          images: reviewData.images,
          userId: session?.user?.email || 'anonymous',
          userName: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'Anonymous',
          userEmail: session?.user?.email || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      // Refresh reviews
      await fetchUserReviews(0, false);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  // Handle helpful vote
  const handleHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark review as helpful');
      }

      // Update the review in the list
      setUserReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful_count: (review.helpful_count || 0) + 1 }
          : review
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark review as helpful');
    }
  };

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
          
          {review.relative_time_description && (
            <p className="text-sm text-gray-500 mb-2">
              {review.relative_time_description}
            </p>
          )}
          
          <p className="text-gray-700 leading-relaxed">
            {review.text}
          </p>

          {/* Helpful button for user reviews */}
          {review.type === 'user' && (
            <div className="mt-2">
              <button
                onClick={() => handleHelpful(review.id)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Helpful ({review.helpful_count || 0})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Combine, filter, and sort reviews
  const combinedReviews: CombinedReview[] = React.useMemo(() => {
    const googleReviewsFormatted: CombinedReview[] = googleReviews.map((review, index) => ({
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

    const userReviewsFormatted: CombinedReview[] = userReviews.map(review => ({
      id: review.id,
      type: 'user' as const,
      author_name: review.user_name || 'Anonymous',
      rating: review.rating,
      text: review.content,
      date: review.created_at,
      profile_photo_url: undefined, // User reviews don't have profile photos
      helpful_count: review.helpful_count,
      user_id: review.user_id,
      status: review.status,
      title: review.title,
    }));

    // Combine all reviews
    let combined = [...googleReviewsFormatted, ...userReviewsFormatted];

    // Apply filters
    if (filterType !== 'all') {
      combined = combined.filter(review => review.type === filterType);
    }

    if (filterRating !== null) {
      combined = combined.filter(review => review.rating === filterRating);
    }

    // Apply sorting
    combined.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'helpful':
          const aHelpful = a.helpful_count || 0;
          const bHelpful = b.helpful_count || 0;
          comparison = aHelpful - bHelpful;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return combined;
  }, [googleReviews, userReviews, sortBy, sortOrder, filterRating, filterType]);

  const displayedReviews = showAllReviews ? combinedReviews : combinedReviews.slice(0, 6);
  const hasAnyReviews = combinedReviews.length > 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reviews & Ratings</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{restaurant.name}</span>
                {hasAnyReviews && (
                  <>
                    <span>•</span>
                    <span>{combinedReviews.length} review{combinedReviews.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort and Filter Controls */}
              {hasAnyReviews && (
                <>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      showFilters || filterRating !== null || filterType !== 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 rounded-md hover:bg-white transition-colors"
                      title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4 text-gray-600" />
                      ) : (
                        <SortDesc className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'rating' | 'helpful')}
                      className="bg-transparent text-sm font-medium text-gray-700 px-2 py-1.5 rounded-md hover:bg-white transition-colors cursor-pointer border-none outline-none"
                    >
                      <option value="date">Date</option>
                      <option value="rating">Rating</option>
                      <option value="helpful">Helpful</option>
                    </select>
                  </div>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && hasAnyReviews && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Filters</h4>
                <button
                  onClick={() => {
                    setFilterRating(null);
                    setFilterType('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              </div>
              
              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex flex-wrap gap-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterRating === rating
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span className={`text-lg ${filterRating === rating ? 'text-yellow-400' : 'text-gray-300'}`}>⭐</span>
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Review Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'All Reviews' },
                    { value: 'google', label: 'Google Reviews' },
                    { value: 'user', label: 'User Reviews' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFilterType(type.value as 'all' | 'google' | 'user')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterType === type.value
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading && !hasAnyReviews ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⏳</div>
              <p className="text-gray-500 text-lg font-medium mb-2">Loading reviews...</p>
            </div>
          ) : !hasAnyReviews && !loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⭐</div>
              <p className="text-gray-500 text-lg font-medium mb-2">No reviews yet</p>
              <p className="text-gray-400 text-sm mb-6">Be the first to share your experience!</p>
              {session && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Add Review
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Review Form */}
              {showForm && (
                <div className="mb-6">
                  <ReviewForm
                    restaurantId={parseInt(restaurant.id.toString())}
                    restaurantName={restaurant.name}
                    onSubmit={handleReviewSubmit}
                    onCancel={() => {
                      setShowForm(false);
                    }}
                  />
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {displayedReviews.map((review) => renderCombinedReview(review))}
              </div>

              {/* Show More/Less Button */}
              {combinedReviews.length > 6 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    {showAllReviews ? 'Show less' : `Show all ${combinedReviews.length} reviews`}
                  </button>
                </div>
              )}

              {/* Load More Button for User Reviews */}
              {hasMore && showAllReviews && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fetchUserReviews(page + 1, true)}
                    disabled={loading}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More Reviews'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {session && hasAnyReviews && !showForm && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Write a Review</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
