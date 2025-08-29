import { useState, useEffect } from 'react'
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
  },
  "eatery-456": {
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
    is_open: true,
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

export function useEateryDetails(eateryId: string): UseEateryDetailsReturn {
  const [data, setData] = useState<EateryDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEateryDetails = async () => {
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
  }

  useEffect(() => {
    if (eateryId) {
      fetchEateryDetails()
    }
  }, [eateryId])

  return {
    data,
    loading,
    error,
    refetch: fetchEateryDetails
  }
}
