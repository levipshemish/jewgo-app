"use client"

import React, { useState } from 'react'
import { ClaimModalProps } from '@/types/specials'
import { useSpecialClaim, useGuestSession } from '@/hooks/use-specials'
import { specialsApi } from '@/lib/api/specials'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, X, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Modal for claiming specials
 */
export default function ClaimModal({
  special,
  isOpen,
  onClose,
  onClaim,
  isLoading: externalLoading = false,
  error: externalError,
}: ClaimModalProps) {
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const guestSessionId = useGuestSession()
  
  const { claim, loading: claimLoading, error: claimError } = useSpecialClaim()

  const isLoading = externalLoading || claimLoading || claiming
  const displayError = externalError || claimError || error

  const handleClaim = async () => {
    if (!special) return

    try {
      setClaiming(true)
      setError(null)
      setClaimResult(null)

      const result = await claim(special, guestSessionId || undefined)
      setClaimResult(result)
      
      // Call parent callback
      if (onClaim) {
        await onClaim(special)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim special')
    } finally {
      setClaiming(false)
    }
  }

  const handleClose = () => {
    setClaimResult(null)
    setError(null)
    onClose()
  }

  const formatTimeRemaining = () => {
    if (!special) return 'No special selected'
    const remaining = specialsApi.getTimeRemaining(special)
    
    if (remaining.isExpired) {
      return 'Expired'
    }

    const { hours, minutes } = remaining
    
    if (hours > 0) {
      return `${hours} hours and ${minutes} minutes`
    } else {
      return `${minutes} minutes`
    }
  }

  if (!isOpen || !special) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                Claim Special
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {claimResult ? (
              /* Success State */
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Special Claimed Successfully!
                </h4>
                
                <p className="text-sm text-gray-600 mb-4">
                  You&apos;ve successfully claimed &ldquo;{special.title}&rdquo;
                </p>

                {claimResult.redeem_code && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Your Redeem Code:
                    </p>
                    <div className="text-2xl font-mono font-bold text-blue-600 text-center">
                      {claimResult.redeem_code}
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      Show this code to staff when you visit the restaurant
                    </p>
                  </div>
                )}

                {claimResult.terms && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-medium text-yellow-900 mb-2">
                      Terms & Conditions:
                    </h5>
                    <p className="text-xs text-yellow-800">
                      {claimResult.terms}
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Claimed on {new Date(claimResult.claimed_at).toLocaleString()}
                </div>
              </div>
            ) : (
              /* Claim Form */
              <div>
                {/* Special Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    {special.hero_image_url && (
                      <img
                        src={special.hero_image_url}
                        alt={special.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-medium text-gray-900 mb-1">
                        {special.title}
                      </h4>
                      
                      {special.subtitle && (
                        <p className="text-sm text-gray-600 mb-2">
                          {special.subtitle}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTimeRemaining()} left
                        </div>
                        
                        {special.max_claims_total && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {special.max_claims_total} available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discount Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">
                      {specialsApi.formatDiscountLabel(special)}
                    </span>
                    <Badge className="bg-green-600 text-white">
                      {special.discount_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Terms */}
                {special.terms && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-medium text-yellow-900 mb-2">
                      Terms & Conditions:
                    </h5>
                    <p className="text-xs text-yellow-800">
                      {special.terms}
                    </p>
                  </div>
                )}

                {/* Error Display */}
                {displayError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-sm text-red-800">{displayError}</p>
                    </div>
                  </div>
                )}

                {/* Claim Limit Info */}
                {special.user_claims_remaining > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      You have <span className="font-medium">{special.user_claims_remaining}</span> claim{special.user_claims_remaining !== 1 ? 's' : ''} remaining for this special
                    </p>
                  </div>
                )}

                {/* Instructions */}
                <div className="text-sm text-gray-600 mb-4">
                  <p>
                    By claiming this special, you agree to the terms and conditions above.
                    {special.requires_code && ' You will receive a redeem code to show at the restaurant.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {claimResult ? (
              <Button
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="mt-3 w-full sm:mt-0 sm:w-auto sm:mr-3"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleClaim}
                  disabled={isLoading || !special.can_claim}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Claiming...
                    </>
                  ) : (
                    `Claim Special`
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
