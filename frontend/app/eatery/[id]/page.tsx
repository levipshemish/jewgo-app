"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ListingPage } from '@/components/listing-details-utility/listing-page'
import { mapEateryToListingData } from '@/utils/eatery-mapping'
import { EateryDB } from '@/types/listing'
import { useLocationData } from '@/hooks/useLocationData'
import Link from 'next/link'
import ErrorBoundary from '../components/ErrorBoundary'
import LocationAwarePage from '@/components/LocationAwarePage'

/**
 * Parse hours from the backend JSON format into EateryDB format
 */
function parseHoursFromJson(hoursData: string | object): EateryDB['hours'] {
  console.log('=== PARSE HOURS FROM JSON DEBUG ===');
  console.log('hoursData:', hoursData);
  console.log('typeof hoursData:', typeof hoursData);
  
  try {
    const parsed = typeof hoursData === 'string' ? JSON.parse(hoursData) : hoursData
    console.log('parsed:', parsed);
    const weekdayText = parsed.weekday_text || []
    console.log('weekdayText:', weekdayText);
    
    // Check if there are no hours data at all
    if (!weekdayText || weekdayText.length === 0) {
      return {
        monday: { open: '', close: '', closed: false },
        tuesday: { open: '', close: '', closed: false },
        wednesday: { open: '', close: '', closed: false },
        thursday: { open: '', close: '', closed: false },
        friday: { open: '', close: '', closed: false },
        saturday: { open: '', close: '', closed: false },
        sunday: { open: '', close: '', closed: false },
      }
    }
    
    const hours: EateryDB['hours'] = {
      monday: { open: '', close: '', closed: true },
      tuesday: { open: '', close: '', closed: true },
      wednesday: { open: '', close: '', closed: true },
      thursday: { open: '', close: '', closed: true },
      friday: { open: '', close: '', closed: true },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true },
    }

    const dayMap: { [key: string]: keyof EateryDB['hours'] } = {
      'monday': 'monday',
      'tuesday': 'tuesday', 
      'wednesday': 'wednesday',
      'thursday': 'thursday',
      'friday': 'friday',
      'saturday': 'saturday',
      'sunday': 'sunday'
    }

    weekdayText.forEach((dayText: string) => {
      console.log('Processing dayText:', dayText)
      const dayMatch = dayText.match(/^(\w+):\s*(.+)$/i)
      if (dayMatch) {
        const dayName = dayMatch[1].toLowerCase()
        const rawTimeText = dayMatch[2].trim()
        console.log('Day:', dayName, 'Raw time:', rawTimeText)
        
        if (dayMap[dayName]) {
          if (rawTimeText.toLowerCase() === 'closed') {
            hours[dayMap[dayName]] = { open: '', close: '', closed: true }
          } else {
            // Normalize Unicode spaces and dashes to standard characters
            const normalizedTimeText = rawTimeText
              .replace(/\u202f/g, ' ') // narrow no-break space
              .replace(/\u2009/g, ' ') // thin space
              .replace(/\u2013/g, '-') // en dash
              .replace(/\u2014/g, '-') // em dash
              .replace(/\s+/g, ' ') // normalize multiple spaces
              .trim()
            
            console.log('Normalized time:', normalizedTimeText)
            
            // More flexible regex to handle various time formats
            const timeMatch = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
            console.log('Time match result:', timeMatch)
            if (timeMatch) {
              console.log('Using primary time match')
              hours[dayMap[dayName]] = {
                open: `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`,
                close: `${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6]}`,
                closed: false
              }
            } else {
              // Try alternative format without AM/PM for first time
              const altTimeMatch = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
              console.log('Alt time match 1 result:', altTimeMatch)
              if (altTimeMatch) {
                console.log('Using alt time match 1')
                hours[dayMap[dayName]] = {
                  open: `${altTimeMatch[1]}:${altTimeMatch[2]}`,
                  close: `${altTimeMatch[3]}:${altTimeMatch[4]} ${altTimeMatch[5]}`,
                  closed: false
                }
              } else {
                // Try format with AM/PM for first time but not second (like "12:00 AM – 8:00")
                const altTimeMatch2 = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})/i)
                console.log('Alt time match 2 result:', altTimeMatch2)
                if (altTimeMatch2) {
                  console.log('Using alt time match 2')
                  hours[dayMap[dayName]] = {
                    open: `${altTimeMatch2[1]}:${altTimeMatch2[2]} ${altTimeMatch2[3]}`,
                    close: `${altTimeMatch2[4]}:${altTimeMatch2[5]}`,
                    closed: false
                  }
                } else {
                  // Try format with no AM/PM at all (like "12:00 – 8:00")
                  const altTimeMatch3 = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/i)
                  console.log('Alt time match 3 result:', altTimeMatch3)
                  if (altTimeMatch3) {
                    console.log('Using alt time match 3')
                    hours[dayMap[dayName]] = {
                      open: `${altTimeMatch3[1]}:${altTimeMatch3[2]}`,
                      close: `${altTimeMatch3[3]}:${altTimeMatch3[4]}`,
                      closed: false
                    }
                  } else {
                    console.log('No time match found for:', normalizedTimeText)
                    hours[dayMap[dayName]] = { open: '', close: '', closed: true }
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log('Final parsed hours:', hours)
    console.log('===============================');
    return hours
  } catch (err) {
    console.error('Error parsing hours JSON:', err)
    return {
      monday: { open: '', close: '', closed: true },
      tuesday: { open: '', close: '', closed: true },
      wednesday: { open: '', close: '', closed: true },
      thursday: { open: '', close: '', closed: true },
      friday: { open: '', close: '', closed: true },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true },
    }
  }
}

export default function EateryIdPage() {
  return (
    <LocationAwarePage showLocationPrompt={true}>
      <ErrorBoundary>
        <EateryIdPageContent />
      </ErrorBoundary>
    </LocationAwarePage>
  );
}

function EateryIdPageContent() {
  const params = useParams()
  const [eatery, setEatery] = useState<EateryDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsPagination, setReviewsPagination] = useState<any>(null)

  // Use the new location utility system
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
    getItemDisplayText
  } = useLocationData({
    fallbackText: 'Get Location'
  })

  // Load more reviews function
  const handleLoadMoreReviews = () => {
    if (eatery && reviewsPagination?.hasMore && !reviewsLoading) {
      const nextOffset = reviewsPagination.offset + reviewsPagination.limit
      fetchReviews(eatery.id, nextOffset, reviewsPagination.limit)
    }
  }

  const eateryId = params.id as string

  // Fetch reviews for a restaurant
  const fetchReviews = async (restaurantId: string, offset: number = 0, limit: number = 10) => {
    try {
      setReviewsLoading(true)
      
      // Use the frontend API route for reviews
      const response = await fetch(`/api/reviews?restaurantId=${restaurantId}&status=approved&limit=${limit}&offset=${offset}&includeGoogleReviews=true`)
      if (!response.ok) {
        if (offset === 0) {
          setReviews([])
        }
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data && data.data.reviews) {
        if (offset === 0) {
          // First page - replace all reviews
          setReviews(data.data.reviews)
        } else {
          // Subsequent pages - append to existing reviews
          setReviews(prevReviews => [...prevReviews, ...data.data.reviews])
        }
        
        // Store pagination info
        setReviewsPagination(data.data.pagination)
      } else {
        if (offset === 0) {
          setReviews([])
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
      if (offset === 0) {
        setReviews([])
      }
    } finally {
      setReviewsLoading(false)
    }
  }

  // Fetch eatery data by ID
  useEffect(() => {
    const fetchEateryData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Validate ID
        const restaurantId = parseInt(eateryId)
        if (isNaN(restaurantId)) {
          setError('Invalid restaurant ID')
          setLoading(false)
          return
        }

        // Use the frontend API route for details
        const detailUrl = `/api/restaurants/${restaurantId}`
        
        const detailResponse = await fetch(detailUrl)
        
        if (!detailResponse.ok) {
          if (detailResponse.status === 404) {
            setError('restaurant_not_found')
          } else {
            const errorText = await detailResponse.text()
            console.error('Detail response error:', errorText)
            throw new Error(`Failed to fetch restaurant details: ${detailResponse.status} - ${errorText}`)
          }
          setLoading(false)
          return
        }
        
        const detailData = await detailResponse.json()
        
        // Extract restaurant data from the response
        let restaurantData = null
        if (detailData.success && detailData.data) {
          // Handle nested data structure - check for double nesting
          if (detailData.data.success && detailData.data.data && detailData.data.data.restaurant) {
            restaurantData = detailData.data.data.restaurant
          } else if (detailData.data.restaurant) {
            restaurantData = detailData.data.restaurant
          } else if (detailData.data.id) {
            restaurantData = detailData.data
          }
        } else if (detailData.id) {
          // Direct restaurant object
          restaurantData = detailData
        }


        if (!restaurantData) {
          setError('restaurant_not_found')
          setLoading(false)
          return
        }

        // Convert restaurant data to EateryDB format
        const eateryData: EateryDB = {
          id: restaurantData.id?.toString(),
          name: restaurantData.name,
          description: restaurantData.description || restaurantData.short_description || '',
          short_description: restaurantData.short_description || restaurantData.description || '',
          address: (() => {
            // Construct full address from components
            const addressParts = [
              restaurantData.address,
              restaurantData.city,
              restaurantData.state,
              restaurantData.zip_code
            ].filter(Boolean)
            return addressParts.join(', ')
          })(),
          city: restaurantData.city || '',
          state: restaurantData.state || '',
          zip_code: restaurantData.zip_code || '',
          phone_number: restaurantData.phone_number || '',
          listing_type: restaurantData.listing_type || 'restaurant',
          rating: (() => {
            // First try the main rating fields
            let finalRating = restaurantData.google_rating ?? restaurantData.rating ?? restaurantData.star_rating ?? restaurantData.quality_rating;
            
            // If no rating found, calculate from Google reviews
            if (finalRating === null || finalRating === undefined) {
              if (restaurantData.google_reviews) {
                try {
                  console.log('Google reviews data type:', typeof restaurantData.google_reviews);
                  console.log('Google reviews data:', restaurantData.google_reviews);
                  
                  const { parseGoogleReviews } = require('@/lib/parseGoogleReviews');
                  const googleReviewsData = parseGoogleReviews(restaurantData.google_reviews);
                  
                  const reviewsArray = !googleReviewsData
                    ? []
                    : Array.isArray(googleReviewsData)
                      ? googleReviewsData
                      : (googleReviewsData.reviews && Array.isArray(googleReviewsData.reviews)
                          ? googleReviewsData.reviews
                          : []);
                  
                  if (reviewsArray.length > 0) {
                    const validRatings = reviewsArray
                      .map((review: any) => review.rating)
                      .filter((rating: any) => typeof rating === 'number' && rating > 0);
                    
                    if (validRatings.length > 0) {
                      finalRating = validRatings.reduce((sum: number, rating: number) => sum + rating, 0) / validRatings.length;
                    }
                  }
                } catch (error) {
                  console.error('Error calculating rating from Google reviews:', error);
                }
              }
            }
            
            // Default to 0 if still no rating
            finalRating = finalRating ?? 0;
            
            return finalRating;
          })(),
          price_range: restaurantData.price_range || '$',
          kosher_type: restaurantData.kosher_category || '',
          kosher_agency: restaurantData.certifying_agency || '',
          kosher_certification: (() => {
            // Map boolean kosher fields to certification string
            const certifications = []
            if (restaurantData.is_cholov_yisroel) certifications.push('Cholov Yisroel')
            if (restaurantData.is_pas_yisroel) certifications.push('Pas Yisroel')
            return certifications.join(', ') || restaurantData.kosher_certification || ''
          })(),
          images: (() => {
            // Extract image URLs from the images array
            const imageUrls = restaurantData.images?.map((img: any) => img.image_url) || [];
            const allImages = [
              ...imageUrls,
              ...(restaurantData.business_images || []),
              restaurantData.image_url
            ].filter(Boolean);
            
            if (allImages.length === 0) {
              return ['/images/default-restaurant.webp'];
            }
            
            // Return raw image URLs - let the mapping handle fallback processing
            return allImages;
          })(),
          hours: (() => {
            console.log('Processing hours data...')
            console.log('restaurantData.hours_parsed:', restaurantData.hours_parsed)
            console.log('restaurantData.hours_json:', restaurantData.hours_json)
            console.log('restaurantData.hours_of_operation:', restaurantData.hours_of_operation)
            
            if (restaurantData.hours_parsed) {
              console.log('Using hours_parsed from restaurantData')
              // hours_parsed is already a parsed object, not a JSON string
              return parseHoursFromJson(restaurantData.hours_parsed)
            } else if (restaurantData.hours_json) {
              console.log('Using hours_json from restaurantData')
              return parseHoursFromJson(restaurantData.hours_json)
            } else if (restaurantData.hours_of_operation) {
              console.log('Using hours_of_operation from restaurantData')
              // Try to parse hours_of_operation as JSON or use it as is
              try {
                return parseHoursFromJson(restaurantData.hours_of_operation)
              } catch (error) {
                console.log('Failed to parse hours_of_operation as JSON, using as text')
                // If it's not JSON, try to create a simple hours structure
                return parseHoursFromJson('{"weekday_text": []}')
              }
            } else {
              console.log('No hours data available')
              return parseHoursFromJson('{"weekday_text": []}')
            }
          })(),
          contact: {
            phone: restaurantData.phone_number || restaurantData.owner_phone || '',
            email: restaurantData.business_email || restaurantData.owner_email || '',
            website: restaurantData.website || restaurantData.google_listing_url || '',
          },
          location: {
            latitude: restaurantData.latitude || 0,
            longitude: restaurantData.longitude || 0,
          },
          stats: {
            view_count: 1234, // TODO: Get from backend
            share_count: 0, // TODO: Get from backend
          },
          google_reviews: restaurantData.google_reviews,
          admin_settings: {
            show_order_button: restaurantData.admin_settings?.show_order_button ?? true, // Default to true if not provided
            order_url: restaurantData.admin_settings?.order_url || '',
          }
        }

        setEatery(eateryData)
        setLoading(false)
        
        // Fetch reviews for this restaurant
        if (eateryData.id) {
          fetchReviews(eateryData.id, 0, 10) // Start with first 10 reviews
        }
        
        // Debug logging for rating and reviews
        console.log('=== RATING AND REVIEWS DEBUG ===');
        console.log('eateryData.rating:', eateryData.rating);
        console.log('eateryData.google_reviews:', eateryData.google_reviews);
        console.log('===============================');
      } catch (err) {
        console.error('Error fetching eatery data:', err)
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
        
        // More detailed error message
        let errorMessage = 'Failed to load eatery data'
        if (err instanceof Error) {
          errorMessage = err.message
          if (err.message.includes('fetch')) {
            errorMessage = `Network error: ${err.message}. Please check your connection.`
          }
        }
        
        setError(errorMessage)
        setLoading(false)
      }
    }

    if (eateryId) {
      fetchEateryData()
    }
  }, [eateryId])

  // Convert new location format to old format for compatibility with mapEateryToListingData
  const legacyUserLocation = userLocation ? {
    lat: userLocation.latitude,
    lng: userLocation.longitude
  } : null;

  // Render loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p className="text-gray-600">Loading eatery details for ID: {eateryId}</p>
          </div>
        </div>
      </main>
    )
  }

  // Render error state
  if (error) {
    // Special handling for restaurant not found
    if (error === 'restaurant_not_found') {
      return (
        <main className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4 text-gray-800">Restaurant Not Found</h1>
              <p className="text-lg text-gray-600 mb-6">
                We couldn&apos;t find a restaurant with ID &quot;{eateryId}&quot;
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-3 text-blue-800">Suggestions</h2>
                <ul className="text-left text-blue-700 space-y-2">
                  <li>• Check if the restaurant ID is correct</li>
                  <li>• Try searching for the restaurant on our main page</li>
                  <li>• The restaurant may have been removed</li>
                  <li>• Contact us if you believe this is an error</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Link 
                  href="/eatery" 
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All Restaurants
                </Link>
                <br />
                <Link 
                  href="/" 
                  className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Go to Homepage
                </Link>
              </div>
            </div>
          </div>
        </main>
      )
    }
    
    // Generic error handling
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-gray-600">Eatery ID: {eateryId}</p>
            <div className="mt-4">
              <Link 
                href="/eatery" 
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Render eatery details
  if (eatery) {
    try {
      const finalListingData = mapEateryToListingData(eatery, legacyUserLocation, reviews, requestLocation, permissionStatus === 'unsupported' ? 'unknown' : permissionStatus)
      
      
      // Add pagination and load more props
      const listingDataWithPagination = {
        ...finalListingData,
        userLocation: userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        } : undefined,
        reviewsPagination,
        onLoadMoreReviews: handleLoadMoreReviews,
        reviewsLoading
      }
      
      return <ListingPage data={listingDataWithPagination} />
    } catch (err) {
      console.error('Error mapping eatery data:', err)
      return (
        <main className="min-h-screen bg-gray-50 p-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
              <p className="text-gray-600 mb-4">Failed to display eatery details</p>
              <p className="text-gray-600">Error: {err instanceof Error ? err.message : 'Unknown error'}</p>
            </div>
          </div>
        </main>
      )
    }
  }

  // Render default state
  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Data</h1>
          <p className="text-gray-600">No eatery data available for ID: {eateryId}</p>
        </div>
      </div>
    </main>
  )
}
