"use client"

import { X, Star } from "lucide-react"
import styles from "./listing.module.css"

interface Review {
  id: string
  user: string
  rating: number
  comment: string
  date: string
}

interface ReviewsPopupProps {
  reviews: Review[]
  onClose: () => void
}

export function ReviewsPopup({ reviews, onClose }: ReviewsPopupProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  return (
    <div className={styles.listingPopup} onClick={onClose}>
      <div className={styles.listingPopupContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.listingPopupHeader}>
          <h3 className={styles.listingPopupTitle}>Reviews</h3>
          <button className={styles.listingPopupClose} onClick={onClose}>
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{review.user}</span>
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{review.comment}</p>
                <span className="text-xs text-gray-400">{review.date}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No reviews yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
