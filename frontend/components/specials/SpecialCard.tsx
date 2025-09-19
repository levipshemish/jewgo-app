"use client"

import React, { useState, useEffect } from 'react'
import { SpecialCardProps } from '@/types/specials'
import { specialsApi } from '@/lib/api/specials'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Share2 } from 'lucide-react'

/**
 * Component for displaying individual special cards
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
  const [timeRemaining, setTimeRemaining] = useState(
    specialsApi.getTimeRemaining(special)
  )
  const [isActive, setIsActive] = useState(specialsApi.isSpecialActive(special))
  const [status] = useState(specialsApi.getSpecialStatus(special))

  // Update time remaining every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = specialsApi.getTimeRemaining(special)
      setTimeRemaining(remaining)
      setIsActive(specialsApi.isSpecialActive(special))
    }, 1000)

    return () => clearInterval(interval)
  }, [special])

  const formatTimeRemaining = () => {
    if (timeRemaining.isExpired) {
      return 'Expired'
    }

    const { hours, minutes, seconds } = timeRemaining
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s left`
    } else {
      return `${seconds}s left`
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDiscountColor = () => {
    if (special.discount_type === 'percentage') {
      return 'bg-gradient-to-r from-green-500 to-emerald-600'
    } else if (special.discount_type === 'fixed_amount') {
      return 'bg-gradient-to-r from-blue-500 to-cyan-600'
    } else if (special.discount_type === 'bogo') {
      return 'bg-gradient-to-r from-purple-500 to-pink-600'
    } else {
      return 'bg-gradient-to-r from-orange-500 to-red-600'
    }
  }

  const handleClaim = () => {
    if (onClaim && special.can_claim) {
      onClaim(special)
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare(special)
    }
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(special)
    }
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 ${
        compact ? 'max-w-sm' : ''
      }`}
    >
      {/* Hero Image */}
      {special.hero_image_url && (
        <div className="relative h-48 bg-gray-200">
          <img
            src={special.hero_image_url}
            alt={special.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge className={`${getStatusColor()} text-xs font-medium`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          {/* Discount Badge */}
          <div className="absolute top-3 right-3">
            <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ${getDiscountColor()}`}>
              {specialsApi.formatDiscountLabel(special)}
            </div>
          </div>

          {/* Time Remaining */}
          {isActive && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {formatTimeRemaining()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title and Subtitle */}
        <div className="mb-3">
          <h3 
            className={`font-bold text-gray-900 mb-1 ${compact ? 'text-lg' : 'text-xl'} ${
              onViewDetails ? 'cursor-pointer hover:text-blue-600' : ''
            }`}
            onClick={handleViewDetails}
          >
            {special.title}
          </h3>
          {special.subtitle && (
            <p className="text-gray-600 text-sm">{special.subtitle}</p>
          )}
        </div>

        {/* Description */}
        {!compact && special.description && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-3">
            {special.description}
          </p>
        )}

        {/* Discount Details */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-green-600">
              {specialsApi.formatDiscountLabel(special)}
            </span>
            {special.max_claims_total && (
              <span className="text-sm text-gray-500 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {special.max_claims_total} available
              </span>
            )}
          </div>
        </div>

        {/* Time Information */}
        <div className="mb-3 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Valid until:</span>
            <span className="font-medium">
              {new Date(special.valid_until).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* User Claims Remaining */}
        {special.user_claims_remaining > 0 && (
          <div className="mb-3">
            <Badge variant="outline" className="text-xs">
              {special.user_claims_remaining} claim{special.user_claims_remaining !== 1 ? 's' : ''} remaining
            </Badge>
          </div>
        )}

        {/* Terms */}
        {!compact && special.terms && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 italic">
              {special.terms}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex space-x-2">
            {showShareButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center"
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {showClaimButton && special.can_claim && isActive && (
              <Button
                onClick={handleClaim}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Claim Special
              </Button>
            )}
            
            {!special.can_claim && isActive && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-gray-500"
              >
                Already Claimed
              </Button>
            )}

            {!isActive && status === 'expired' && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-gray-500"
              >
                Expired
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version for smaller displays
 */
export function SpecialCardCompact(props: SpecialCardProps) {
  return <SpecialCard {...props} compact={true} />
}

/**
 * Featured special card with larger display
 */
export function FeaturedSpecialCard({ special, onClaim, onShare }: SpecialCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Large Hero Image */}
      {special.hero_image_url && (
        <div className="relative h-64 bg-gray-200">
          <img
            src={special.hero_image_url}
            alt={special.title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-green-600 text-white">
                Featured Special
              </Badge>
              <div className="text-2xl font-bold">
                {specialsApi.formatDiscountLabel(special)}
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">{special.title}</h2>
            {special.subtitle && (
              <p className="text-lg opacity-90 mb-4">{special.subtitle}</p>
            )}
            
            <div className="flex items-center space-x-4">
              {special.can_claim && specialsApi.isSpecialActive(special) && (
                <Button
                  onClick={() => onClaim?.(special)}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Claim Now
                </Button>
              )}
              
              {onShare && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onShare(special)}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
