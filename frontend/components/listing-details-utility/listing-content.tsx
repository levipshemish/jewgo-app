"use client"

import { Button } from "@/components/ui-listing-utility/button"
import { Star, MapPin } from "lucide-react"
import { useState } from "react"
import { ReviewsPopup } from "./reviews-popup"

interface ListingContentProps {
  leftText?: string
  rightText?: string
  leftAction?: string
  rightAction?: string
  leftBold?: boolean
  rightBold?: boolean
  leftTextSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
  rightTextSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
  leftIcon?: React.ReactNode | string
  rightIcon?: React.ReactNode | string
  onLeftAction?: () => void
  onRightAction?: () => void
  onRightTextClick?: () => void
  reviews?: Array<{
    id: string
    user: string
    rating: number
    comment: string
    date: string
    source?: 'user' | 'google'
    profile_photo_url?: string | null
    relative_time_description?: string | null
  }>
  reviewsPagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
    currentPage: number
    totalPages: number
  }
  onLoadMoreReviews?: () => void
  reviewsLoading?: boolean
}

// Icon mapping for string-based icons
const iconMap = {
  "star": Star,
  "map-pin": MapPin,
}

function renderIcon(icon: React.ReactNode | string | undefined) {
  if (!icon) return null
  
  if (typeof icon === 'string') {
    const IconComponent = iconMap[icon as keyof typeof iconMap]
    return IconComponent ? <IconComponent className="h-3 w-3" /> : null
  }
  
  return icon
}

// Helper function to check if text looks like a rating
function isRating(text: string): boolean {
  const ratingPattern = /^\d+(\.\d+)?$/
  const num = parseFloat(text)
  // Only treat as rating if it's a pure number between 0-5 and doesn't contain units like 'km', 'mi', 'ft', 'miles'
  return ratingPattern.test(text) && 
         num >= 0 && 
         num <= 5 && 
         !text.includes('km') && 
         !text.includes('mi') && 
         !text.includes('ft') && 
         !text.includes('miles') &&
         !text.includes('miles')
}

export function ListingContent({
  leftText,
  rightText,
  leftAction,
  rightAction,
  leftBold = false,
  rightBold = false,
  leftTextSize = 'sm',
  rightTextSize = 'sm',
  leftIcon,
  rightIcon,
  onLeftAction,
  onRightAction,
  onRightTextClick,
  reviews = [],
  reviewsPagination,
  onLoadMoreReviews,
  reviewsLoading = false,
}: ListingContentProps) {
  const [showReviews, setShowReviews] = useState(false)

  // Use passed reviews - no fallback to mock data
  const displayReviews = reviews
  
  console.log('ListingContent received reviews:', reviews)
  console.log('Display reviews:', displayReviews)

  // Check if rightText is a rating
  const isRightTextRating = rightText && isRating(rightText)

  return (
    <div className="p-0 space-y-1">
      {/* Text row */}
      {(leftText || rightText) && (
        <div className="flex justify-between items-center gap-3">
          <span className={`text-${leftTextSize} text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftIcon && <span className="inline-block mr-2">{renderIcon(leftIcon)}</span>}
            {leftText || "text box"}
          </span>
          {isRightTextRating ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowReviews(true)} 
              className="text-sm text-gray-600 h-auto px-2 py-1 rounded-full hover:bg-yellow-100 hover:text-gray-800 transition-colors group"
            >
              <span className="text-yellow-500 mr-1 text-sm group-hover:hidden">☆</span>
              <span className="text-yellow-500 mr-1 text-sm hidden group-hover:inline">⭐</span>
              {rightText}
            </Button>
          ) : onRightTextClick ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRightTextClick} 
              className="text-sm text-gray-600 h-auto px-2 py-1 rounded-full hover:bg-gray-100 hover:text-gray-800 transition-colors shadow-sm border border-gray-200/50"
            >
              {rightText || "text box"}
              {rightIcon && <span className="inline-block ml-2">{renderIcon(rightIcon)}</span>}
            </Button>
          ) : (
            <span className={`text-${rightTextSize} text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
              {rightText || "text box"}
              {rightIcon && <span className="inline-block ml-2">{renderIcon(rightIcon)}</span>}
            </span>
          )}
        </div>
      )}

      {/* Action row */}
      {(leftAction || (rightAction && rightAction !== "action")) && (
        <div className="flex justify-between items-center gap-3">
          <span className={`text-sm text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftAction || ""}
          </span>
          {onRightAction ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRightAction} 
              className="text-sm text-gray-600 h-auto px-2 py-1 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm border border-gray-200/50"
            >
              {rightIcon && <span className="inline-block mr-2">{renderIcon(rightIcon)}</span>}
              {rightAction || ""}
            </Button>
          ) : (
            <span className={`text-sm text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
              {rightAction || ""}
              {rightIcon && <span className="inline-block ml-2">{renderIcon(rightIcon)}</span>}
            </span>
          )}
        </div>
      )}

      {/* Reviews Popup */}
      <ReviewsPopup
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
        restaurantName={leftText || "Restaurant"}
        averageRating={parseFloat(rightText || "0")}
        totalReviews={reviewsPagination?.total || displayReviews.length}
        reviews={displayReviews}
        pagination={reviewsPagination}
        onLoadMore={onLoadMoreReviews}
        loading={reviewsLoading}
      />
    </div>
  )
}
