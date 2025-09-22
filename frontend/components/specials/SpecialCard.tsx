"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useTimeNow } from '@/contexts/TimeUpdateProvider'
import { specialsApi } from '@/lib/api/specials'
import type { SpecialCardProps } from '@/types/specials'
import Card, { type CardData } from '@/components/core/cards/Card'

// Helper function to create common card data
const createBaseCardData = (special: any): Partial<CardData> => ({
  id: special.id,
  imageUrl: special.hero_image_url || special.media_items?.[0]?.url,
  title: special.title,
  badge: specialsApi.formatDiscountLabel(special),
  subtitle: special.subtitle || '',
  showHeart: false,
})

// Helper function to create view details handler
const createViewDetailsHandler = (special: any, onViewDetails?: (special: any) => void) => () => {
  if (onViewDetails) {
    onViewDetails(special)
  }
}

/**
 * Special card using the shared Card utility with specials-specific data transformation.
 * Displays: image, badge, title, merchant name, price, time left, claims left, overlay tag.
 * Entire card is clickable to navigate to listing page.
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

  const cardData: CardData = useMemo(() => {
    const baseData = createBaseCardData(special)
    
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

    // Handle overlay tag
    const overlayTag = (special as unknown as { overlayTag?: string })?.overlayTag

    return {
      ...baseData,
      badge: badgeText,
      subtitle: merchantName || special.subtitle || '',
      price: priceData,
      timeLeftSeconds,
      claimsLeft,
      overlayTag,
    } as CardData
  }, [special, now])

  const handleViewDetails = createViewDetailsHandler(special, onViewDetails)

  return (
    <Card
      data={cardData}
      onCardClick={handleViewDetails}
      className="w-full"
      variant="default"
    />
  )
}


export function FeaturedSpecialCard({ special, onViewDetails }: SpecialCardProps) {
  const cardData: CardData = {
    ...createBaseCardData(special),
    additionalText: specialsApi.isSpecialActive(special)
      ? specialsApi.getTimeRemaining(special).isExpired
        ? 'Expired'
        : 'Featured'
      : 'Upcoming',
    imageTag: 'Featured',
  } as CardData

  const handleViewDetails = createViewDetailsHandler(special, onViewDetails)

  return (
    <Card
      data={cardData}
      onCardClick={handleViewDetails}
      variant="default"
      showStarInBadge={false}
      className="w-full"
    />
  )
}

export function SpecialCardCompact({ special, onViewDetails }: SpecialCardProps) {
  const cardData: CardData = createBaseCardData(special) as CardData
  const handleViewDetails = createViewDetailsHandler(special, onViewDetails)

  return (
    <Card
      data={cardData}
      onCardClick={handleViewDetails}
      variant="minimal"
      className="w-full"
    />
  )
}
