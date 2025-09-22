"use client"

import React, { useEffect, useRef } from 'react'
import { Special, SpecialsDisplayProps } from '@/types/specials'
import { useSpecials, useSpecialEvents, useGuestSession } from '@/hooks/use-specials'
import SpecialCard from './SpecialCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { specialsApi } from '@/lib/api/specials'

/**
 * Main component for displaying specials for a restaurant
 */
export default function SpecialsDisplay({
  restaurantId,
  window = 'now',
  from,
  until,
  limit = 20,
  showTitle = true,
  showDescription = true,
  showMedia = true,
  onSpecialClick,
  onClaimClick,
  onShareClick,
}: SpecialsDisplayProps) {
  const guestSessionId = useGuestSession()
  const { trackEvent } = useSpecialEvents()
  
  const {
    specials,
    loading,
    error,
    total,
    hasMore,
    refetch,
    loadMore,
  } = useSpecials(restaurantId, {
    window,
    from,
    until,
    limit,
  })

  const viewedSpecialsRef = useRef<Set<string>>(new Set())

  // Track view events for visible specials
  useEffect(() => {
    if (specials.length === 0) {
      return
    }

    const unseenSpecials = specials.filter((special) => {
      if (viewedSpecialsRef.current.has(special.id)) {
        return false
      }
      viewedSpecialsRef.current.add(special.id)
      return true
    })

    if (unseenSpecials.length === 0) {
      return
    }

    const events = unseenSpecials.map((special) => ({
      specialId: special.id,
      eventType: 'view' as const,
      guestSessionId: guestSessionId || undefined,
    }))

    specialsApi.batchTrackEvents(events).catch(() => {
      events.forEach((event) => {
        trackEvent(event.specialId, event.eventType, event.guestSessionId)
      })
    })
  }, [specials, guestSessionId, trackEvent])

  const handleSpecialClick = (special: Special) => {
    // Track click event
    trackEvent(special.id, 'click', guestSessionId || undefined)
    
    if (onSpecialClick) {
      onSpecialClick(special)
    }
  }

  const handleClaimClick = (special: Special) => {
    if (onClaimClick) {
      onClaimClick(special)
    }
  }

  const handleShareClick = (special: Special) => {
    // Track share event
    trackEvent(special.id, 'share', guestSessionId || undefined)
    
    if (onShareClick) {
      onShareClick(special)
    }
  }

  if (loading && specials.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading specials...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="font-medium">Failed to load specials</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
        <Button onClick={refetch} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (specials.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium text-gray-600">No specials available</p>
          <p className="text-sm text-gray-500">
            {window === 'now' 
              ? 'Check back later for new offers'
              : 'No specials found for the selected time period'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Current Specials
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({total} available)
              </span>
            )}
          </h2>
          <Button onClick={refetch} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {specials.map((special) => (
          <SpecialCard
            key={special.id}
            special={special}
            onClaim={handleClaimClick}
            onShare={handleShareClick}
            onViewDetails={handleSpecialClick}
            showClaimButton={true}
            showShareButton={true}
            compact={false}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center pt-6">
          <Button 
            onClick={loadMore} 
            variant="outline"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Loading...</span>
              </>
            ) : (
              'Load More Specials'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for displaying specials in smaller spaces
 */
export function SpecialsDisplayCompact(props: SpecialsDisplayProps) {
  return (
    <SpecialsDisplay
      {...props}
      limit={props.limit || 3}
      showTitle={false}
      showDescription={false}
    />
  )
}

/**
 * Component for displaying upcoming specials
 */
export function UpcomingSpecials({ restaurantId, limit = 5 }: { restaurantId: number; limit?: number }) {
  return (
    <SpecialsDisplay
      restaurantId={restaurantId}
      window="today"
      limit={limit}
      showTitle={true}
    />
  )
}

/**
 * Component for displaying specials within a specific time range
 */
export function SpecialsInRange({
  restaurantId,
  from,
  until,
  limit = 10,
}: {
  restaurantId: number
  from: string
  until: string
  limit?: number
}) {
  return (
    <SpecialsDisplay
      restaurantId={restaurantId}
      window="range"
      from={from}
      until={until}
      limit={limit}
      showTitle={true}
    />
  )
}
