"use client"

import React from 'react'
import { Special } from '@/types/specials'
import { useSpecialClaimModal } from '@/hooks/use-specials'
import SpecialsDisplay from './SpecialsDisplay'
import ClaimModal from './ClaimModal'
import { useSpecialClaim } from '@/hooks/use-specials'

/**
 * Example integration component showing how to add specials to a restaurant page
 */
interface SpecialsIntegrationProps {
  restaurantId: number
  restaurantName?: string
  className?: string
}

export default function SpecialsIntegration({
  restaurantId,
  restaurantName: _restaurantName = "Restaurant",
  className = "",
}: SpecialsIntegrationProps) {
  const { isOpen, selectedSpecial, openModal, closeModal } = useSpecialClaimModal()
  const { claim } = useSpecialClaim()

  const handleClaimClick = (special: Special) => {
    openModal(special)
  }

  const handleShareClick = (special: Special) => {
    // Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: special.title,
        text: special.description || special.subtitle,
        url: window.location.href,
      })
    } else {
      // Fallback to copying URL to clipboard
      navigator.clipboard.writeText(window.location.href)
      // You could show a toast notification here
      console.log('URL copied to clipboard')
    }
  }

  const handleSpecialClick = (special: Special) => {
    // Navigate to special details or expand view
    console.log('View special details:', special)
  }

  const handleClaim = async (special: Special) => {
    try {
      await claim(special)
      // Success is handled in the modal
      console.log('Special claimed successfully')
    } catch (error) {
      // Error is handled in the modal
      console.error('Failed to claim special:', error)
    }
  }

  return (
    <div className={className}>
      {/* Main Specials Display */}
      <SpecialsDisplay
        restaurantId={restaurantId}
        window="now"
        limit={6}
        showTitle={true}
        showDescription={true}
        showMedia={true}
        onSpecialClick={handleSpecialClick}
        onClaimClick={handleClaimClick}
        onShareClick={handleShareClick}
      />

      {/* Claim Modal */}
      <ClaimModal
        special={selectedSpecial}
        isOpen={isOpen}
        onClose={closeModal}
        onClaim={handleClaim}
      />
    </div>
  )
}

/**
 * Compact version for restaurant cards or lists
 */
export function SpecialsIntegrationCompact({
  restaurantId,
  limit = 2,
}: {
  restaurantId: number
  limit?: number
}) {
  const { isOpen, selectedSpecial, openModal, closeModal } = useSpecialClaimModal()
  const { claim } = useSpecialClaim()

  const handleClaimClick = (special: Special) => {
    openModal(special)
  }

  const handleClaim = async (special: Special) => {
    try {
      await claim(special)
    } catch (error) {
      console.error('Failed to claim special:', error)
    }
  }

  return (
    <>
      <SpecialsDisplay
        restaurantId={restaurantId}
        window="now"
        limit={limit}
        showTitle={false}
        showDescription={false}
        showMedia={false}
        onClaimClick={handleClaimClick}
      />

      <ClaimModal
        special={selectedSpecial}
        isOpen={isOpen}
        onClose={closeModal}
        onClaim={handleClaim}
      />
    </>
  )
}

/**
 * Example usage in a restaurant detail page
 */
export function RestaurantSpecialsSection({
  restaurantId,
  restaurantName,
}: {
  restaurantId: number
  restaurantName: string
}) {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Specials at {restaurantName}
          </h2>
          <p className="text-lg text-gray-600">
            Discover current offers and promotions
          </p>
        </div>

        <SpecialsIntegration
          restaurantId={restaurantId}
          restaurantName={restaurantName}
        />
      </div>
    </section>
  )
}

/**
 * Example usage in a restaurant card
 */
export function RestaurantCardWithSpecials({
  restaurantId,
  restaurantName,
  restaurantImage,
}: {
  restaurantId: number
  restaurantName: string
  restaurantImage?: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Restaurant Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          {restaurantImage && (
            <img
              src={restaurantImage}
              alt={restaurantName}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{restaurantName}</h3>
            <p className="text-sm text-gray-600">Kosher Restaurant</p>
          </div>
        </div>
      </div>

      {/* Specials Section */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">Current Specials</h4>
        <SpecialsIntegrationCompact restaurantId={restaurantId} limit={2} />
      </div>
    </div>
  )
}
