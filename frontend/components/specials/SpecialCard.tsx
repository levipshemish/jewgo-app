"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Card, { type CardData } from '@/components/core/cards/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Share2 } from 'lucide-react'
import { useTimeNow } from '@/contexts/TimeUpdateProvider'
import { specialsApi } from '@/lib/api/specials'
import type { SpecialCardProps } from '@/types/specials'

/**
 * Compact special card that reuses the eatery Card styling.
 */
export default function SpecialCard({
  special,
  onClaim,
  onShare,
  onViewDetails,
  showClaimButton = true,
  showShareButton = true,
  compact = false,
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
    const badgeText = (special as unknown as { badge?: { text?: string } })?.badge?.text
      || specialsApi.formatDiscountLabel(special)

    const merchantName = (special as unknown as { merchantName?: string; merchant_name?: string })
      ?.merchantName
      || (special as unknown as { merchant_name?: string })?.merchant_name

    const price = (special as unknown as { price?: { original?: number | string; sale?: number | string } })?.price
      || {
        original: (special as unknown as { price_original?: number | string })?.price_original,
        sale: (special as unknown as { price_sale?: number | string })?.price_sale,
      }

    const timeLeftSeconds = (special as unknown as { timeLeftSeconds?: number })?.timeLeftSeconds
      ?? Math.max(0, Math.floor((new Date(special.valid_until).getTime() - now) / 1000))

    return {
      imageUrl: heroImage,
      badgeText,
      title: special.title,
      merchantName: merchantName || special.subtitle || '',
      price,
      timeLeftSeconds,
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

  const formatCurrency = useCallback((value?: number | string | null) => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const numeric = typeof value === 'string' ? Number(value) : value
    if (Number.isNaN(numeric)) {
      return null
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(numeric)
  }, [])

  const salePrice = formatCurrency(displayData.price?.sale)
  const originalPrice = formatCurrency(displayData.price?.original)

  const cardData: CardData = useMemo(
    () => ({
      id: special.id,
      imageUrl: displayData.imageUrl,
      title: displayData.title,
      badge: displayData.badgeText,
      subtitle: displayData.merchantName,
      additionalText: timeLeftLabel,
      showHeart: true,
    }), [displayData, special.id, timeLeftLabel]
  )

  const handleClaim = useCallback(() => {
    if (onClaim && special.can_claim) {
      onClaim(special)
    }
  }, [onClaim, special])

  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(special)
    }
  }, [onShare, special])

  const handleViewDetails = useCallback(() => {
    if (onViewDetails) {
      onViewDetails(special)
    }
  }, [onViewDetails, special])

  const showClaimCta = showClaimButton && special.can_claim && isActive

  return (
    <div className="flex flex-col gap-2">
      <Card
        data={cardData}
        variant={compact ? 'minimal' : 'default'}
        showStarInBadge={false}
        onCardClick={onViewDetails ? handleViewDetails : undefined}
        className="w-full"
      />

      <div className="flex flex-col gap-2">
        {displayData.badgeText && (
          <Badge className="w-fit text-[11px] font-semibold uppercase tracking-wide">
            {displayData.badgeText}
          </Badge>
        )}

        <div className="flex items-center gap-2 text-sm">
          {salePrice && (
            <span className="font-semibold text-green-600">{salePrice}</span>
          )}
          {originalPrice && originalPrice !== salePrice && (
            <span className="text-xs text-muted-foreground line-through">{originalPrice}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeLeftLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            {showShareButton && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                aria-label="Share special"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}

            <Button
              onClick={handleClaim}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!showClaimCta}
            >
              Claim
            </Button>
          </div>
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
