import { EateryDB, ListingData, UserLocation } from '@/types/listing'
import { 
  calculateDistance, 
  formatHoursForPopup, 
  openImageCarousel, 
  openDirections, 
  handleOrder, 
  handleFavorite, 
  handleShare, 
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
      onShare: () => handleShare(eatery.id),
    },

    // Image Section
    image: {
      src: eatery.images[0], // Main image
      alt: `${eatery.name} restaurant`,
      actionLabel: "View Gallery",
      onAction: () => openImageCarousel(eatery.images),
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
      rightIcon: userLocation ? "map-pin" : undefined, // Icon name instead of JSX
      onLeftAction: undefined,
      onRightAction: userLocation ? () => openDirections(eatery.location) : undefined,
    },

    // Actions Section
    actions: {
      // Primary Action (Order Now - conditional)
      primaryAction: eatery.admin_settings?.show_order_button ? {
        label: "Order Now",
        onClick: () => handleOrder(eatery.admin_settings.order_url),
      } : undefined,

      // Secondary Actions
      secondaryActions: [
        {
          label: "Review",
          onClick: () => {
            // TODO: Open review popup or navigate to review page
            alert(`Review ${eatery.name} - This would open a review popup or page`)
          },
        },
        ...(eatery.contact.website ? [{
          label: "Website",
          onClick: () => window.open(eatery.contact.website, '_blank'),
        }] : []),
        ...(eatery.contact.phone ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${eatery.contact.phone}`,
        }] : []),
        ...(eatery.contact.email ? [{
          label: "Email",
          onClick: () => window.location.href = `mailto:${eatery.contact.email}`,
        }] : []),
      ].slice(0, 3), // Max 3 secondary actions

      // Tags (Kosher info)
      tags: [
        eatery.kosher_type,
        eatery.kosher_agency,
      ].filter(Boolean).slice(0, 2), // Max 2 tags

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
