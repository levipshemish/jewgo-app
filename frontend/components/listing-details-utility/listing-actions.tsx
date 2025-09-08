"use client"

import { Button } from "@/components/ui-listing-utility/button"
import { useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Clock, X, MapPin } from "lucide-react"
import { Stack, Cluster } from "@/components/ui-listing-utility/spacing"

interface ListingActionsProps {
  primaryAction?: {
    label?: string
    onClick?: () => void
  }
  secondaryActions?: Array<{
    label?: string
    onClick?: () => void
  }>
  tags?: string[]
  onTagClick?: (tag: string) => void
  bottomAction?: {
    label?: string
    onClick?: () => void
    hoursInfo?: {
      title: string
      hours: Array<{
        day: string
        time: string
      }>
    }
  }
  address?: string
  location?: {
    latitude: number
    longitude: number
  }
  userLocation?: {
    latitude: number
    longitude: number
  }
  onLocationRequest?: () => void
  priceRange?: string
}

export function ListingActions({
  primaryAction,
  secondaryActions = [],
  tags = [],
  onTagClick,
  bottomAction,
  address,
  location,
  userLocation,
  onLocationRequest: _onLocationRequest,
  priceRange: _priceRange,
}: ListingActionsProps) {
  
  const [showHours, setShowHours] = useState(false)

  const handleAddressClick = () => {
    if (location) {
      // Use the same openDirections function pattern
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
      window.open(url, '_blank')
    } else if (address) {
      // Fallback: search for the address in Google Maps
      const encodedAddress = encodeURIComponent(address)
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
      window.open(url, '_blank')
    }
  }

  // Calculate distance between user and restaurant
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  const distance = userLocation && location 
    ? calculateDistance(userLocation.latitude, userLocation.longitude, location.latitude, location.longitude)
    : null;

  // Only show distance if we have valid user location and restaurant location
  const shouldShowDistance = userLocation && location && distance && 
    typeof userLocation.latitude === 'number' && 
    typeof userLocation.longitude === 'number' &&
    typeof location.latitude === 'number' && 
    typeof location.longitude === 'number';

  return (
    <>
      <div className="p-0">
        <Stack gap={3}>

          {/* Hours Section - Moved to top */}
          {bottomAction && bottomAction.label && (
            <Button
              onClick={() => {
                if (bottomAction.hoursInfo) {
                  setShowHours(true)
                } else {
                  bottomAction.onClick?.()
                }
              }}
              variant="secondary"
              className="w-full bg-black hover:bg-gray-800 hover:scale-[1.02] active:scale-95 text-white rounded-full py-2 transition-all flex items-center justify-center gap-2"
            >
              {bottomAction.hoursInfo && <Clock size={16} />}
              {bottomAction.label}
              {bottomAction.hoursInfo && <ChevronDown size={16} />}
            </Button>
          )}

          {/* Address Section - Always show */}
          {address && (
            <div className="flex justify-center w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddressClick}
                className="flex items-center justify-center text-sm text-gray-900 font-bold h-auto p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors group rounded-full px-2 py-1 text-center max-w-full"
              >
                <span className="text-center">{address}</span>
              </Button>
            </div>
          )}

          {/* Location/Distance Section */}
          {location && (
            <div className="flex justify-center w-full">
              {shouldShowDistance ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddressClick}
                  className="flex items-center justify-center gap-1 text-sm text-blue-600 font-medium h-auto p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors group rounded-full px-2 py-1 text-center max-w-full [&>svg]:px-0 [&>svg]:mx-0 [&>svg]:ml-0 [&>svg]:mr-0"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-center">{distance} away</span>
                </Button>
              ) : _onLocationRequest ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={_onLocationRequest}
                  className="flex items-center justify-center gap-1 text-sm text-gray-600 font-medium h-auto p-0 hover:bg-gray-50 hover:text-gray-700 transition-colors group rounded-full px-2 py-1 text-center max-w-full [&>svg]:px-0 [&>svg]:mx-0 [&>svg]:ml-0 [&>svg]:mr-0"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-center">Get Location</span>
                </Button>
              ) : null}
            </div>
          )}

          {/* Primary action button */}
          {primaryAction && primaryAction.label && primaryAction.onClick && (
            <Button
              onClick={primaryAction.onClick}
              className="w-full bg-green-500 hover:bg-green-600 hover:scale-[1.02] active:scale-[0.98] text-white rounded-full py-3 transition-all shadow-lg"
            >
              {primaryAction.label}
            </Button>
          )}

          {/* Secondary action buttons */}
          {secondaryActions.length > 0 && (
            <Cluster gap={3}>
              {secondaryActions.map((action) => (
                action.label && action.onClick && (
                  <Button
                    key={action.label}
                    variant="secondary"
                    onClick={action.onClick}
                    className="bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 text-white rounded-full px-3 sm:px-4 py-1 text-sm transition-all flex-1"
                  >
                    {action.label}
                  </Button>
                )
              ))}
            </Cluster>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <Cluster gap={2} className="justify-center">
              {tags.map((tag) => {
                // Determine kosher tag color based on content - matching image tag styling
                const getKosherTagColor = (tagText: string) => {
                  const lowerTag = tagText.toLowerCase();
                  if (lowerTag.includes('parve') || lowerTag.includes('pareve') || lowerTag.includes('neutral')) {
                    return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
                  } else if (lowerTag.includes('meat') || lowerTag.includes('fleishig')) {
                    return 'bg-red-100 text-red-700 hover:bg-red-200';
                  } else if (lowerTag.includes('dairy') || lowerTag.includes('milchig')) {
                    return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
                  } else if (lowerTag.includes('pas yisroel') || lowerTag.includes('cholov yisroel')) {
                    return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
                  } else {
                    return 'bg-green-100 text-green-700 hover:bg-green-200';
                  }
                };

                // Determine if tag should be clickable and get the appropriate URL
                const getTagUrl = (tagText: string): string | null => {
                  const lowerTag = tagText.toLowerCase();
                  
                  // Check for ORB (Orthodox Rabbinical Board) variations
                  if (lowerTag.includes('orb') || 
                      lowerTag.includes('orthodox rabbinical board') ||
                      lowerTag.includes('orthodox rabbinical board')) {
                    return 'https://www.orbkosher.com/';
                  }
                  
                  // Check for Kosher Miami variations
                  if (lowerTag.includes('kosher miami') || 
                      lowerTag.includes('vaad hakashrus') ||
                      lowerTag.includes('vaad') ||
                      lowerTag.includes('miami-dade')) {
                    return 'https://koshermiami.org/';
                  }
                  
                  return null;
                };

                const tagUrl = getTagUrl(tag);
                const isClickable = tagUrl !== null;

                // Handle tag click
                const handleTagClick = () => {
                  if (isClickable && tagUrl) {
                    window.open(tagUrl, '_blank');
                  } else {
                    onTagClick?.(tag);
                  }
                };

                return (
                  <Button
                    key={`tag-${tag}`}
                    variant="secondary"
                    onClick={handleTagClick}
                    className={`${getKosherTagColor(tag)} hover:scale-105 active:scale-95 rounded-full px-3 sm:px-4 py-1 text-sm transition-all ${
                      isClickable ? 'cursor-pointer' : ''
                    }`}
                  >
                    {tag}
                  </Button>
                );
              })}
            </Cluster>
          )}
        </Stack>
      </div>

      {bottomAction?.hoursInfo && showHours && (
        typeof window !== 'undefined' ? createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{bottomAction.hoursInfo.title}</h3>
                <button
                  onClick={() => setShowHours(false)}
                  className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full text-black hover:text-gray-800 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Hours content */}
            <div className="p-4">
              <div className="space-y-2">
                {bottomAction.hoursInfo.hours.map((item) => (
                  <div
                    key={`hours-${item.day}-${item.time}`}
                    className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-600 font-medium text-sm">{item.day}</span>
                    <span className="text-gray-900 font-semibold bg-gray-50 px-2 py-0.5 rounded-full text-xs">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null
      )}
    </>
  )
}
