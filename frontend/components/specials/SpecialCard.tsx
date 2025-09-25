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
    
    // Format discount info for subtitle (price range equivalent)
    const discountText = special.discount_label || specialsApi.formatDiscountLabel(special)
    
    // Format time remaining for badge (rating equivalent)
    const timeRemaining = specialsApi.getTimeRemaining(special)
    const timeText = timeRemaining.isExpired ? 'Expired' : 
                    timeRemaining.total <= 0 ? 'Ending Soon' :
                    timeRemaining.hours > 0 ? `${timeRemaining.hours}h left` :
                    timeRemaining.minutes > 0 ? `${timeRemaining.minutes}m left` : 'Ending Soon'

    return {
      ...baseData,
      badge: timeText, // Time remaining in badge position (like rating)
      subtitle: discountText, // Discount info in subtitle position (like price range)
      additionalText: 'Claim', // CTA text in additionalText position (like distance)
      showHeart: true,
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
