"use client"

import { Button } from "@/components/ui/button"
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

export function ListingContent({
  leftText,
  rightText,
  leftAction,
  rightAction,
  leftBold = false,
  rightBold = false,
  leftIcon,
  rightIcon,
  onLeftAction,
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

  return (
    <div className="space-y-1">
      {/* Text row */}
      {(leftText || rightText) && (
        <div className="flex justify-between items-center">
          <span className={`text-sm text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftIcon && <span className="inline-block mr-1">{renderIcon(leftIcon)}</span>}
            {leftText || "text box"}
          </span>
          {onRightTextClick ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowReviews(true)} 
              className="text-sm text-gray-600 h-auto px-2 py-1 rounded-full hover:bg-yellow-100 hover:text-gray-800 transition-colors shadow-sm border border-gray-200/50 group"
            >
              <Star className="h-3 w-3 text-yellow-500 mr-1 group-hover:fill-yellow-500 transition-colors" />
              {rightText || "text box"}
              {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
            </Button>
          ) : (
            <span className={`text-sm text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
              {rightText || "text box"}
              {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
            </span>
          )}
        </div>
      )}

      {/* Action row */}
      {(leftAction || rightAction || onLeftAction || onRightAction) && (
        <div className="flex justify-between items-center">
          <span className={`text-sm text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftAction || "text box"}
          </span>
          {onRightAction ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRightAction} 
              className="text-sm text-gray-600 h-auto p-0 hover:bg-transparent hover:text-gray-800"
            >
              {rightIcon && <span className="inline-block mr-1">{renderIcon(rightIcon)}</span>}
              {rightAction || "action"}
            </Button>
          ) : (
            <span className={`text-sm text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
              {rightAction || "action"}
              {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
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
