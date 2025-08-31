import { EateryDB, UserLocation } from "@/types/listing"

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  eateryLocation: { latitude: number; longitude: number },
  userLocation: UserLocation
): string {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(userLocation.lat - eateryLocation.latitude)
  const dLon = toRadians(userLocation.lng - eateryLocation.longitude)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(eateryLocation.latitude)) * 
    Math.cos(toRadians(userLocation.lat)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  // Format distance
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  } else {
    return `${distance.toFixed(1)}km`
  }
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format hours for the popup display
 */
export function formatHoursForPopup(hours: EateryDB['hours']): Array<{ day: string; time: string }> {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  const result: Array<{ day: string; time: string }> = days.map(day => {
    const dayKey = day.toLowerCase() as keyof EateryDB['hours']
    const dayHours = hours[dayKey]
    
    // Default case
    if (!dayHours) {
      return { day, time: 'Closed' }
    }
    
    // Handle the hours object format
    if (dayHours.closed) {
      return { day, time: 'Closed' }
    }
    
    return { 
      day, 
      time: `${dayHours.open} - ${dayHours.close}`
    }
  })
  
  return result
}

/**
 * Open image carousel popup
 */
export function openImageCarousel(images: string[], currentIndex: number = 0) {
  // This would typically open a modal or navigate to a carousel page
  console.log('Opening image carousel:', { images, currentIndex })
  
  // For now, we'll just open the first image in a new tab
  if (images.length > 0) {
    window.open(images[currentIndex], '_blank')
  }
}

/**
 * Open hours popup
 */
export function openHoursPopup(hours: EateryDB['hours']) {
  // This would typically open a modal with hours
  console.log('Opening hours popup:', hours)
  
  // For now, we'll just log the hours
  const formattedHours = formatHoursForPopup(hours)
  console.table(formattedHours)
}

/**
 * Open directions in maps
 */
export function openDirections(location: { latitude: number; longitude: number }) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
  window.open(url, '_blank')
}

/**
 * Handle order action
 */
export function handleOrder(orderUrl?: string) {
  if (orderUrl) {
    window.open(orderUrl, '_blank')
  } else {
    console.log('Order URL not available')
  }
}

/**
 * Handle favorite action
 */
export function handleFavorite(eateryId: string) {
  console.log('Toggling favorite for eatery:', eateryId)
  // TODO: Implement favorite functionality
}

/**
 * Handle share action
 */
export function handleShare(eateryId: string) {
  if (navigator.share) {
    navigator.share({
      title: 'Check out this restaurant!',
      url: `${window.location.origin}/eatery/${eateryId}`,
    })
  } else {
    // Fallback: copy to clipboard
    const url = `${window.location.origin}/eatery/${eateryId}`
    navigator.clipboard.writeText(url)
    console.log('URL copied to clipboard:', url)
  }
}

/**
 * Handle email action
 */
export function handleEmail(email?: string) {
  if (email) {
    window.location.href = `mailto:${email}`
  } else {
    // Show popup for no email available
    alert('No email address available for this restaurant.')
  }
}

/**
 * Handle tag click
 */
export function handleTagClick(tag: string) {
  console.log('Tag clicked:', tag)
  // TODO: Implement tag filtering or search
}

/**
 * Format price range for display
 */
export function formatPriceRange(priceRange?: string): string {
  if (!priceRange) return "Price not set"
  
  // Ensure it starts with $
  if (!priceRange.startsWith('$')) {
    return `$${priceRange}`
  }
  
  return priceRange
}

/**
 * Format rating for display
 */
export function formatRating(rating?: number): string {
  if (!rating) return "No rating"
  return `${rating.toFixed(1)}`
}
