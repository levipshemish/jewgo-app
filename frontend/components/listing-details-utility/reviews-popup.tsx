"use client"

import { Button } from "@/components/ui-listing-utility/button"
import { ProfileImage } from "@/components/ui-listing-utility/profile-image"
import { Star, X, User, ChevronDown, Plus, MessageSquare } from "lucide-react"
import { useState } from "react"

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
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'

export function ReviewsPopup({
  isOpen,
  onClose,
  restaurantName,
  averageRating,
  totalReviews,
  reviews,
  pagination,
  onLoadMore,
  loading = false,
}: ReviewsPopupProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

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
    // In a real app, this would open a review form or navigate to a review page
    console.log('Write review clicked')
    alert('Write review functionality would be implemented here')
  }

  const sortedReviews = getSortedReviews()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
              Write Review
            </Button>
          </div>
        </div>

        {/* Reviews content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
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
                          {review.relative_time_description || new Date(review.date).toLocaleDateString()}
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
        </div>
      </div>
    </div>
  )
}
