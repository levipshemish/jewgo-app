import { ListingData, EateryDB, UserLocation } from '@/types/listing'

// Helper function to calculate distance using Haversine formula
function calculateDistance(location1: { latitude: number; longitude: number }, location2: { latitude: number; longitude: number }): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (location2.latitude - location1.latitude) * Math.PI / 180
  const dLon = (location2.longitude - location1.longitude) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 5280)} ft`
  } else if (distance < 10) {
    return `${distance.toFixed(1)} miles`
  } else {
    return `${Math.round(distance)} miles`
  }
}

function openDirections(location: { latitude: number; longitude: number }) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
  window.open(url, '_blank')
}

function handleOrder(orderUrl?: string) {
  if (orderUrl) {
    window.open(orderUrl, '_blank')
  } else {
    alert('Order functionality not available')
  }
}

function handleFavorite(eateryId: string) {
  // This would handle favorite functionality
  console.log('Toggling favorite for:', eateryId)
}

function handleShare() {
  if (navigator.share) {
    navigator.share({
      title: 'Check out this restaurant!',
      url: window.location.href
    }).catch(console.error)
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copied to clipboard!')
    }).catch(() => {
      prompt('Copy this link:', window.location.href)
    })
  }
}

function handleEmail(email?: string) {
  if (email) {
    window.location.href = `mailto:${email}`
  } else {
    alert('No email available for this restaurant')
  }
}

function handleTagClick(tag: string) {
  console.log('Tag clicked:', tag)
}

function formatPriceRange(priceRange?: string): string {
  return priceRange || 'Price not available'
}

function formatRating(rating?: number): string {
  return rating ? rating.toString() : 'No rating'
}

/**
 * Map eatery database data to listing utility format
 */
export function mapEateryToListingData(
  eatery: EateryDB, 
  userLocation?: UserLocation | null
): ListingData {
  return {
    // Header Section - Remove title from header, only show kosher info and stats
    header: {
      kosherType: eatery.kosher_type,
      kosherAgency: eatery.kosher_agency,
      shareCount: eatery.stats.share_count,
      onBack: () => {
        // This would typically use Next.js router
        if (typeof window !== 'undefined') {
          window.history.back()
        }
      },
      isFavorited: false, // TODO: Connect to user favorites
      onFavorite: () => handleFavorite(eatery.id),
    },

    // Image Section
    image: {
      imageUrl: eatery.image_url, // Main image
      imageAlt: `${eatery.name} restaurant`,
      imageActionLabel: "View Gallery",
      images: [eatery.image_url, ...(eatery.additional_images || [])], // Pass all images for carousel
      viewCount: eatery.stats.view_count, // Pass view count for image overlay
    },

    // Content Section
    content: {
      leftText: eatery.name, // Will be bolded in component
      rightText: formatRating(eatery.rating),
      leftActionLabel: formatPriceRange(eatery.price_range),
      rightActionLabel: userLocation ? formatDistance(calculateDistance({ latitude: eatery.latitude, longitude: eatery.longitude }, { latitude: userLocation.lat, longitude: userLocation.lng })) : undefined,
      leftIcon: undefined,
      rightIcon: undefined, // Remove icon from rating line
    },

    // Actions Section
    actions: {
      // Primary Action (Order Now - conditional)
      primaryAction: eatery.is_open ? {
        label: "Order Now",
        onClick: () => handleOrder(eatery.website_url),
      } : undefined,

      // Secondary Actions - Website, Call, Email in order
      secondaryActions: [
        ...(eatery.website_url ? [{
          label: "Website",
          onClick: () => window.open(eatery.website_url, '_blank'),
        }] : []),
        ...(eatery.phone_number ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${eatery.phone_number}`,
        }] : []),
        {
          label: "Email",
          onClick: () => handleEmail(eatery.email),
        },
      ].slice(0, 3), // Max 3 secondary actions

      // Kosher Tags
      kosherTags: [
        eatery.kosher_type,
        eatery.kosher_agency,
        eatery.kosher_certification,
      ].filter(Boolean).slice(0, 3).map(String), // Max 3 tags, ensure strings

      // Bottom Action (Hours)
      bottomAction: {
        label: "Hours",
        onClick: () => {
          // Hours popup will be handled by the component
          console.log('Hours clicked')
        },
        hoursInfo: {
          title: eatery.name,
          hours: formatHoursForPopup(eatery.hours)
        }
      }
    },

    // Additional sections
    address: eatery.address,
    description: eatery.short_description
  }
}

/**
 * Format hours for popup display
 */
function formatHoursForPopup(hours: EateryDB['hours']): Array<{ day: string; time: string }> {
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  return Object.entries(hours).map(([day, time]) => ({
    day: dayNames[day as keyof typeof dayNames] || day,
    time: time
  }))
}

/**
 * Create mock eatery data for testing
 */
export function createMockEateryData(): EateryDB {
  return {
    id: "eatery-123",
    name: "Kosher Delight Restaurant",
    description: "A wonderful kosher restaurant serving delicious traditional and modern Jewish cuisine.",
    short_description: "Authentic kosher dining experience",
    address: "123 Main Street, New York, NY 10001",
    rating: 4.5,
    price_range: "$$",
    kosher_type: "Glatt Kosher",
    kosher_agency: "OU",
    kosher_certification: "Pas Yisroel",
    is_open: true,
    image_url: "/modern-product-showcase-with-clean-background.png",
    additional_images: [
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: "9:00 AM - 10:00 PM",
      tuesday: "9:00 AM - 10:00 PM",
      wednesday: "9:00 AM - 10:00 PM",
      thursday: "9:00 AM - 11:00 PM",
      friday: "9:00 AM - 3:00 PM",
      saturday: "Closed",
      sunday: "10:00 AM - 9:00 PM",
    },
    phone_number: "+1-555-123-4567",
    email: "info@kosherdelight.com",
    website_url: "https://kosherdelight.com",
    latitude: 40.7128,
    longitude: -74.0060,
    stats: {
      view_count: 1250,
      share_count: 89,
    },
  }
}

/**
 * Create mock eatery data without email for testing
 */
export function createMockEateryDataNoEmail(): EateryDB {
  return {
    id: "eatery-456",
    name: "Shalom Pizza",
    description: "Delicious kosher pizza and Italian cuisine.",
    short_description: "Kosher pizza and Italian food",
    address: "456 Oak Avenue, Brooklyn, NY 11201",
    rating: 4.2,
    price_range: "$",
    kosher_type: "Dairy",
    kosher_agency: "Kof-K",
    kosher_certification: "Cholov Yisroel",
    is_open: false, // No order button
    image_url: "/placeholder.svg?height=400&width=400",
    additional_images: [
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: "11:00 AM - 9:00 PM",
      tuesday: "11:00 AM - 9:00 PM",
      wednesday: "11:00 AM - 9:00 PM",
      thursday: "11:00 AM - 9:00 PM",
      friday: "11:00 AM - 3:00 PM",
      saturday: "Closed",
      sunday: "12:00 PM - 8:00 PM",
    },
    phone_number: "+1-555-987-6543",
    email: undefined, // No email for testing
    website_url: "https://shalompizza.com",
    latitude: 40.7589,
    longitude: -73.9851,
    stats: {
      view_count: 890,
      share_count: 45,
    },
  }
}
