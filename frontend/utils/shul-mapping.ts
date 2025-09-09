import { ShulDB, UserLocation, ListingData } from "@/types/listing"

// Helper function to calculate distance using Haversine formula
function calculateDistance(location1: { latitude: number; longitude: number }, location2: { lat: number; lng: number }): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (location2.lat - location1.latitude) * Math.PI / 180
  const dLon = (location2.lng - location1.longitude) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${(distance * 5280).toFixed(0)} ft away`
  }
  return `${distance.toFixed(1)} mi away`
}

function _formatRating(rating?: number): string {
  if (!rating) return ''
  return rating.toFixed(1)
}

// Helper functions for actions
function handleFavorite(shulId: string) {
  console.log('Toggle favorite for shul:', shulId)
  // TODO: Implement favorite functionality
}

function _handleShare(shulId: string) {
  console.log('Share shul:', shulId)
  // TODO: Implement share functionality
}

function handleEmail(email: string) {
  console.log('Email shul:', email)
  if (typeof window !== 'undefined') {
    window.location.href = `mailto:${email}`
  }
}

function handleTagClick(tag: string) {
  console.log('Tag clicked:', tag)
  // TODO: Implement tag filtering
}

function _openImageCarousel(images: string[]) {
  console.log('Open image carousel:', images)
  // TODO: Implement image carousel
}

function openDirections(latitude: number, longitude: number) {
  console.log('Open directions to:', latitude, longitude)
  if (typeof window !== 'undefined') {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    window.open(url, '_blank')
  }
}

function handleContact(shul: ShulDB) {
  console.log('Contact shul:', shul.name)
  // TODO: Implement contact functionality
}

/**
 * Map shul database data to listing utility format
 */
export function mapShulToListingData(
  shul: ShulDB, 
  userLocation?: UserLocation | null,
  reviews?: any[],
  onLocationRequest?: () => void,
  locationPermission?: 'granted' | 'denied' | 'prompt' | 'unknown'
): ListingData {
  
  // Debug logging
  console.log('=== SHUL MAPPING DEBUG ===')
  console.log('Shul images:', shul.images)
  console.log('Shul image_url:', shul.image_url)
  console.log('Shul additional_images:', shul.additional_images)
  console.log('User location:', userLocation)
  console.log('Shul location:', shul.location)
  console.log('Location permission:', locationPermission)
  console.log('========================')
  
  const result = {
    // Header Section - Remove title from header, only show denomination and stats
    header: {
      kosherType: shul.denomination,
      kosherAgency: shul.religious_authority,
      viewCount: shul.stats.view_count,
      shareCount: shul.stats.share_count,
      onBack: () => {
        // This would typically use Next.js router
        if (typeof window !== 'undefined') {
          window.history.back()
        }
      },
      isFavorited: false, // TODO: Connect to user favorites
      onFavorite: () => handleFavorite(shul.id),
    },

    // Image Section
    image: {
      src: (() => {
        const src = shul.images?.[0] || shul.image_url || '/images/default-synagogue.webp'
        console.log('Shul image src:', src)
        return src
      })(),
      alt: `${shul.name} - ${shul.denomination} Synagogue`,
      allImages: (() => {
        const allImages = shul.images || shul.additional_images || [shul.image_url].filter(Boolean)
        console.log('All shul images for gallery:', allImages)
        return allImages
      })(),
      onAction: () => {
        // This will trigger the gallery view in ListingImage component
        console.log('View gallery clicked for:', shul.name)
      }
    },

    // Content Section
    content: {
      leftText: shul.name,
      rightText: (() => {
        if (userLocation && shul.location) {
          const distance = calculateDistance(shul.location, userLocation)
          return formatDistance(distance)
        }
        return shul.denomination
      })(),
      leftAction: "Get Directions",
      rightAction: "Contact",
      leftBold: true,
      rightBold: false,
      leftIcon: "📍",
      rightIcon: "📞",
      onLeftAction: () => {
        if (shul.location) {
          openDirections(shul.location.latitude, shul.location.longitude)
        }
      },
      onRightAction: () => handleContact(shul),
      onRightTextClick: onLocationRequest,
    },

    // Actions Section
    actions: {
      primaryAction: {
        label: "Visit Website",
        onClick: () => {
          if (shul.contact.website) {
            window.open(shul.contact.website, '_blank')
          }
        }
      },
      secondaryActions: [
        {
          label: "Call",
          onClick: () => {
            if (shul.contact.phone) {
              window.location.href = `tel:${shul.contact.phone}`
            }
          }
        },
        {
          label: "Email",
          onClick: () => {
            if (shul.contact.email) {
              handleEmail(shul.contact.email)
            }
          }
        }
      ],
      tags: (() => {
        const tags: string[] = []
        if (shul.denomination) tags.push(shul.denomination)
        if (shul.has_daily_minyan) tags.push("Daily Minyan")
        if (shul.has_shabbat_services) tags.push("Shabbat Services")
        if (shul.has_mechitza) tags.push("Mechitza")
        if (shul.has_parking) tags.push("Parking")
        if (shul.has_disabled_access) tags.push("Accessible")
        if (shul.rabbi_name) tags.push(`Rabbi ${shul.rabbi_name.split(' ')[0]}`)
        return tags
      })(),
      onTagClick: handleTagClick,
      bottomAction: {
        label: "View Hours & Services",
        onClick: () => {
          console.log('View hours and services for:', shul.name)
        },
        hoursInfo: {
          title: shul.name,
          hours: formatHoursForPopup(shul.hours)
        }
      }
    },

    // Additional sections
    address: (() => {
      const addressParts = [shul.address, shul.city, shul.state, shul.zip_code].filter(Boolean)
      return addressParts.join(', ')
    })(),
    description: shul.short_description || shul.description,
    location: shul.location,
    userLocation: userLocation ? {
      latitude: userLocation.lat,
      longitude: userLocation.lng
    } : undefined,
    reviews: reviews?.map(review => ({
      id: review.id?.toString() || review.review_id?.toString() || Math.random().toString(),
      user: review.user_name || review.author_name || review.user || 'Anonymous',
      rating: review.rating || 0,
      comment: review.content || review.text || review.comment || '',
      date: review.created_at || review.time || review.date || new Date().toISOString(),
      source: review.source || 'user', // 'user' or 'google'
      profile_photo_url: review.profile_photo_url || null,
      relative_time_description: review.relative_time_description || null
    })) || [],
    reviewsPagination: undefined, // Will be set by the page component
    onLoadMoreReviews: undefined, // Will be set by the page component
    reviewsLoading: false
  }
  
  console.log('Mapping shul reviews:', reviews)
  console.log('Mapped shul reviews:', result.reviews)
  return result
}

/**
 * Format hours for popup display
 */
function formatHoursForPopup(hours: ShulDB['hours']): Array<{ day: string; time: string }> {
  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayNames = {
    sunday: 'Sunday',
    monday: 'Monday', 
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday'
  }

  return dayOrder.map(day => {
    const dayHours = hours[day]
    if (!dayHours || dayHours.closed) {
      return { day: dayNames[day as keyof typeof dayNames], time: 'Closed' }
    }
    
    if (dayHours.open && dayHours.close) {
      return { 
        day: dayNames[day as keyof typeof dayNames], 
        time: `${dayHours.open} - ${dayHours.close}` 
      }
    }
    
    return { day: dayNames[day as keyof typeof dayNames], time: 'Hours not available' }
  })
}
