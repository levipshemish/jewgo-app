"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { useTimeNow } from '@/contexts/TimeUpdateProvider'
import { specialsApi } from '@/lib/api/specials'
import type { SpecialCardProps } from '@/types/specials'
import Image from 'next/image'

/**
 * Simplified special card with only the required elements:
 * - Image with badge in top left corner
 * - Title
 * - Merchant name
 * - Price (original and sale)
 * - Time left
 * - Entire card is clickable to navigate to listing page
 */
export default function SpecialCard({
  special,
  onViewDetails,
}: SpecialCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => specialsApi.getTimeRemaining(special))
  const [isActive, setIsActive] = useState(() => specialsApi.isSpecialActive(special))

  const now = useTimeNow({
    requireSecondPrecision: isActive && timeRemaining.total <= 60_000,
  })

  useEffect(() => {
    const remaining = specialsApi.getTimeRemaining(special)
    setTimeRemaining(remaining)
    setIsActive(specialsApi.isSpecialActive(special))
  }, [special, now])

  const heroImage = special.hero_image_url || special.media_items?.[0]?.url

  const displayData = useMemo(() => {
    // Handle badge structure from DealGridCard interface
    const badge = (special as unknown as { badge?: { text?: string; type?: string } })?.badge
    const badgeText = badge?.text || specialsApi.formatDiscountLabel(special)

    // Handle merchant name
    const merchantName = (special as unknown as { merchantName?: string; merchant_name?: string })
      ?.merchantName
      || (special as unknown as { merchant_name?: string })?.merchant_name

    // Handle price structure from DealGridCard interface
    const price = (special as unknown as { 
      price?: { 
        original?: number | string; 
        sale?: number | string; 
        currency?: string;
      } 
    })?.price
    const priceData = price || {
      original: (special as unknown as { price_original?: number | string })?.price_original,
      sale: (special as unknown as { price_sale?: number | string })?.price_sale,
      currency: 'USD'
    }

    // Handle time left - prefer timeLeftSeconds from interface, fallback to calculation
    const timeLeftSeconds = (special as unknown as { timeLeftSeconds?: number })?.timeLeftSeconds
      ?? Math.max(0, Math.floor((new Date(special.valid_until).getTime() - now) / 1000))

    // Handle claims left
    const claimsLeft = (special as unknown as { claimsLeft?: number })?.claimsLeft

    // Handle CTA text
    const ctaText = (special as unknown as { ctaText?: string })?.ctaText || 'Claim'

    // Handle overlay tag
    const overlayTag = (special as unknown as { overlayTag?: string })?.overlayTag

    return {
      imageUrl: heroImage,
      badge: {
        text: badgeText,
        type: badge?.type || 'custom'
      },
      title: special.title,
      merchantName: merchantName || special.subtitle || '',
      price: priceData,
      timeLeftSeconds,
      claimsLeft,
      ctaText,
      overlayTag,
    }
  }, [heroImage, special, now])

  const timeLeftLabel = useMemo(() => {
    if (!displayData.timeLeftSeconds || displayData.timeLeftSeconds <= 0) {
      return 'Expired'
    }

    const hours = Math.floor(displayData.timeLeftSeconds / 3600)
    const minutes = Math.floor((displayData.timeLeftSeconds % 3600) / 60)
    const seconds = displayData.timeLeftSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s left`
    }

    return `${seconds}s left`
  }, [displayData.timeLeftSeconds])

  const formatCurrency = useCallback((value?: number | string | null, currency = 'USD') => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const numeric = typeof value === 'string' ? Number(value) : value
    if (Number.isNaN(numeric)) {
      return null
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(numeric)
  }, [])

  const salePrice = formatCurrency(displayData.price?.sale, displayData.price?.currency)
  const originalPrice = formatCurrency(displayData.price?.original, displayData.price?.currency)

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(special)
    }
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleViewDetails}
    >
      {/* Image with badge in top left corner */}
      <div className="relative h-48 bg-gray-100">
        {displayData.imageUrl ? (
          <Image
            src={displayData.imageUrl}
            alt={displayData.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-sm">No image</div>
          </div>
        )}
        
        {/* Badge in top left corner */}
        {displayData.badge.text && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
            {displayData.badge.text}
          </div>
        )}

        {/* Overlay tag (e.g., "Meat", "Dairy") */}
        {displayData.overlayTag && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
            {displayData.overlayTag}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
          {displayData.title}
        </h3>

        {/* Merchant Name */}
        <p className="text-xs text-gray-600 mb-2 line-clamp-1">
          {displayData.merchantName}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          {salePrice && (
            <span className="font-semibold text-green-600 text-sm">{salePrice}</span>
          )}
          {originalPrice && originalPrice !== salePrice && (
            <span className="text-xs text-gray-500 line-through">{originalPrice}</span>
          )}
        </div>

        {/* Claims Left */}
        {displayData.claimsLeft !== undefined && displayData.claimsLeft > 0 && (
          <div className="text-xs text-gray-500 mb-2">
            {displayData.claimsLeft} claims left
          </div>
        )}

        {/* Time Left */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{timeLeftLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function SpecialCardCompact(props: SpecialCardProps) {
  return <SpecialCard {...props} compact />
}

export function FeaturedSpecialCard({ special, onClaim, onShare }: SpecialCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <Card
        data={{
          id: special.id,
          imageUrl: special.hero_image_url || special.media_items?.[0]?.url,
          title: special.title,
          badge: specialsApi.formatDiscountLabel(special),
          subtitle: special.subtitle || '',
          additionalText: specialsApi.isSpecialActive(special)
            ? specialsApi.getTimeRemaining(special).isExpired
              ? 'Expired'
              : 'Featured'
            : 'Upcoming',
          showHeart: false,
          imageTag: 'Featured',
        }}
        variant="default"
        showStarInBadge={false}
        className="w-full"
      />

      <div className="flex items-center justify-between gap-2">
        {specialsApi.isSpecialActive(special) && onClaim && (
          <Button
            onClick={() => onClaim(special)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Claim Now
          </Button>
        )}

        {onShare && (
          <Button variant="outline" size="sm" onClick={() => onShare(special)}>
            Share
          </Button>
        )}
      </div>
    </div>
  )
}
