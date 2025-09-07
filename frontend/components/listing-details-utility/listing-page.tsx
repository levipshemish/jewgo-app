"use client"

import { ListingHeader } from "./listing-header"
import { ListingImage } from "./listing-image"
import { ListingContent } from "./listing-content"
import { ListingActions } from "./listing-actions"
import { Stack } from "@/components/ui-listing-utility/spacing"

export interface ListingData {
  title?: string
  image?: {
    src?: string
    alt?: string
    actionLabel?: string
    onAction?: () => void
    allImages?: string[]
  }
  content?: {
    leftText?: string
    rightText?: string
    leftAction?: string
    rightAction?: string
    leftBold?: boolean
    rightBold?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    onLeftAction?: () => void
    onRightAction?: () => void
    onRightTextClick?: () => void
  }
  actions?: {
    primaryAction?: {
      label?: string
      onClick?: () => void
    }
    secondaryActions?: Array<{
      label?: string
      onClick?: () => void
    }>
    tags?: string[]
    onTagClick?: (tag: string) => void
    bottomAction?: {
      label?: string
      onClick?: () => void
      hoursInfo?: {
        title: string
        hours: Array<{
          day: string
          time: string
        }>
      }
    }
    onLocationRequest?: () => void
  }
  header?: {
    title?: string
    kosherType?: string
    kosherAgency?: string
    kosherAgencyWebsite?: string
    viewCount?: number
    shareCount?: number
    onBack?: () => void
    onFavorite?: () => void
    onShare?: () => void
    isFavorited?: boolean
  }
  // Additional text sections
  address?: string
  description?: string
  location?: {
    latitude: number
    longitude: number
  }
  userLocation?: {
    latitude: number
    longitude: number
  }
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

interface ListingPageProps {
  data?: ListingData
  className?: string
  loading?: boolean
  error?: string | null
}

export function ListingPage({ data, className = "", loading = false, error }: ListingPageProps) {
  if (loading) {
    return (
      <div className={`w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 ${className}`}>
        <Stack gap={6}>
          <div className="h-64 bg-gray-300 rounded-2xl" />
          <div className="rounded-2xl p-4 md:p-6">
            <Stack gap={4}>
              <div className="h-4 bg-gray-300 rounded w-3/4" />
              <div className="h-4 bg-gray-300 rounded w-1/2" />
              <div className="h-10 bg-gray-300 rounded" />
            </Stack>
          </div>
        </Stack>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 ${className}`}>
        <div className="rounded-2xl p-4 md:p-6 text-center">
          <Stack gap={2}>
            <div className="text-red-500">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900">Error Loading Listing</h3>
            <p className="text-sm text-gray-600">{error}</p>
          </Stack>
        </div>
      </div>
    )
  }

  const safeData: ListingData = {
    title: data?.title || "Listing",
    image: data?.image,
    content: data?.content,
    actions: data?.actions,
    header: data?.header,
    address: data?.address,
    description: data?.description,
    location: data?.location,
    userLocation: data?.userLocation,
    reviews: data?.reviews,
    reviewsPagination: data?.reviewsPagination,
    onLoadMoreReviews: data?.onLoadMoreReviews,
    reviewsLoading: data?.reviewsLoading,
  }

  return (
    <div className={`w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 ${className}`}>
      <Stack gap={10}>
        {/* Header overlaying the image */}
        <div className="relative p-3">
          {/* Image */}
          {safeData.image && (
            <ListingImage
              src={safeData.image.src}
              alt={safeData.image.alt || safeData.title || "Listing image"}
              actionLabel={safeData.image.actionLabel}
              onAction={safeData.image.onAction}
              restaurantName={safeData.content?.leftText || safeData.title || "Restaurant"}
              allImages={safeData.image.allImages || []}
            />
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10">
            <ListingHeader
              kosherType={safeData.header?.kosherType}
              kosherAgency={safeData.header?.kosherAgency}
              kosherAgencyWebsite={safeData.header?.kosherAgencyWebsite}
              shareCount={safeData.header?.shareCount}
              viewCount={safeData.header?.viewCount}
              onBack={safeData.header?.onBack}
              onFavorite={safeData.header?.onFavorite}
              isFavorited={safeData.header?.isFavorited}
              tags={safeData.actions?.tags || []}
            />
          </div>
        </div>

        {/* Content sections */}
        <Stack gap={3} className="pl-3 pr-3">
          {/* Content */}
          {safeData.content && (
            <ListingContent
              leftText={safeData.content.leftText}
              rightText={safeData.content.rightText}
              leftAction={safeData.content.leftAction}
              rightAction={safeData.content.rightAction}
              leftBold={safeData.content.leftBold}
              rightBold={safeData.content.rightBold}
              leftIcon={safeData.content.leftIcon}
              rightIcon={safeData.content.rightIcon}
              onLeftAction={safeData.content.onLeftAction}
              onRightAction={safeData.content.onRightAction}
              onRightTextClick={safeData.content.onRightTextClick}
              reviews={safeData.reviews}
              reviewsPagination={safeData.reviewsPagination}
              onLoadMoreReviews={safeData.onLoadMoreReviews}
              reviewsLoading={safeData.reviewsLoading}
            />
          )}

          {/* Actions */}
          {safeData.actions && (
            <ListingActions
              primaryAction={safeData.actions.primaryAction}
              secondaryActions={safeData.actions.secondaryActions}
              tags={safeData.actions.tags}
              onTagClick={safeData.actions.onTagClick}
              bottomAction={safeData.actions.bottomAction}
              address={safeData.address}
              location={safeData.location}
              userLocation={safeData.userLocation}
              onLocationRequest={safeData.actions.onLocationRequest}
            />
          )}

          {/* Description Section */}
          {safeData.description && (
            <div className="p-3 text-center">
              <span className="text-sm text-gray-600 leading-relaxed">{safeData.description}</span>
            </div>
          )}
        </Stack>

        {/* Bottom indicator */}
        <div className="flex justify-center">
          <div className="w-48 h-0.5 bg-gray-300 rounded-full" />
        </div>
      </Stack>
    </div>
  )
}
