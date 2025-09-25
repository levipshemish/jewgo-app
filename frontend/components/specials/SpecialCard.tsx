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
  showHeart: true,
})

// Helper function to create view details handler
const createViewDetailsHandler = (specialData: any, onViewDetails?: (special: any) => void) => () => {
  if (onViewDetails) {
    onViewDetails(specialData)
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
    
    // Use discount_label from database as badge
    const badgeText = special.discount_label || specialsApi.formatDiscountLabel(special)

    // Remove merchant name - subtitle should not be used for merchant name
    // The price section will show the discount information instead

    // Calculate pricing from discount fields - using real database fields
    const priceData = {
      discount: {
        type: special.discount_type,        // Real DB field: discount_type
        value: special.discount_value,      // Real DB field: discount_value  
        label: special.discount_label      // Real DB field: discount_label
      },
      currency: 'USD'
    }

    // Handle time left - calculate from valid_until (real DB field)
    const timeLeftSeconds = Math.max(0, Math.floor((new Date(special.valid_until).getTime() - now) / 1000))

    // Handle claims left from database - use max_claims_total (real DB field)
    const claimsLeft = special.max_claims_total ? 
      Math.max(0, special.max_claims_total - 0) : // No claims data available in current type
      undefined

    // Handle overlay tag - based on discount type (real DB field)
    const overlayTag = special.discount_type === 'percentage' ? 'Discount' : 
                      special.discount_type === 'fixed_amount' ? 'Save' : 
                      special.discount_type === 'bogo' ? 'BOGO' : undefined

    return {
      ...baseData,
      badge: badgeText,
      subtitle: special.discount_label || '', // Use discount label as subtitle
      price: priceData,
      timeLeftSeconds,
      claimsLeft,
      overlayTag,
      ctaText: 'Claim',
      showHeart: true, // Enable heart for specials
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
