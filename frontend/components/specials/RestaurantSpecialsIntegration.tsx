"use client"

import React, { useState, useEffect } from 'react'
import { SpecialsDisplay, SpecialCard } from './index'
import type { Special } from '../../types/specials'

interface RestaurantSpecialsIntegrationProps {
  restaurantId: number
  className?: string
  variant?: 'compact' | 'full' | 'card'
  showTitle?: boolean
  maxItems?: number
}

export default function RestaurantSpecialsIntegration({
  restaurantId,
  className = "",
  variant = 'full',
  showTitle = true,
  maxItems = 3
}: RestaurantSpecialsIntegrationProps) {
  const [specials, setSpecials] = useState<Special[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpecials = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch specials for this restaurant
        const response = await fetch(`/api/v5/specials?restaurant_id=${restaurantId}&limit=${maxItems}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch specials: ${response.status}`)
        }
        
        const data = await response.json()
        setSpecials(data.specials || [])
      } catch (err) {
        console.error('Error fetching specials:', err)
        setError(err instanceof Error ? err.message : 'Failed to load specials')
      } finally {
        setLoading(false)
      }
    }

    if (restaurantId) {
      fetchSpecials()
    }
  }, [restaurantId, maxItems])

  if (loading) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
        )}
        <div className="space-y-3">
          {Array.from({ length: Math.min(2, maxItems) }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Specials</h3>
        )}
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          Unable to load specials at this time
        </div>
      </div>
    )
  }

  if (!specials.length) {
    return null // Don't show anything if no specials
  }

  const renderSpecials = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className="space-y-2">
            <SpecialsDisplay
              restaurantId={restaurantId}
              limit={maxItems}
              showTitle={showTitle}
            />
          </div>
        )
      
      case 'card':
        return (
          <div className="grid gap-3">
            {specials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                compact={true}
              />
            ))}
          </div>
        )
      
      case 'full':
      default:
        return (
          <div className="space-y-4">
            <SpecialsDisplay
              restaurantId={restaurantId}
              limit={maxItems}
              showTitle={showTitle}
            />
          </div>
        )
    }
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Current Specials
          </h3>
          {specials.length > maxItems && (
            <span className="text-sm text-gray-500">
              +{specials.length - maxItems} more
            </span>
          )}
        </div>
      )}
      
      {renderSpecials()}
      
      {specials.length > maxItems && variant === 'full' && (
        <div className="mt-4">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all specials →
          </button>
        </div>
      )}
    </div>
  )
}

// Export variants for easy use
export const RestaurantSpecialsCompact = (props: Omit<RestaurantSpecialsIntegrationProps, 'variant'>) => (
  <RestaurantSpecialsIntegration {...props} variant="compact" />
)

export const RestaurantSpecialsCard = (props: Omit<RestaurantSpecialsIntegrationProps, 'variant'>) => (
  <RestaurantSpecialsIntegration {...props} variant="card" />
)
