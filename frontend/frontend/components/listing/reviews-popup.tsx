"use client"

import { Button } from "@/components/ui/button"
import { Star, X, User } from "lucide-react"

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
  restaurantName: string
  averageRating: number
  totalReviews: number
  reviews: Review[]
}

export function ReviewsPopup({
  isOpen,
  onClose,
  restaurantName,
  averageRating,
  totalReviews,
  reviews,
}: ReviewsPopupProps) {
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

        {/* Reviews content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{review.user}</span>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                      <span className="text-xs text-gray-500">{review.date}</span>
                    </div>
                  </div>
                </div>
              ))
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
