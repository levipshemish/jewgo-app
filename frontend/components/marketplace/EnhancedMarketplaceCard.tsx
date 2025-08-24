"use client"

import { Heart, MapPin, Clock, User, Eye, Star } from "lucide-react"
import Image from "next/image"
import React, { useState, useEffect } from "react"

import type { MarketplaceListing } from "@/lib/types/marketplace"
import { cn } from "@/lib/utils/classNames"
import { 
  formatPrice, 
  formatTimeAgo, 
  getListingTypeIcon, 
  getListingTypeColor, 
  getConditionColor,
  getHeroImage,
  cardStyles
} from "@/lib/utils/cardUtils"

interface EnhancedMarketplaceCardProps {
  listing: MarketplaceListing
  onClick?: () => void
  className?: string
  showEndorsements?: boolean
  variant?: "default" | "compact" | "featured"
  onLike?: (listing: MarketplaceListing) => void
  isLiked?: boolean
}

export default function EnhancedMarketplaceCard({
  listing,
  onClick,
  className = "",
  showEndorsements = true,
  variant = "default",
  onLike,
  isLiked: externalIsLiked,
}: EnhancedMarketplaceCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Sync with external like state
  useEffect(() => {
    if (externalIsLiked !== undefined) {
      setIsLiked(externalIsLiked)
    }
  }, [externalIsLiked])

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newLikeState = !isLiked
    setIsLiked(newLikeState)
    if (onLike) {
      onLike(listing)
    }
  }

  const getHeroImageUrl = () => {
    return getHeroImage(listing.images, listing.thumbnail, getListingTypeIcon(listing.kind), imageError)
  }

  const handleImageLoad = () => setImageLoading(false)
  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const heroImageUrl = getHeroImageUrl()
  const isImageUrl = typeof heroImageUrl === "string" && heroImageUrl.startsWith("http")

  return (
    <div
        onClick={onClick}
        className={cn(
          "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group",
          variant === "featured" && "ring-2 ring-blue-200",
          className,
        )}
      >
      {/* Image Section */}
      <div className={cardStyles.imageContainer.default}>
        {isImageUrl ? (
          <>
            {imageLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <Image
              src={(heroImageUrl as string) || "/placeholder.svg"}
              alt={listing.title}
              fill
              className={cn(
                "object-cover transition-transform duration-200 group-hover:scale-105",
                imageLoading ? "opacity-0" : "opacity-100",
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-4xl text-gray-400">{heroImageUrl}</div>
          </div>
        )}

        {/* Category Badge */}
        {listing.category_name && (
          <div className={cardStyles.badge.topLeft}>
            <span className="unified-card-tag px-1.5 py-0.5 text-xs font-medium rounded-full text-white shadow-sm">
              {listing.category_name}
            </span>
          </div>
        )}

        {/* Like Button */}
        <button
          onClick={handleLikeClick}
          className={cn(
            cardStyles.button.topRight,
            "unified-card-heart p-1 rounded-full transition-all duration-200",
            isLiked ? "liked" : "",
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", isLiked ? "fill-current" : "")} />
        </button>

        {/* Condition Badge */}
        {listing.condition && (
          <div className={cardStyles.badge.bottomLeft}>
            <span
              className={cn(
                "unified-card-tag px-1.5 py-0.5 text-xs font-medium rounded-full shadow-sm",
              )}
            >
              {listing.condition.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>
        )}

        {/* Rating Badge */}
        {listing.rating && listing.rating > 0 && (
          <div className={cn(cardStyles.badge.bottomRight, "flex items-center unified-card-tag rounded-full px-1.5 py-0.5 shadow-sm")}>
            <Star className="w-3 h-3 text-yellow-500 fill-current mr-0.5" />
            <span className="text-xs font-medium text-white">{listing.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={cardStyles.content.marketplace}>
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-xs line-clamp-2 leading-tight">{listing.title}</h3>
          </div>
        </div>

        {/* Price and Type */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(listing.price_cents, listing.currency)}
            </span>
            {listing.originalPrice && listing.originalPrice > listing.price_cents && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(listing.originalPrice, listing.currency)}
              </span>
            )}
          </div>

          <span className={cn("unified-card-tag px-1.5 py-0.5 text-xs font-medium rounded-full")}>
            {listing.kind.charAt(0).toUpperCase() + listing.kind.slice(1)}
          </span>
        </div>

        {/* Description */}
        {listing.description && variant !== "compact" && (
          <p className="text-xs text-gray-600 mb-1 line-clamp-2">{listing.description}</p>
        )}

        {/* Location */}
        {listing.city && (
          <div className="flex items-center text-xs text-gray-500 mb-0.5">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {listing.city}
              {listing.region && `, ${listing.region}`}
            </span>
          </div>
        )}

        {/* Seller */}
        {listing.seller_name && variant !== "compact" && (
          <div className="flex items-center text-xs text-gray-500 mb-0.5">
            <User className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{listing.seller_name}</span>
          </div>
        )}

        {/* Endorsements */}
        {showEndorsements && (listing.endorse_up > 0 || listing.endorse_down > 0) && variant !== "compact" && (
          <div className="flex items-center text-xs text-gray-500 mb-0.5">
            <div className="flex items-center mr-3">
              <span className="text-green-600 mr-1">👍</span>
              <span>{listing.endorse_up}</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-600 mr-1">👎</span>
              <span>{listing.endorse_down}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            {listing.views && (
              <div className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                <span>{listing.views}</span>
              </div>
            )}
            <div className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(listing.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
