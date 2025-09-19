"use client"

import { Button } from "@/components/ui/button"
import { ProfileImage } from "@/components/ui/profile-image"
import { Star, X, ChevronDown, MessageSquare, Send, ArrowLeft, LogIn } from "lucide-react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { submitReview, setAuthCheckCallback } from "@/lib/api/review-api"
import { useAuth } from "@/contexts/AuthContext"
import { SessionStatus } from "@/components/auth/SessionStatus"

interface Review {
  id: string
  user: string
  rating: number
  comment: string
  date: string
  source?: 'user' | 'google'
  profile_photo_url?: string | null
  relative_time_description?: string | null
}

interface ReviewsPopupProps {
  isOpen: boolean
  onClose: () => void
  restaurantName: string
  averageRating: number
  totalReviews: number
  reviews: Review[]
  restaurantId?: number
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
    currentPage: number
    totalPages: number
  }
  onLoadMore?: () => void
  loading?: boolean
  onSubmitReview?: (review: { rating: number; comment: string }) => Promise<void>
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'

// Helper function to format relative dates
function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch (_error) {
    return 'Recently';
  }
}

export function ReviewsPopup({
  isOpen,
  onClose,
  restaurantName,
  averageRating,
  totalReviews,
  reviews,
  restaurantId,
  pagination,
  onLoadMore,
  loading = false,
  onSubmitReview,
}: ReviewsPopupProps) {
  const { user: _user, isAuthenticated } = useAuth()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [_submitSuccess, setSubmitSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Set up auth callback for the review API
  useEffect(() => {
    setAuthCheckCallback(isAuthenticated)
  }, [isAuthenticated])

  if (!isOpen) return null

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? "text-yellow-500 fill-yellow-500" 
            : i < rating 
            ? "text-yellow-500 fill-yellow-500/50" 
            : "text-gray-300"
        }`}
      />
    ))
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'highest', label: 'Highest Rated' },
    { value: 'lowest', label: 'Lowest Rated' },
  ]

  const getSortedReviews = () => {
    const sortedReviews = [...reviews]
    
    switch (sortBy) {
      case 'newest':
        return sortedReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      case 'oldest':
        return sortedReviews.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      case 'highest':
        return sortedReviews.sort((a, b) => b.rating - a.rating)
      case 'lowest':
        return sortedReviews.sort((a, b) => a.rating - b.rating)
      default:
        return sortedReviews
    }
  }

  const handleWriteReview = () => {
    if (!isAuthenticated()) {
      setShowLoginPrompt(true)
      return
    }
    
    setShowReviewForm(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    setSuccessMessage(null)
    setShowLoginPrompt(false)
  }

  const handleBackToReviews = () => {
    setShowReviewForm(false)
    setReviewRating(0)
    setReviewComment('')
    setSubmitError(null)
    setSubmitSuccess(false)
    setSuccessMessage(null)
    setShowLoginPrompt(false)
  }

  const handleSubmitReview = async () => {
    setSubmitError(null)
    setSubmitSuccess(false)
    setSuccessMessage(null)
    
    if (reviewRating === 0) {
      setSubmitError('Please select a rating')
      return
    }
    
    if (!reviewComment.trim()) {
      setSubmitError('Please write a comment')
      return
    }

    if (!restaurantId) {
      setSubmitError('Unable to submit review: Restaurant ID is missing')
      return
    }

    setIsSubmitting(true)
    try {
      // Use the actual API if no custom onSubmitReview handler is provided
      if (onSubmitReview) {
        await onSubmitReview({
          rating: reviewRating,
          comment: reviewComment.trim()
        })
        setSubmitSuccess(true)
        setSuccessMessage('Review submitted successfully!')
      } else {
        // Submit to the backend API
        const reviewData = {
          rating: reviewRating,
          content: reviewComment.trim(),
          entity_type: 'restaurants' as const,
          entity_id: restaurantId
        }
        
        const response = await submitReview(reviewData)
        setSubmitSuccess(true)
        
        // Show success message based on moderation status
        if (response.moderation_status === 'approved') {
          setSuccessMessage('Review submitted successfully and is now live!')
        } else if (response.moderation_status === 'pending') {
          setSuccessMessage('Review submitted successfully and is pending approval.')
        } else {
          setSuccessMessage('Review submitted successfully.')
        }
      }
      
      // Reset form and go back to reviews after a delay
      setTimeout(() => {
        setReviewRating(0)
        setReviewComment('')
        setShowReviewForm(false)
        setSubmitError(null)
        setSubmitSuccess(false)
        setSuccessMessage(null)
        
        // Refresh reviews if onLoadMore is available (to show the new review)
        if (onLoadMore) {
          onLoadMore()
        }
      }, 2000)
    } catch (error) {
      console.error('Error submitting review:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit review. Please try again.'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderInteractiveStars = (currentRating: number, onRatingChange: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        onClick={() => onRatingChange(i + 1)}
        className="focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded"
        type="button"
      >
        <Star
          className={`h-6 w-6 transition-colors ${
            i < currentRating 
              ? "text-yellow-500 fill-yellow-500" 
              : "text-gray-300 hover:text-yellow-400"
          }`}
        />
      </button>
    ))
  }

  const sortedReviews = getSortedReviews()

  return typeof window !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 max-h-[80vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{restaurantName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {renderStars(averageRating)}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating.toFixed(1)} ({totalReviews} reviews)
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full text-black hover:text-gray-800 flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        {!showReviewForm && (
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              {/* Sort dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>Sort by: {sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                </Button>
                
                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setShowSortDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          sortBy === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Write review button */}
              <Button
                onClick={handleWriteReview}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm"
                size="sm"
              >
                <MessageSquare className="h-3 w-3" />
                {isAuthenticated() ? 'Write Review' : 'Login to Review'}
              </Button>
            </div>
          </div>
        )}

        {/* Review Form Header */}
        {showReviewForm && (
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToReviews}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reviews
              </Button>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Write a Review</h4>
                <p className="text-xs text-gray-600">{restaurantName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Login Prompt */}
        {showLoginPrompt && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="text-center">
              <LogIn className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Login Required</h4>
              <p className="text-sm text-blue-700 mb-4">
                You need to be logged in to submit a review for {restaurantName}.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoginPrompt(false)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Redirect to login page or open login modal
                    window.location.href = '/login'
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reviews content or Review form */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {showReviewForm ? (
            /* Review Form */
            <div className="space-y-6">
              {/* Session Status */}
              <SessionStatus />
              {/* Rating Section */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  How would you rate this restaurant?
                </label>
                <div className="flex items-center gap-1">
                  {renderInteractiveStars(reviewRating, setReviewRating)}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      {reviewRating === 1 ? 'Poor' : 
                       reviewRating === 2 ? 'Fair' : 
                       reviewRating === 3 ? 'Good' : 
                       reviewRating === 4 ? 'Very Good' : 'Excellent'}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment Section */}
              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-gray-900 mb-2">
                  Tell us about your experience
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about your visit, the food, service, atmosphere, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {reviewComment.length}/500 characters
                  </span>
                  {reviewComment.length > 450 && (
                    <span className="text-xs text-orange-500">
                      {500 - reviewComment.length} characters remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Error/Success Messages */}
              {submitError && (
                <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
                  {submitError}
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg text-sm bg-green-50 border border-green-200 text-green-700">
                  {successMessage}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleBackToReviews}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || !reviewComment.trim() || isSubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Submit Review
                    </div>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Reviews List */
            <div className="space-y-4">
              {sortedReviews.length > 0 ? (
                <>
                  {sortedReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <ProfileImage 
                            src={review.profile_photo_url} 
                            alt={review.user}
                            size="md"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{review.user}</span>
                            {review.source === 'google' && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Google
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                          <span className="text-xs text-gray-500">
                            {review.relative_time_description || formatRelativeDate(review.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load more button */}
                  {pagination?.hasMore && onLoadMore && (
                    <div className="pt-4 text-center">
                      <Button
                        onClick={onLoadMore}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            Loading more reviews...
                          </div>
                        ) : (
                          `Load More Reviews (${pagination.currentPage}/${pagination.totalPages})`
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No reviews yet</p>
                  <p className="text-gray-400 text-xs mt-1">Be the first to review this restaurant!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null
}
