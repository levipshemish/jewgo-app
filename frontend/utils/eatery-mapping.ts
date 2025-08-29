import { EateryDB, ListingData, UserLocation } from '@/types/listing'

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  eateryLocation: { latitude: number; longitude: number },
  userLocation: UserLocation
): string {
  const R = 3959 // Earth's radius in miles
  const lat1 = userLocation.lat * Math.PI / 180
  const lat2 = eateryLocation.latitude * Math.PI / 180
  const deltaLat = (eateryLocation.latitude - userLocation.lat) * Math.PI / 180
  const deltaLon = (eateryLocation.longitude - userLocation.lng) * Math.PI / 180

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c

  if (distance < 1) {
    return `${Math.round(distance * 5280)} ft`
  } else {
    return `${distance.toFixed(1)} mi`
  }
}

/**
 * Format hours for popup display
 */
function formatHoursForPopup(hours: any): Array<{ day: string; time: string }> {
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  return Object.entries(hours).map(([day, hoursData]: [string, any]) => ({
    day: dayNames[day as keyof typeof dayNames] || day,
    time: hoursData.closed ? 'Closed' : `${hoursData.open} - ${hoursData.close}`
  }))
}

/**
 * Helper functions for actions
 */
function openImageCarousel(images: string[]) {
  // This would open the image carousel popup
  console.log('Opening image carousel with:', images)
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
      src: eatery.images[0], // Main image
      alt: `${eatery.name} restaurant`,
      actionLabel: "View Gallery",
      allImages: eatery.images, // Pass all images for carousel
      viewCount: eatery.stats.view_count, // Pass view count for image overlay
      onAction: () => {
        // Open image carousel popup with all images
        openImageCarousel(eatery.images)
      },
    },

    // Content Section
    content: {
      leftText: eatery.name, // Will be bolded in component
      rightText: formatRating(eatery.rating),
      leftAction: formatPriceRange(eatery.price_range),
      rightAction: userLocation ? calculateDistance(eatery.location, userLocation) : undefined,
      leftBold: true, // Restaurant name should be bold
      rightBold: false,
      leftIcon: undefined,
      rightIcon: undefined, // Remove icon from rating line
      onLeftAction: undefined,
      onRightAction: userLocation ? () => openDirections(eatery.location) : undefined,
      // Make rating clickable for reviews
      onRightTextClick: () => {
        // TODO: Open reviews popup
        alert(`Reviews for ${eatery.name} - This would open a reviews popup with rating details`)
      },
    },

    // Actions Section
    actions: {
      // Primary Action (Order Now - conditional)
      primaryAction: eatery.admin_settings?.show_order_button ? {
        label: "Order Now",
        onClick: () => handleOrder(eatery.admin_settings.order_url),
      } : undefined,

      // Secondary Actions - Website, Call, Email in order
      secondaryActions: [
        ...(eatery.contact.website ? [{
          label: "Website",
          onClick: () => window.open(eatery.contact.website, '_blank'),
        }] : []),
        ...(eatery.contact.phone ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${eatery.contact.phone}`,
        }] : []),
        {
          label: "Email",
          onClick: () => handleEmail(eatery.contact.email),
        },
      ].slice(0, 3), // Max 3 secondary actions

      // Tags (Kosher info)
      tags: [
        eatery.kosher_type,
        eatery.kosher_agency,
        eatery.kosher_certification,
      ].filter(Boolean).slice(0, 3), // Max 3 tags

      onTagClick: handleTagClick,

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
    images: [
      "/modern-product-showcase-with-clean-background.png",
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: { open: "9:00 AM", close: "10:00 PM" },
      tuesday: { open: "9:00 AM", close: "10:00 PM" },
      wednesday: { open: "9:00 AM", close: "10:00 PM" },
      thursday: { open: "9:00 AM", close: "11:00 PM" },
      friday: { open: "9:00 AM", close: "3:00 PM" },
      saturday: { closed: true },
      sunday: { open: "10:00 AM", close: "9:00 PM" },
    },
    contact: {
      phone: "+1-555-123-4567",
      email: "info@kosherdelight.com",
      website: "https://kosherdelight.com",
    },
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
    admin_settings: {
      show_order_button: true,
      order_url: "https://kosherdelight.com/order",
    },
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
    images: [
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: { open: "11:00 AM", close: "9:00 PM" },
      tuesday: { open: "11:00 AM", close: "9:00 PM" },
      wednesday: { open: "11:00 AM", close: "9:00 PM" },
      thursday: { open: "11:00 AM", close: "9:00 PM" },
      friday: { open: "11:00 AM", close: "3:00 PM" },
      saturday: { closed: true },
      sunday: { open: "12:00 PM", close: "8:00 PM" },
    },
    contact: {
      phone: "+1-555-987-6543",
      email: undefined, // No email for testing
      website: "https://shalompizza.com",
    },
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
    },
    admin_settings: {
      show_order_button: false, // No order button
      order_url: undefined,
    },
    stats: {
      view_count: 890,
      share_count: 45,
    },
  }
}
