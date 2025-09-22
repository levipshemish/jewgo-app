"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronDown, Clock, MapPin, Globe, Phone, Mail, ShoppingCart } from "lucide-react"
import { Stack, Cluster } from "@/components/ui/spacing"

// Utility function to determine restaurant status
function getRestaurantStatus(hoursArray: any[]) {
  if (!hoursArray || !Array.isArray(hoursArray) || hoursArray.length === 0) {
    return {
      status: 'unknown',
      statusText: 'Hours not available',
      statusColor: 'text-gray-500',
      nextTime: '',
      nextTimeLabel: ''
    }
  }

  // If every entry is explicitly Closed, treat as not available (data missing/unreliable)
  const allClosed = hoursArray.every(h => (h?.time || '').toLowerCase().includes('closed'))
  if (allClosed) {
    return {
      status: 'unknown',
      statusText: 'Hours not available',
      statusColor: 'text-gray-500',
      nextTime: '',
      nextTimeLabel: ''
    }
  }

  const now = new Date()
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() // 'monday', 'tuesday', etc.
  const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight
  
  // Find today's hours from the array
  const todayHours = hoursArray.find(h => h.day.toLowerCase() === currentDay)
  
  if (!todayHours || todayHours.time.toLowerCase().includes('closed')) {
    // Find next opening day
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const currentDayIndex = days.indexOf(currentDay)
    
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (currentDayIndex + i) % 7
      const nextDay = days[nextDayIndex]
      const nextDayHours = hoursArray.find(h => h.day.toLowerCase() === nextDay)
      
      if (nextDayHours && !nextDayHours.time.toLowerCase().includes('closed')) {
        // Extract opening time from the time string
        const timeMatch = nextDayHours.time.match(/(\d{1,2}:\d{2}\s*[AP]M)/)
        const nextOpenTime = timeMatch ? timeMatch[1] : nextDayHours.time.split(' - ')[0]
        
        return {
          status: 'closed',
          statusText: 'Closed',
          statusColor: 'text-red-500',
          nextTime: nextOpenTime,
          nextTimeLabel: `Opens ${nextDay === currentDay ? 'today' : nextDay}`
        }
      }
    }
    
    return {
      status: 'unknown',
      statusText: 'Hours not available',
      statusColor: 'text-gray-500',
      nextTime: '',
      nextTimeLabel: ''
    }
  }
  
  // Parse the time string (e.g., "9:00 AM - 10:00 PM")
  const timeParts = todayHours.time.split(' - ')
  if (timeParts.length !== 2) {
    return {
      status: 'unknown',
      statusText: 'Hours not available',
      statusColor: 'text-gray-500',
      nextTime: '',
      nextTimeLabel: ''
    }
  }
  
  const openTimeStr = timeParts[0].trim()
  const closeTimeStr = timeParts[1].trim()
  
  // Convert time strings to minutes
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [time, period] = timeStr.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    let totalMinutes = hours * 60 + minutes
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60
    if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60
    return totalMinutes
  }
  
  const openTime = timeToMinutes(openTimeStr)
  const closeTime = timeToMinutes(closeTimeStr)
  
  if (currentTime >= openTime && currentTime < closeTime) {
    return {
      status: 'open',
      statusText: 'Open',
      statusColor: 'text-green-500',
      nextTime: closeTimeStr,
      nextTimeLabel: 'Closes'
    }
  } else if (currentTime < openTime) {
    return {
      status: 'closed',
      statusText: 'Closed',
      statusColor: 'text-red-500',
      nextTime: openTimeStr,
      nextTimeLabel: 'Opens'
    }
  } else {
    // Closed for today, find next opening
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const currentDayIndex = days.indexOf(currentDay)
    
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (currentDayIndex + i) % 7
      const nextDay = days[nextDayIndex]
      const nextDayHours = hoursArray.find(h => h.day.toLowerCase() === nextDay)
      
      if (nextDayHours && !nextDayHours.time.toLowerCase().includes('closed')) {
        const timeMatch = nextDayHours.time.match(/(\d{1,2}:\d{2}\s*[AP]M)/)
        const nextOpenTime = timeMatch ? timeMatch[1] : nextDayHours.time.split(' - ')[0]
        
        return {
          status: 'closed',
          statusText: 'Closed',
          statusColor: 'text-red-500',
          nextTime: nextOpenTime,
          nextTimeLabel: `Opens ${nextDay}`
        }
      }
    }
    
    return {
      status: 'unknown',
      statusText: 'Hours not available',
      statusColor: 'text-gray-500',
      nextTime: '',
      nextTimeLabel: ''
    }
  }
}

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
            <div className="w-full">
              <Button
                onClick={() => {
                  if (bottomAction.hoursInfo) {
                    setShowHours(!showHours)
                  } else {
                    bottomAction.onClick?.()
                  }
                }}
                variant="secondary"
                className="w-full bg-gray-200 hover:bg-gray-300 hover:scale-[1.02] active:scale-95 text-gray-800 rounded-full py-2 transition-all flex items-center justify-center gap-2"
              >
                {bottomAction.hoursInfo && <Clock size={16} />}
                <div className="flex items-center justify-center gap-1.5">
                  {(() => {
                    // Check for no hours data first, before calling getRestaurantStatus
                    if (!bottomAction.hoursInfo?.hours || bottomAction.hoursInfo.hours.length === 0) {
                      return (
                        <span className="text-sm font-medium text-gray-500">
                          Hours not available
                        </span>
                      )
                    }
                    
                    // Check if all hours are empty or invalid
                    const hasValidHours = bottomAction.hoursInfo.hours.some(h => 
                      h && h.day && h.time && h.time.trim() !== ''
                    )
                    
                    if (!hasValidHours) {
                      return (
                        <span className="text-sm font-medium text-gray-500">
                          Hours not available
                        </span>
                      )
                    }

                    // If hours array is the special single-row "Hours: No hours available" or lacks standard weekdays, show Not available
                    const standardDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
                    const hasStandardDay = bottomAction.hoursInfo.hours.some(h => standardDays.includes((h.day || '').toLowerCase()))
                    const allNotAvailable = bottomAction.hoursInfo.hours.every(h => /not available/i.test(h.time || ''))
                    if (!hasStandardDay || allNotAvailable) {
                      return (
                        <span className="text-sm font-medium text-gray-500">
                          Hours not available
                        </span>
                      )
                    }
                    
                    const status = getRestaurantStatus(bottomAction.hoursInfo.hours)
                    
                    // If status function still returns unknown, show "Hours not available"
                    if (status.status === 'unknown') {
                      return (
                        <span className="text-sm font-medium text-gray-500">
                          Hours not available
                        </span>
                      )
                    }
                    
                    // Otherwise show the full status with label
                    return (
                      <>
                        <span className="text-sm font-medium">Hours:</span>
                        <span className={`text-sm font-semibold ${status.statusColor}`}>
                          {status.statusText}
                        </span>
                        {status.nextTime && status.nextTimeLabel && (
                          <span className="text-sm text-gray-600 font-medium">
                            {status.nextTimeLabel}: {status.nextTime}
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>
                {bottomAction.hoursInfo && (
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${showHours ? 'rotate-180' : ''}`} 
                  />
                )}
              </Button>
              
              {/* Hours dropdown */}
              {bottomAction.hoursInfo && showHours && (
                <div className="mt-2 mx-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">{bottomAction.hoursInfo.title}</h3>
                    <div className="space-y-1">
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
              )}
            </div>
          )}

          {/* Address Section - Always show */}
          {address && (
            <div className="flex justify-center w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddressClick}
                className="flex items-center justify-center gap-1 text-sm text-green-600 font-bold h-auto p-0 hover:bg-green-50 hover:text-green-700 transition-colors group rounded-full px-2 py-1 text-center max-w-full"
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-center underline decoration-black">{address}</span>
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

          {/* Secondary action buttons */}
          {secondaryActions.length > 0 && (
            <Cluster gap={3}>
              {secondaryActions.map((action) => {
                // Determine the appropriate icon based on action label
                const getActionIcon = (label?: string) => {
                  if (!label) return null;
                  const lowerLabel = label.toLowerCase();
                  if (lowerLabel.includes('website') || lowerLabel.includes('web')) {
                    return <Globe size={16} />;
                  } else if (lowerLabel.includes('call') || lowerLabel.includes('phone')) {
                    return <Phone size={16} />;
                  } else if (lowerLabel.includes('email') || lowerLabel.includes('mail')) {
                    return <Mail size={16} />;
                  }
                  return null;
                };

                return action.label && action.onClick && (
                  <Button
                    key={action.label}
                    variant="secondary"
                    onClick={action.onClick}
                    className="bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 text-white rounded-full px-3 sm:px-4 py-1 text-sm transition-all flex-1 flex items-center justify-center gap-2"
                  >
                    {getActionIcon(action.label)}
                    {action.label}
                  </Button>
                )
              })}
            </Cluster>
          )}

          {/* Primary action button */}
          {primaryAction && primaryAction.label && primaryAction.onClick && (
            <Button
              onClick={primaryAction.onClick}
              className="w-full bg-green-500 hover:bg-green-600 hover:scale-[1.02] active:scale-[0.98] text-white rounded-full py-3 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              {primaryAction.label}
            </Button>
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

    </>
  )
}
