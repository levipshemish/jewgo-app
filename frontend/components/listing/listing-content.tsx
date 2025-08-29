"use client"

import { Button } from "@/components/ui/button"
import { Star, MapPin } from "lucide-react"
import styles from "./listing.module.css"

interface ListingContentProps {
  leftText?: string
  rightText?: string
  leftActionLabel?: string
  rightActionLabel?: string
  leftIcon?: string | React.ReactNode
  rightIcon?: string | React.ReactNode
  onReviewsClick?: () => void
}

export function ListingContent({
  leftText,
  rightText,
  leftActionLabel,
  rightActionLabel,
  leftIcon,
  rightIcon,
  onReviewsClick
}: ListingContentProps) {
  const iconMap: Record<string, React.ReactNode> = {
    "map-pin": <MapPin className="h-3 w-3" />,
    "star": <Star className="h-3 w-3" />
  }

  const renderIcon = (icon: string | React.ReactNode) => {
    if (typeof icon === "string") {
      return iconMap[icon] || null
    }
    return icon
  }

  return (
    <div className={styles.listingContent}>
      {/* First row */}
      <div className={styles.listingContentRow}>
        <div className={`${styles.listingContentText} ${styles.bold}`}>
          {leftText || "Restaurant Name"}
        </div>
        <button
          onClick={onReviewsClick}
          className={styles.listingRatingButton}
        >
          <Star className={`h-3 w-3 text-yellow-500 mr-1 group-hover:fill-yellow-500 transition-colors`} />
          {rightText || "4.5"}
          {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
        </button>
      </div>

      {/* Second row */}
      <div className={styles.listingContentRow}>
        <div className={`${styles.listingContentText} ${styles.bold}`}>
          {leftActionLabel || "$$"}
        </div>
        <div className={styles.listingContentText}>
          {rightActionLabel || "0.5 miles away"}
          {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
        </div>
      </div>
    </div>
  )
}
