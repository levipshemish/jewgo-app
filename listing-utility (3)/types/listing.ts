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

export interface ListingData {
  id?: string
  title?: string
  image?: {
    src?: string
    alt?: string
    actionLabel?: string
    onAction?: () => void
  }
  content?: {
    leftText?: string
    rightText?: string
    leftAction?: string
    rightAction?: string
    leftBold?: boolean
    rightBold?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    onLeftAction?: () => void
    onRightAction?: () => void
  }
  actions?: {
    primaryAction?: {
      label: string
      onClick: () => void
    }
    secondaryActions?: Array<{
      label: string
      onClick: () => void
    }>
    tags?: string[]
    onTagClick?: (tag: string) => void
    bottomAction?: {
      label: string
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
    viewCount?: number
    shareCount?: number
    onBack?: () => void
    isFavorited?: boolean
    onFavorite?: () => void
    onShare?: () => void
  }
  // Additional text sections
  address?: string
  description?: string
}

// Eatery-specific interfaces
export interface EateryDB {
  id: string
  name: string
  description: string
  short_description?: string
  address: string
  rating?: number
  price_range?: string
  kosher_type?: string
  kosher_agency?: string
  images: string[]
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
}

export interface UserLocation {
  lat: number
  lng: number
}
