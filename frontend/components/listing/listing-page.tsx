"use client"

import { ListingData } from "@/types/listing"
import { ListingHeader } from "./listing-header"
import { ListingImage } from "./listing-image"
import { ListingContent } from "./listing-content"
import { ListingActions } from "./listing-actions"
import { Stack } from "@/components/ui/spacing"

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
              onBack={safeData.header?.onBack}
              onFavorite={safeData.header?.onFavorite}
              isFavorited={safeData.header?.isFavorited}
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
              userLocation={safeData.userLocation ? {
                lat: safeData.userLocation.latitude,
                lng: safeData.userLocation.longitude
              } : undefined}
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
