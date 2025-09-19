"use client"

import React from 'react'
import { ListingPage, type ListingData } from '../listing-details-utility/listing-page'
import { RestaurantSpecialsIntegration } from './index'

interface ListingPageWithSpecialsProps {
  data?: ListingData
  className?: string
  loading?: boolean
  error?: string | null
  showSpecials?: boolean
  specialsVariant?: 'compact' | 'full' | 'card'
  specialsMaxItems?: number
}

export function ListingPageWithSpecials({
  data,
  className = "",
  loading = false,
  error = null,
  showSpecials = true,
  specialsVariant = 'full',
  specialsMaxItems = 3
}: ListingPageWithSpecialsProps) {
  const restaurantId = data?.header?.restaurantId

  return (
    <div className={className}>
      {/* Original ListingPage */}
      <ListingPage
        data={data}
        loading={loading}
        error={error}
      />
      
      {/* Specials Section - only show if we have a restaurant ID and specials are enabled */}
      {showSpecials && restaurantId && !loading && !error && (
        <div className="w-full max-w-sm sm:max-w-none mx-auto px-4 sm:px-6 md:px-8 pb-6">
          <RestaurantSpecialsIntegration
            restaurantId={restaurantId}
            variant={specialsVariant}
            maxItems={specialsMaxItems}
            className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100"
          />
        </div>
      )}
    </div>
  )
}

// Export variants for different use cases
export const ListingPageWithSpecialsCompact = (props: Omit<ListingPageWithSpecialsProps, 'specialsVariant'>) => (
  <ListingPageWithSpecials {...props} specialsVariant="compact" />
)

export const ListingPageWithSpecialsCard = (props: Omit<ListingPageWithSpecialsProps, 'specialsVariant'>) => (
  <ListingPageWithSpecials {...props} specialsVariant="card" />
)
