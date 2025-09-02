import { useState, useEffect, useCallback } from 'react'
import { EateryDB } from '@/types/listing'

interface UseEateryDetailsReturn {
  data: EateryDB | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Mock eatery data - matching the working test page
const mockEateryData: Record<string, EateryDB> = {
  "eatery-123": {
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
    // is_open: true,
    image_url: "/modern-product-showcase-with-clean-background.png",
    additional_images: [
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
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
    email: "info@kosherdelight.com",
    website_url: "https://kosherdelight.com",
    latitude: 40.7128,
    longitude: -74.0060,
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
  },
  "eatery-456": {
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
    // is_open: true,
    image_url: "/placeholder.svg?height=400&width=400",
    additional_images: [
      "/placeholder.svg?height=400&width=400",
    ],
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
    email: undefined, // No email for testing
    website_url: "https://shalompizza.com",
    latitude: 40.7589,
    longitude: -73.9851,
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

export function useEateryDetails(eateryId: string): UseEateryDetailsReturn {
  const [data, setData] = useState<EateryDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEateryDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const eatery = mockEateryData[eateryId]
      
      if (!eatery) {
        throw new Error(`Eatery not found: ${eateryId}`)
      }
      
      setData(eatery)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [eateryId])

  useEffect(() => {
    if (eateryId) {
      fetchEateryDetails()
    }
  }, [eateryId, fetchEateryDetails])

  return {
    data,
    loading,
    error,
    refetch: fetchEateryDetails
  }
}
