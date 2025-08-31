"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListingPage } from "@/components/listing-details-utility/listing-page"
import { mapEateryToListingData } from "@/utils/eatery-mapping-utility"
import { EateryDB, UserLocation, ListingData } from "@/types/listing"

interface ApiEateryData {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone_number?: string
  website?: string
  certificate_link?: string
  image_url?: string
  kosher_category?: string
  certifying_agency?: string
  listing_type: string
  latitude?: number
  longitude?: number
  hours?: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }
  status: string
  rating?: number
  price_range?: string
  images?: string[]
  kosher_type?: string
  kosher_agency?: string
  kosher_agency_website?: string
  stats?: {
    view_count: number
    share_count: number
  }
  contact?: {
    email?: string
    phone?: string
    website?: string
  }
  admin_settings?: {
    show_order_button?: boolean
    order_url?: string
  }
  description?: string
  short_description?: string
  google_rating?: number
  hours_json?: {
    weekday_text: string[]
  }
  google_reviews?: string
  review_snippets?: string
  google_review_count?: number
  review_count?: number
}

// Convert API data to EateryDB format
function convertApiDataToEateryDB(apiData: ApiEateryData): EateryDB {
  // Parse hours from weekday_text
  const parseHoursFromWeekdayText = (weekdayText: string[] = []) => {
    const hours: any = {
      monday: { open: '', close: '', closed: true },
      tuesday: { open: '', close: '', closed: true },
      wednesday: { open: '', close: '', closed: true },
      thursday: { open: '', close: '', closed: true },
      friday: { open: '', close: '', closed: true },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true }
    }

    weekdayText.forEach((dayText) => {
      if (dayText.includes('Monday:')) {
        const timeMatch = dayText.match(/Monday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.monday = { open, close, closed: false }
        }
      } else if (dayText.includes('Tuesday:')) {
        const timeMatch = dayText.match(/Tuesday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.tuesday = { open, close, closed: false }
        }
      } else if (dayText.includes('Wednesday:')) {
        const timeMatch = dayText.match(/Wednesday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.wednesday = { open, close, closed: false }
        }
      } else if (dayText.includes('Thursday:')) {
        const timeMatch = dayText.match(/Thursday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.thursday = { open, close, closed: false }
        }
      } else if (dayText.includes('Friday:')) {
        const timeMatch = dayText.match(/Friday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.friday = { open, close, closed: false }
        }
      } else if (dayText.includes('Saturday:')) {
        const timeMatch = dayText.match(/Saturday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.saturday = { open, close, closed: false }
        }
      } else if (dayText.includes('Sunday:')) {
        const timeMatch = dayText.match(/Sunday:\s*(.+)/)
        if (timeMatch && timeMatch[1] !== 'Closed') {
          const [open, close] = timeMatch[1].split('–').map(t => t.trim())
          hours.sunday = { open, close, closed: false }
        }
      }
    })

    return hours
  }

  return {
    id: apiData.id.toString(),
    name: apiData.name,
    description: apiData.description || `${apiData.name} - ${apiData.address}, ${apiData.city}, ${apiData.state}`,
    short_description: apiData.short_description || `${apiData.name} offers authentic kosher dining in ${apiData.city}.`,
    address: `${apiData.address}, ${apiData.city}, ${apiData.state} ${apiData.zip_code}`,
    city: apiData.city || '',
    state: apiData.state || '',
    zip_code: apiData.zip_code || '',
    phone_number: apiData.phone_number || '',
    listing_type: 'restaurant',
    rating: apiData.rating || apiData.google_rating || 0,
    price_range: apiData.price_range || '$$',
    kosher_type: apiData.kosher_type || apiData.kosher_category || 'Kosher',
    kosher_agency: apiData.kosher_agency || apiData.certifying_agency || 'OU',
    kosher_agency_website: apiData.kosher_agency_website,
    kosher_certification: apiData.kosher_agency_website,
    images: apiData.images && apiData.images.length > 0
      ? apiData.images
      : [apiData.image_url || '/images/default-restaurant.webp'],
    hours: parseHoursFromWeekdayText(apiData.hours_json?.weekday_text),
    contact: {
      phone: apiData.phone_number || apiData.contact?.phone,
      email: apiData.contact?.email,
      website: apiData.website || apiData.contact?.website
    },
    location: {
      latitude: apiData.latitude || 0,
      longitude: apiData.longitude || 0
    },
    admin_settings: {
      show_order_button: apiData.admin_settings?.show_order_button || false,
      order_url: apiData.admin_settings?.order_url
    },
    stats: {
      view_count: apiData.stats?.view_count || 0,
      share_count: apiData.stats?.share_count || 0
    },
    reviews: {
      google_reviews: apiData.google_reviews,
      review_snippets: apiData.review_snippets,
      google_review_count: apiData.google_review_count,
      review_count: apiData.review_count
    }
  }
}

export default function TestListingPage() {
  const searchParams = useSearchParams()
  const [eatery, setEatery] = useState<EateryDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  // Get restaurant ID and name from URL params, fallback to test ID
  const restaurantId = searchParams.get('id') || "1582"
  const eateryName = searchParams.get('name')

  // Update browser URL with eatery name if available
  useEffect(() => {
    if (eateryName && restaurantId) {
      const newUrl = `/test-listing?id=${restaurantId}&name=${eateryName}`
      if (window.location.search !== `?id=${restaurantId}&name=${eateryName}`) {
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [eateryName, restaurantId])

  // Fetch eatery details from API
  useEffect(() => {
    const fetchEateryDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/restaurants/${restaurantId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch eatery details: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.data) {
          // Convert API data to EateryDB format
          const eateryDB = convertApiDataToEateryDB(data.data)
          setEatery(eateryDB)
        } else {
          throw new Error(data.message || 'Failed to fetch eatery details')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchEateryDetails()
  }, [restaurantId])

  // Get user location
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
            console.log('Location permission denied or error:', error.message)
            // Don't set error state for location - it's optional
          }
        )
      }
    }

    getUserLocation()
  }, [])

  // Map eatery data to listing format
  const listingData = eatery ? mapEateryToListingData(eatery, userLocation) : undefined

  // Debug logging
  console.log('=== TEST LISTING DEBUG ===')
  console.log('Page: Test Listing Page')
  console.log('Restaurant ID:', restaurantId)
  console.log('Eatery Name:', eateryName)
  console.log('Loading:', loading)
  console.log('Error:', error)
  console.log('Raw eatery data:', eatery)
  console.log('User location:', userLocation)
  console.log('Mapped listing data:', listingData)
  console.log('API Response URL:', `/api/restaurants/${restaurantId}`)
  console.log('==========================')

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* Listing Demo */}
      <div className="flex items-center justify-center">
        <ListingPage
          data={listingData}
          loading={loading}
          error={error}
        />
      </div>
    </main>
  )
}
