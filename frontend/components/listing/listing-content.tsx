"use client"

import { Button } from "@/components/ui/button"
import { Star, MapPin } from "lucide-react"
import { useState } from "react"
import ReviewsPopup from "./reviews-popup"

interface ListingContentProps {
  leftText?: string
  rightText?: string
  leftAction?: string
  rightAction?: string
  leftBold?: boolean
  rightBold?: boolean
  leftIcon?: React.ReactNode | string
  rightIcon?: React.ReactNode | string
  onLeftAction?: () => void
  onRightAction?: () => void
  onRightTextClick?: () => void
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
  return ratingPattern.test(text) && num >= 0 && num <= 5
}

export function ListingContent({
  leftText,
  rightText,
  leftAction,
  rightAction,
  leftBold = false,
  rightBold = false,
  leftIcon,
  rightIcon,
  onLeftAction: _onLeftAction,
  onRightAction,
  onRightTextClick,
}: ListingContentProps) {
  const [showReviews, setShowReviews] = useState(false)

  // Mock reviews data - in a real app, this would come from props or API
  const mockReviews = [
    {
      id: "1",
      user: "Sarah M.",
      rating: 5,
      comment: "Amazing kosher food! The falafel was perfectly crispy and the hummus was creamy. Highly recommend!",
      date: "2 days ago"
    },
    {
      id: "2",
      user: "David L.",
      rating: 4,
      comment: "Great atmosphere and friendly staff. The shawarma was delicious, though a bit pricey.",
      date: "1 week ago"
    },
    {
      id: "3",
      user: "Rachel K.",
      rating: 5,
      comment: "Best kosher restaurant in the area! Everything was fresh and flavorful.",
      date: "2 weeks ago"
    }
  ]

  // Check if rightText is a rating
  const isRightTextRating = rightText && isRating(rightText)

  return (
    <div className="p-0 space-y-3">
      {/* Text row */}
      {(leftText || rightText) && (
        <div className="flex justify-between items-center gap-3">
          <span className={`text-sm text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftIcon && <span className="inline-block mr-2">{renderIcon(leftIcon)}</span>}
            {leftText || "text box"}
          </span>
          {isRightTextRating ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowReviews(true)} 
              className="text-sm text-gray-600 h-auto px-2 py-1 rounded-full hover:bg-yellow-100 hover:text-gray-800 transition-colors shadow-sm border border-gray-200/50 group"
            >
              <Star className="h-3 w-3 text-yellow-500 mr-2 group-hover:fill-yellow-500 transition-colors" />
              {rightText}
              {rightIcon && <span className="inline-block ml-2">{renderIcon(rightIcon)}</span>}
            </Button>
          ) : onRightTextClick ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowReviews(true)} 
              className="text-sm text-gray-600 h-auto px-2 py-1 rounded-full hover:bg-yellow-100 hover:text-gray-800 transition-colors shadow-sm border border-gray-200/50 group"
            >
              <Star className="h-3 w-3 text-yellow-500 mr-2 group-hover:fill-yellow-500 transition-colors" />
              {rightText || "text box"}
              {rightIcon && <span className="inline-block ml-2">{renderIcon(rightIcon)}</span>}
            </Button>
          ) : (
            <span className={`text-sm text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
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
              className="text-sm text-gray-600 h-auto p-0 hover:bg-transparent hover:text-gray-800"
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
        totalReviews={mockReviews.length}
        reviews={mockReviews}
      />
    </div>
  )
}
