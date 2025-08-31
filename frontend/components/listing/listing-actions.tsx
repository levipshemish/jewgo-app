"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronDown, Clock, X, MapPin } from "lucide-react"
import { Stack, Cluster } from "@/components/ui/spacing"

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
    lat: number
    lng: number
  }
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
    ? calculateDistance(userLocation.lat, userLocation.lng, location.latitude, location.longitude)
    : null;

  // Only show distance if we have valid user location and restaurant location
  const shouldShowDistance = userLocation && location && distance && 
    typeof userLocation.lat === 'number' && 
    typeof userLocation.lng === 'number' &&
    typeof location.latitude === 'number' && 
    typeof location.longitude === 'number';

  return (
    <>
      <div className="p-0">
        <Stack gap={3}>
          {/* Distance Section - Only show when user location is available */}
          {shouldShowDistance && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddressClick}
                className="flex items-center justify-center gap-2 text-sm text-gray-900 font-bold h-auto p-0 hover:bg-transparent hover:text-blue-600 transition-colors group mx-auto"
              >
                {distance} away
              </Button>
            </div>
          )}

          {/* Address Section - Always show */}
          {address && (
            <div className="text-center">
              <span className="text-sm text-gray-900 font-bold">{address}</span>
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
              {secondaryActions.map((action, index) => (
                action.label && action.onClick && (
                  <Button
                    key={index}
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

          {/* Bottom action */}
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

          {/* Tags */}
          {tags.length > 0 && (
            <Cluster gap={2}>
              {tags.map((tag, index) => {
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

                return (
                  <Button
                    key={index}
                    variant="secondary"
                    onClick={() => onTagClick?.(tag)}
                    className={`${getKosherTagColor(tag)} hover:scale-105 active:scale-95 rounded-full px-3 sm:px-4 py-1 text-sm transition-all flex-1`}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{bottomAction.hoursInfo.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHours(false)}
                  className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Hours content */}
            <div className="p-4">
              <div className="space-y-2">
                {bottomAction.hoursInfo.hours.map((item, index) => (
                  <div
                    key={index}
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
        </div>
      )}
    </>
  )
}
