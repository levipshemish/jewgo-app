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
  userLocation?: UserLocation | null,
  reviews?: any[],
  onLocationRequest?: () => void,
  locationPermission?: 'granted' | 'denied' | 'prompt' | 'unknown'
): ListingData {
  const result = {
    // Header Section - Remove title from header, only show kosher info and stats
    header: {
      kosherType: eatery.kosher_type,
      kosherAgency: eatery.kosher_agency,
      viewCount: eatery.stats.view_count,
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
      src: eatery.image_url || '/placeholder-eatery.jpg',
      alt: `${eatery.name} - ${eatery.kosher_type || 'Kosher'} Restaurant`,
      allImages: eatery.additional_images || [eatery.image_url].filter(Boolean),
    },

    // Content Section
    content: {
      leftText: eatery.name,
      rightText: formatRating(eatery.rating),
      leftAction: formatPriceRange(eatery.price_range),
      rightAction: userLocation && eatery.latitude && eatery.longitude ? calculateDistance({ latitude: eatery.latitude, longitude: eatery.longitude }, userLocation) : undefined,
      rightIcon: "map-pin",
      onRightAction: onLocationRequest,
      leftBold: true,
      leftTextSize: 'lg',
    },

    // Actions Section
    actions: {
      // Primary Action - Order button if restaurant has order functionality enabled
      primaryAction: eatery.admin_settings?.show_order_button ? {
        label: "Order Now",
        onClick: () => handleOrder(eatery.admin_settings?.order_url || eatery.contact?.website || ''),
      } : undefined,

      // Secondary Actions - Website, Call, Email in order
      secondaryActions: [
        ...(eatery.contact?.website ? [{
          label: "Website",
          onClick: () => window.open(eatery.contact.website, '_blank'),
        }] : []),
        ...(eatery.contact?.phone ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${eatery.contact.phone}`,
        }] : []),
        ...(eatery.contact?.email ? [{
          label: "Email",
          onClick: () => handleEmail(eatery.contact.email),
        }] : []),
      ].slice(0, 3), // Max 3 secondary actions

      // Kosher Tags
      tags: [
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
      },

      // Location request handler
      onLocationRequest: onLocationRequest,
    },

    // Additional sections
    address: eatery.address,
    description: eatery.short_description,
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
  
  console.log('Mapping reviews:', reviews)
  console.log('Mapped reviews:', result.reviews)
  return result
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

  // Check if this is the "no hours available" case
  const hasNoHoursData = Object.values(hours).every(day => 
    !day.closed && !day.open && !day.close
  );

  if (hasNoHoursData) {
    return [{
      day: 'Hours',
      time: 'No hours available'
    }];
  }

  return Object.entries(hours).map(([day, timeData]) => {
    const dayName = dayNames[day as keyof typeof dayNames] || day;
    
    // Handle the time data object structure
    if (timeData.closed) {
      return {
        day: dayName,
        time: 'Closed'
      };
    } else if (timeData.open && timeData.close) {
      return {
        day: dayName,
        time: `${timeData.open} - ${timeData.close}`
      };
    } else {
      return {
        day: dayName,
        time: 'Hours not available'
      };
    }
  })
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
    city: "New York",
    state: "NY",
    zip_code: "10001",
    phone_number: "+1-555-123-4567",
    rating: 4.5,
    price_range: "$$",
    kosher_type: "Glatt Kosher",
    kosher_agency: "OU",
    kosher_certification: "Pas Yisroel",
    listing_type: "restaurant",
    image_url: "/modern-product-showcase-with-clean-background.png",
    additional_images: [
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: { open: "9:00 AM", close: "10:00 PM" },
      tuesday: { open: "9:00 AM", close: "10:00 PM" },
      wednesday: { open: "9:00 AM", close: "10:00 PM" },
      thursday: { open: "9:00 AM", close: "11:00 PM" },
      friday: { open: "9:00 AM", close: "3:00 PM" },
      saturday: { open: "Closed", close: "Closed", closed: true },
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
    city: "Brooklyn",
    state: "NY",
    zip_code: "11201",
    phone_number: "+1-555-987-6543",
    rating: 4.2,
    price_range: "$",
    kosher_type: "Dairy",
    kosher_agency: "Kof-K",
    kosher_certification: "Cholov Yisroel",
    listing_type: "restaurant",
    image_url: "/placeholder.svg?height=400&width=400",
    additional_images: [
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: { open: "11:00 AM", close: "9:00 PM" },
      tuesday: { open: "11:00 AM", close: "9:00 PM" },
      wednesday: { open: "11:00 AM", close: "9:00 PM" },
      thursday: { open: "11:00 AM", close: "9:00 PM" },
      friday: { open: "11:00 AM", close: "3:00 PM" },
      saturday: { open: "Closed", close: "Closed", closed: true },
      sunday: { open: "12:00 PM", close: "8:00 PM" },
    },
    contact: {
      phone: "+1-555-987-6543",
      website: "https://shalompizza.com",
    },
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
    },
    admin_settings: {
      show_order_button: false,
    },
    stats: {
      view_count: 890,
      share_count: 45,
    },
  }
}
