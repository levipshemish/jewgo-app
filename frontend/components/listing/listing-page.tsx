"use client"

import { ListingData } from "@/types/listing"
import { ListingHeader } from "./listing-header"
import { ListingImage } from "./listing-image"
import { ListingContent } from "./listing-content"
import { ListingActions } from "./listing-actions"
import { ReviewsPopup } from "./reviews-popup"
import { ImageCarouselPopup } from "./image-carousel-popup"
import { useState } from "react"
import styles from "./listing.module.css"

interface ListingPageProps {
  data?: ListingData
  loading?: boolean
  error?: string | null
  className?: string
}

export function ListingPage({ data, loading, error, className }: ListingPageProps) {
  const [showReviews, setShowReviews] = useState(false)
  const [showImageCarousel, setShowImageCarousel] = useState(false)

  if (loading) {
    return (
      <div className={`${styles.listingContainer} ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-300 rounded-3xl"></div>
          <div className="rounded-2xl p-2 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.listingContainer} ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`${styles.listingContainer} ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.listingContainer} ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <ListingHeader
          kosherType={data.header?.kosherType}
          kosherAgency={data.header?.kosherAgency}
          shareCount={data.header?.shareCount}
          onBack={data.header?.onBack}
          onFavorite={data.header?.onFavorite}
          isFavorited={data.header?.isFavorited}
        />

        {/* Image */}
        <ListingImage
          imageUrl={data.image?.imageUrl}
          imageAlt={data.image?.imageAlt}
          imageActionLabel={data.image?.imageActionLabel}
          viewCount={data.image?.viewCount}
          onViewGallery={() => setShowImageCarousel(true)}
        />

        {/* Content */}
        <ListingContent
          leftText={data.content?.leftText}
          rightText={data.content?.rightText}
          leftActionLabel={data.content?.leftActionLabel}
          rightActionLabel={data.content?.rightActionLabel}
          leftIcon={data.content?.leftIcon}
          rightIcon={data.content?.rightIcon}
          onReviewsClick={() => setShowReviews(true)}
        />

        {/* Actions */}
        <ListingActions
          primaryAction={data.actions?.primaryAction}
          secondaryActions={data.actions?.secondaryActions}
          bottomAction={data.actions?.bottomAction}
          kosherTags={data.actions?.kosherTags}
          address={data.address}
        />

        {/* Description */}
        {data.description && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 leading-relaxed">{data.description}</p>
          </div>
        )}
      </div>

      {/* Popups */}
      {showReviews && (
        <ReviewsPopup
          reviews={data.reviews || []}
          onClose={() => setShowReviews(false)}
        />
      )}

      {showImageCarousel && data.image?.images && (
        <ImageCarouselPopup
          images={data.image.images}
          onClose={() => setShowImageCarousel(false)}
        />
      )}
    </div>
  )
}
