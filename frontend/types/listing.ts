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
  image?: {
    imageUrl?: string
    imageAlt?: string
    imageActionLabel?: string
    viewCount?: number
    images?: string[]
  }
  content?: {
    leftText?: string
    rightText?: string
    leftActionLabel?: string
    rightActionLabel?: string
    leftIcon?: string | React.ReactNode
    rightIcon?: string | React.ReactNode
  }
  actions?: {
    primaryAction?: {
      label?: string
      onClick?: () => void
    }
    secondaryActions?: Array<{
      label?: string
      onClick?: () => void
      disabled?: boolean
    }>
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
    kosherTags?: string[]
  }
  header?: {
    kosherType?: string
    kosherAgency?: string
    shareCount?: number
    onBack?: () => void
    onFavorite?: () => void
    isFavorited?: boolean
  }
  address?: string
  description?: string
  reviews?: Array<{
    id: string
    user: string
    rating: number
    comment: string
    date: string
  }>
}

export interface UserLocation {
  lat: number
  lng: number
}

export interface EateryDB {
  id: string
  name: string
  description: string
  short_description: string
  address: string
  rating: number
  price_range: string
  kosher_type: string
  kosher_agency: string
  kosher_certification?: string
  is_open: boolean
  phone_number: string
  email?: string
  website_url?: string
  image_url: string
  additional_images?: string[]
  latitude: number
  longitude: number
  stats: {
    view_count: number
    share_count: number
  }
  hours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
}
