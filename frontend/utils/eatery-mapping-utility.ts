import { EateryDB, ListingData, UserLocation } from '@/types/listing'
import { 
  calculateDistance, 
  formatHoursForPopup, 
  openImageCarousel, 
  openDirections, 
  handleOrder, 
  handleFavorite, 
  handleEmail,
  handleTagClick,
  formatPriceRange,
  formatRating
} from './eatery-helpers'

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
      kosherAgencyWebsite: eatery.kosher_agency_website,
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
      src: eatery.images[0], // Main image
      alt: `${eatery.name} restaurant`,
      actionLabel: "View Gallery",
      allImages: eatery.images, // Pass all images for carousel
      onAction: () => {
        // Open image carousel popup with up to 5 images
        const imagesToShow = eatery.images.slice(0, 5);
        openImageCarousel(imagesToShow);
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
        // Use real review data from API
        if (eatery.reviews?.google_reviews) {
          try {
            const reviews = JSON.parse(eatery.reviews.google_reviews)
            console.log('Reviews for', eatery.name, ':', reviews)
            
            // Format reviews for display
            const formattedReviews = reviews.map((review: any) => ({
              author: review.author,
              rating: review.rating,
              text: review.text,
              time: new Date(review.time * 1000).toLocaleDateString()
            }))
            
            // For now, show in alert. In a real app, this would open a reviews popup
            alert(`Reviews for ${eatery.name}:\n\n${formattedReviews.map((r: any) => `${r.author} (${r.rating}/5): ${r.text}`).join('\n\n')}`)
          } catch (_error) {
            // Error parsing reviews - show fallback message
            alert(`Reviews for ${eatery.name} - Unable to load reviews at this time`)
          }
        } else {
          alert(`Reviews for ${eatery.name} - No reviews available`)
        }
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

      // Tags (Kosher info) - Remove duplicate kosher_certification
      tags: [
        eatery.kosher_type,
        eatery.kosher_agency,
      ].filter((tag): tag is string => Boolean(tag)).slice(0, 3), // Max 3 tags

      onTagClick: (tag) => handleTagClick(tag),

      // Bottom Action (Hours)
      bottomAction: {
        label: "Hours",
        onClick: () => {
          // The hours popup is handled by the ListingActions component
          // when hoursInfo is provided
        },
        hoursInfo: {
          title: `${eatery.name} Hours`,
          hours: formatHoursForPopup(eatery.hours),
        },
      },
    },

    // Additional text sections
    address: eatery.address,
    description: eatery.short_description || eatery.description,
    location: eatery.location,
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
    short_description: "Authentic kosher dining featuring traditional Jewish dishes and modern culinary innovations. Family-owned for over 20 years with the highest standards of kashrut.",
    address: "123 Main Street, New York, NY 10001",
    city: "New York",
    state: "NY",
    zip_code: "10001",
    phone_number: "+1-555-123-4567",
    listing_type: "restaurant",
    rating: 4.5,
    price_range: "$$",
    kosher_type: "Glatt Kosher",
    kosher_agency: "OU",
    kosher_agency_website: "https://ou.org",
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
      saturday: { open: "", close: "", closed: true },
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
    short_description: "Brooklyn's premier kosher pizzeria with authentic Italian-style pizza and wood-fired ovens. Fresh ingredients and family-friendly atmosphere with quick service.",
    address: "456 Oak Avenue, Brooklyn, NY 11201",
    city: "Brooklyn",
    state: "NY",
    zip_code: "11201",
    phone_number: "+1-555-987-6543",
    listing_type: "restaurant",
    rating: 4.2,
    price_range: "$",
    kosher_type: "Dairy",
    kosher_agency: "Kof-K",
    kosher_agency_website: "https://kofk.org",
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
      saturday: { open: "", close: "", closed: true },
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
