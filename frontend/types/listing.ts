export interface BackendListingData {
  id?: string
  title?: string
  description?: string
  short_description?: string
  address?: string
  price?: number
  currency?: string
  category?: string
  status?: "active" | "inactive" | "sold" | "pending"

  // Image data
  imageUrl?: string
  imageAlt?: string
  imageActionLabel?: string
  images?: string[] // Array of image URLs for carousel

  // Content fields
  leftText?: string
  rightText?: string
  leftActionLabel?: string
  rightActionLabel?: string

  // Action buttons
  primaryActionLabel?: string
  secondaryActionLabels?: string[]
  bottomActionLabel?: string

  // Tags and metadata
  tags?: string[]
  createdAt?: string
  updatedAt?: string

  // User interaction
  isFavorited?: boolean
  viewCount?: number
  shareCount?: number

  // Additional metadata
  location?: {
    latitude: number
    longitude: number
  }
  rating?: number
  price_range?: string
  kosher_type?: string
  kosher_agency?: string
  
  seller?: {
    id?: string
    name?: string
    avatar?: string
    rating?: number
  }

  hoursInfo?: {
    title: string
    hours: Array<{
      day: string
      time: string
    }>
  }

  contact?: {
    phone?: string
    email?: string
    website?: string
  }

  admin_settings?: {
    show_order_button?: boolean
    order_url?: string
  }

  // Custom fields for flexibility
  customFields?: Record<string, any>
}

export interface ListingApiResponse {
  success: boolean
  data?: BackendListingData
  error?: string
  message?: string
}

// Updated to match listing utility interface exactly
export interface ListingData {
  title?: string
  image?: {
    src?: string
    alt?: string
    actionLabel?: string
    onAction?: () => void
    allImages?: string[]
  }
  content?: {
    leftText?: string
    rightText?: string
    leftAction?: string
    rightAction?: string
    leftBold?: boolean
    rightBold?: boolean
    leftIcon?: React.ReactNode | string
    rightIcon?: React.ReactNode | string
    onLeftAction?: () => void
    onRightAction?: () => void
    onRightTextClick?: () => void
  }
  actions?: {
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
  }
  header?: {
    title?: string
    kosherType?: string
    kosherAgency?: string
    kosherAgencyWebsite?: string
    viewCount?: number
    shareCount?: number
    onBack?: () => void
    onFavorite?: () => void
    onShare?: () => void
    isFavorited?: boolean
  }
  // Additional text sections
  address?: string
  description?: string
  location?: {
    latitude: number
    longitude: number
  }
  userLocation?: {
    latitude: number
    longitude: number
  }
}

export interface UserLocation {
  lat: number
  lng: number
}

export interface EateryDB {
  id: string
  name: string
  description: string
  short_description?: string
  address: string
  city: string
  state: string
  zip_code: string
  phone_number: string
  website?: string
  website_url?: string
  email?: string
  rating?: number
  price_range?: string
  kosher_type?: string
  kosher_agency?: string
  kosher_agency_website?: string
  kosher_certification?: string // Additional certification like "Pas Yisroel" or "Cholov Yisroel"
  image_url?: string
  additional_images?: string[]
  images: string[]
  hours_of_operation?: string
  hours_json?: string
  hours_last_updated?: string
  timezone?: string
  latitude?: number
  longitude?: number
  is_open?: boolean
  is_cholov_yisroel?: boolean
  is_pas_yisroel?: boolean
  listing_type: string
  status?: string
  hours: {
    [day: string]: {
      open: string
      close: string
      closed?: boolean
    }
  }
  contact: {
    phone?: string
    email?: string
    website?: string
  }
  location: {
    latitude: number
    longitude: number
  }
  admin_settings: {
    show_order_button?: boolean
    order_url?: string
  }
  stats: {
    view_count: number
    share_count: number
  }
  reviews?: {
    google_reviews?: string
    review_snippets?: string
    google_review_count?: number
    review_count?: number
  }
}
