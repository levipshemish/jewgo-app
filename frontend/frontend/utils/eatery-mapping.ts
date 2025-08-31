import { EateryDB, ListingData, UserLocation } from '@/types/listing'
import { 
  calculateDistance, 
  formatHoursForPopup, 
  openImageCarousel, 
  openDirections, 
  handleOrder, 
  handleFavorite, 
  handleShare, 
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
      src: eatery.image_url, // Main image
      alt: `${eatery.name} restaurant`,
      actionLabel: "View Gallery",
      allImages: eatery.additional_images || [eatery.image_url].filter((img): img is string => Boolean(img)), // Pass all images for carousel
    },

    // Content Section
    content: {
      leftText: eatery.name, // Will be bolded in component
      rightText: formatRating(eatery.rating),
      leftAction: formatPriceRange(eatery.price_range),
      rightAction: userLocation && eatery.latitude && eatery.longitude ? calculateDistance({ latitude: eatery.latitude, longitude: eatery.longitude }, userLocation) : undefined,
      leftIcon: undefined,
      rightIcon: undefined, // Remove icon from rating line

    },

    // Actions Section
    actions: {
      // Primary Action (Order Now - conditional)
      primaryAction: eatery.is_open ? {
        label: "Order Now",
        onClick: () => console.log("Order clicked"),
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
      tags: [
        eatery.kosher_type,
        eatery.kosher_agency,
        eatery.kosher_certification,
      ].filter(Boolean).slice(0, 3).map(String), // Max 3 tags, ensure strings

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
    city: "New York",
    state: "NY",
    zip_code: "10001",
    phone_number: "+1-555-123-4567",
    listing_type: "restaurant",
    rating: 4.5,
    price_range: "$$",
    kosher_type: "Glatt Kosher",
    kosher_agency: "OU",
    kosher_certification: "Pas Yisroel",
    is_open: true,
    image_url: "/modern-product-showcase-with-clean-background.png",
    images: [
      "/modern-product-showcase-with-clean-background.png",
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    additional_images: [
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
    short_description: "Kosher pizza and Italian food",
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
    kosher_certification: "Cholov Yisroel",
    is_open: true,
    image_url: "/modern-product-showcase-with-clean-background.png",
    images: [
      "/modern-product-showcase-with-clean-background.png",
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    additional_images: [
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
