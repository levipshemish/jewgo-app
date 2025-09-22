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
  const status = useMemo(() => specialsApi.getSpecialStatus(special), [special])

  const requiresSecondPrecision = useMemo(
    () => isActive && timeRemaining.total <= 60_000,
    [isActive, timeRemaining.total]
  )
  const now = useTimeNow({ requireSecondPrecision })

  useEffect(() => {
    const remaining = specialsApi.getTimeRemaining(special)
    setTimeRemaining(remaining)
    setIsActive(specialsApi.isSpecialActive(special))
  }, [special, now])

  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining.isExpired) {
      return 'Expired'
    }

    const { hours, minutes, seconds } = timeRemaining
    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s left`
    }
    return `${seconds}s left`
  }, [timeRemaining])

  const statusLabel = useMemo(
    () => status.charAt(0).toUpperCase() + status.slice(1),
    [status]
  )

  const timingLabel = useMemo(() => {
    if (status === 'active') {
      return formatTimeRemaining()
    }
    if (status === 'upcoming') {
      return `Starts ${new Date(special.valid_from).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`
    }
    return 'Expired'
  }, [status, special.valid_from, formatTimeRemaining])

  const timingDescription = useMemo(() => {
    const describe = (value: string) =>
      new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

    if (status === 'active') {
      return `Valid until ${describe(special.valid_until)}`
    }
    if (status === 'upcoming') {
      return `Starts ${describe(special.valid_from)}`
    }
    return `Expired ${describe(special.valid_until)}`
  }, [status, special.valid_from, special.valid_until])

  const heroImage = special.hero_image_url || special.media_items?.[0]?.url

  const cardData: CardData = useMemo(
    () => ({
      id: special.id,
      imageUrl: heroImage,
      title: special.title,
      badge: specialsApi.formatDiscountLabel(special),
      subtitle: special.subtitle || '',
      additionalText: timingLabel,
      showHeart: false,
      imageTag: statusLabel,
    }), [heroImage, special.id, special.subtitle, special.title, special, timingLabel, statusLabel]
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

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'upcoming':
        return 'bg-blue-100 text-blue-700'
      case 'expired':
        return 'bg-gray-100 text-gray-600'
      case 'inactive':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const showClaimCta = showClaimButton && special.can_claim && isActive
  const rightStatusLabel = !special.can_claim && isActive ? 'Claimed' : statusLabel

  return (
    <div className="flex flex-col gap-2">
      <Card
        data={cardData}
        variant={compact ? 'minimal' : 'default'}
        showStarInBadge={false}
        onCardClick={onViewDetails ? handleViewDetails : undefined}
        className="w-full"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${getStatusColor()}`}>
            {statusLabel}
          </span>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="leading-none">{timingDescription}</span>
          </div>
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

          {showClaimCta ? (
            <Button
              onClick={handleClaim}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Claim
            </Button>
          ) : (
            <Badge variant="outline" className="text-[11px] capitalize">
              {rightStatusLabel}
            </Badge>
          )}
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
