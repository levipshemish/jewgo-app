"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Star, X, ChevronDown, MessageSquare } from "lucide-react"

interface Review {
  id: string
  user: string
  rating: number
  comment: string
  date: string
}

interface ReviewsPopupProps {
  isOpen: boolean
  onClose: () => void
  restaurantName?: string
  averageRating?: number
  totalReviews?: number
  reviews: Review[]
}

export function ReviewsPopup({ 
  isOpen, 
  onClose, 
  restaurantName = "Restaurant",
  averageRating = 0,
  totalReviews = 0,
  reviews = []
}: ReviewsPopupProps) {
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'rating') {
      return b.rating - a.rating
    } else {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-gray-900">Reviews</h3>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-700">
                  {averageRating.toFixed(1)} ({totalReviews})
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full"
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Sort and Write Review */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {/* Sort dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="h-8 px-3 text-sm text-gray-600 hover:bg-gray-100 rounded-full"
              >
                Sort by: {sortBy === 'date' ? 'Date' : 'Rating'}
                <ChevronDown size={14} className="ml-1" />
              </Button>
              
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      setSortBy('date')
                      setShowSortDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    Date
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('rating')
                      setShowSortDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    Rating
                  </button>
                </div>
              )}
            </div>

            {/* Write Review button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // This would open a review form
                alert('Write review functionality coming soon!')
              }}
              className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-full"
            >
              <MessageSquare size={14} className="mr-1" />
              Write Review
            </Button>
          </div>
        </div>

        {/* Reviews list */}
        <div className="max-h-96 overflow-y-auto">
          {sortedReviews.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {sortedReviews.map((review) => (
                <div key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{review.user}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {review.date}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">📝</div>
              <h4 className="text-gray-900 font-medium mb-1">No reviews yet</h4>
              <p className="text-sm text-gray-500">Be the first to share your experience!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
