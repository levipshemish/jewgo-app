"use client"

import { ListingHeader } from "./listing-header"
import { ListingImage } from "./listing-image"
import { ListingContent } from "./listing-content"
import { ListingActions } from "./listing-actions"

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
  }
  header?: {
    title?: string
    kosherType?: string
    kosherAgency?: string
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
}

interface ListingPageProps {
  data?: ListingData
  className?: string
  loading?: boolean
  error?: string
}

export function ListingPage({ data, className = "", loading = false, error }: ListingPageProps) {
  if (loading) {
    return (
      <div className={`w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-0 mt-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-300 rounded-3xl" />
          <div className="rounded-2xl p-2 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4" />
            <div className="h-4 bg-gray-300 rounded w-1/2" />
            <div className="h-10 bg-gray-300 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-0 mt-4 ${className}`}>
        <div className="rounded-2xl p-4 text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Listing</h3>
          <p className="text-sm text-gray-600">{error}</p>
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
  }

  return (
    <div className={`w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-0 space-y-4 pb-16 mt-4 ${className}`}>
      {/* Header overlaying the image */}
      <div className="relative">
        {/* Image */}
        {safeData.image && (
          <ListingImage
            src={safeData.image.src}
            alt={safeData.image.alt || safeData.title || "Listing image"}
            actionLabel={safeData.image.actionLabel}
            onAction={safeData.image.onAction}
            restaurantName={safeData.content?.leftText || safeData.title || "Restaurant"}
            allImages={safeData.image.allImages || []}
            viewCount={safeData.image.viewCount}
          />
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <ListingHeader
            kosherType={safeData.header?.kosherType}
            kosherAgency={safeData.header?.kosherAgency}
            shareCount={safeData.header?.shareCount}
            onBack={safeData.header?.onBack}
            onFavorite={safeData.header?.onFavorite}
            isFavorited={safeData.header?.isFavorited}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Content card - floating */}
        {safeData.content && (
          <div className="rounded-2xl p-0.5">
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
            />
          </div>
        )}

        {/* Actions card - floating */}
        {safeData.actions && (
          <div className="rounded-2xl p-0.5">
            <ListingActions
              primaryAction={safeData.actions.primaryAction}
              secondaryActions={safeData.actions.secondaryActions}
              tags={safeData.actions.tags}
              onTagClick={safeData.actions.onTagClick}
              bottomAction={safeData.actions.bottomAction}
              address={safeData.address}
            />
          </div>
        )}

        {/* Description Section */}
        {safeData.description && (
          <div className="rounded-2xl p-0.5 text-center">
            <span className="text-sm text-gray-600">{safeData.description}</span>
          </div>
        )}
      </div>

      {/* Bottom indicator - floating */}
      <div className="flex justify-center">
        <div className="w-48 h-0.5 bg-gray-300 rounded-full" />
      </div>

      {/* Increased bottom spacing for more white space */}
      <div className="h-8" />
    </div>
  )
}
