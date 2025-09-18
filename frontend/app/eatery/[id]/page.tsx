"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ListingPage } from '@/components/listing-details-utility/listing-page'
import { mapEateryToListingData } from '@/utils/eatery-mapping'
import { EateryDB } from '@/types/listing'
import { useLocationData } from '@/hooks/useLocationData'
import { useViewTracking } from '@/hooks/useViewTracking'
import Link from 'next/link'
import ErrorBoundary from '../components/ErrorBoundary'
import LocationAwarePage from '@/components/LocationAwarePage'
import { deduplicatedFetch } from '@/lib/utils/request-deduplication'
import { getRestaurant } from '@/lib/api/restaurants'
import { useFavorites } from '@/lib/utils/favorites'

/**
 * Parse hours from the backend JSON format into EateryDB format
 */
function parseHoursFromJson(hoursData: string | object): EateryDB['hours'] {
  
  try {
    const parsed = typeof hoursData === 'string' ? JSON.parse(hoursData) : hoursData
    const weekdayText = parsed.weekday_text || []
    
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
      const dayMatch = dayText.match(/^(\w+):\s*(.+)$/i)
      if (dayMatch) {
        const dayName = dayMatch[1].toLowerCase()
        const rawTimeText = dayMatch[2].trim()
        
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
            
            
            // More flexible regex to handle various time formats
            const timeMatch = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
            if (timeMatch) {
              hours[dayMap[dayName]] = {
                open: `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`,
                close: `${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6]}`,
                closed: false
              }
            } else {
              // Try alternative format without AM/PM for first time
              const altTimeMatch = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
              if (altTimeMatch) {
                hours[dayMap[dayName]] = {
                  open: `${altTimeMatch[1]}:${altTimeMatch[2]}`,
                  close: `${altTimeMatch[3]}:${altTimeMatch[4]} ${altTimeMatch[5]}`,
                  closed: false
                }
              } else {
                // Try format with AM/PM for first time but not second (like "12:00 AM – 8:00")
                const altTimeMatch2 = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})/i)
                if (altTimeMatch2) {
                  hours[dayMap[dayName]] = {
                    open: `${altTimeMatch2[1]}:${altTimeMatch2[2]} ${altTimeMatch2[3]}`,
                    close: `${altTimeMatch2[4]}:${altTimeMatch2[5]}`,
                    closed: false
                  }
                } else {
                  // Try format with no AM/PM at all (like "12:00 – 8:00")
                  const altTimeMatch3 = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/i)
                  if (altTimeMatch3) {
                    hours[dayMap[dayName]] = {
                      open: `${altTimeMatch3[1]}:${altTimeMatch3[2]}`,
                      close: `${altTimeMatch3[3]}:${altTimeMatch3[4]}`,
                      closed: false
                    }
                  } else {
                    hours[dayMap[dayName]] = { open: '', close: '', closed: true }
                  }
                }
              }
            }
          }
        }
      }
    })

    return hours
  } catch (err) {
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing hours JSON:', err)
    }
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
  const isFetchingRef = useRef(false)
  
  // Use favorites hook to get reactive favorite state
  const { isFavorite, toggleFavorite } = useFavorites()

  // Use the new location utility system
  const {
    userLocation,
    permissionStatus,
    isLoading: _locationLoading,
    error: _locationError,
    requestLocation,
    getItemDisplayText: _getItemDisplayText
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

  // View tracking hook
  const { trackView } = useViewTracking({
    restaurantId: eateryId,
    enabled: true,
    debounceMs: 2000 // 2 second debounce to prevent spam
  })

  // Fetch reviews for a restaurant with deduplication
  const fetchReviews = useCallback(async (restaurantId: string, offset: number = 0, limit: number = 10) => {
    try {
      setReviewsLoading(true)
      
      // Use deduplicated fetch to prevent duplicate API calls
      const data = await deduplicatedFetch(`/api/v5/reviews?entity_type=restaurants&entity_id=${restaurantId}&limit=${limit}&cursor=${offset}`)
      
      if (data && data.reviews) {
        if (offset === 0) {
          // First page - replace all reviews
          setReviews(data.reviews)
        } else {
          // Subsequent pages - append to existing reviews
          setReviews(prevReviews => [...prevReviews, ...data.reviews])
        }
        
        // Store pagination info
        setReviewsPagination(data.pagination || {})
      } else {
        if (offset === 0) {
          setReviews([])
        }
      }
    } catch (err) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching reviews:', err)
      }
      if (offset === 0) {
        setReviews([])
      }
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  // Fetch eatery data by ID - optimized to prevent duplicate calls
  useEffect(() => {
    const fetchEateryData = async () => {
      // Prevent duplicate API calls
      if (isFetchingRef.current) {
        return
      }
      
      try {
        isFetchingRef.current = true
        setLoading(true)
        setError(null)

        // Validate ID
        const restaurantId = parseInt(eateryId)
        if (isNaN(restaurantId)) {
          setError('Invalid restaurant ID')
          setLoading(false)
          isFetchingRef.current = false
          return
        }

        // Use the restaurants API module for restaurant details
        const detailData = await getRestaurant(restaurantId)
        
        // Extract restaurant data from the response
        let restaurantData = null
        if (detailData) {
          // The getRestaurant function returns the restaurant directly or null
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
            // Use google_rating as primary source for consistency with grid
            let finalRating = restaurantData.google_rating ?? restaurantData.rating ?? restaurantData.star_rating ?? restaurantData.quality_rating;
            
            // Only calculate from Google reviews if no rating fields are available
            if ((finalRating === null || finalRating === undefined) && restaurantData.google_reviews) {
              try {
                
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
              } catch (err) {
                // Log error in development only
                if (process.env.NODE_ENV === 'development') {
                  console.error('Error calculating rating from Google reviews:', err);
                }
              }
            }
            
            // Default to 0 if still no rating
            finalRating = finalRating ?? 0;
            
            // Convert to number if it's a string
            return typeof finalRating === 'string' ? parseFloat(finalRating) || 0 : finalRating;
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
            // Prioritize restaurant_images from the database relationship
            const restaurantImages = (restaurantData as any).restaurant_images?.map((img: any) => img.image_url) || [];
            
            // Only use other sources if no restaurant_images are available
            let allImages = [];
            if (restaurantImages.length > 0) {
              // Use restaurant_images as primary source
              allImages = [
                ...restaurantImages,
                ...(restaurantData.business_images || []).filter(img => 
                  !restaurantImages.includes(img) // Avoid duplicates
                )
              ];
            } else {
              // Fallback to legacy sources
              const legacyImages = restaurantData.images?.map((img: any) => img.image_url) || [];
              allImages = [
                ...legacyImages,
                ...(restaurantData.business_images || []),
                restaurantData.image_url
              ].filter(Boolean);
            }
            
            if (allImages.length === 0) {
              return ['/images/default-restaurant.webp'];
            }
            
            // Filter out placeholder images before deduplication
            const realImages = allImages.filter(img => 
              img && 
              typeof img === 'string' && 
              !img.includes('/images/default-restaurant.webp') &&
              !img.includes('placeholder') &&
              !img.includes('default')
            );
            
            // If no real images after filtering, use fallback
            if (realImages.length === 0) {
              return ['/images/default-restaurant.webp'];
            }
            
            // Remove duplicate images using Set
            const uniqueImages = Array.from(new Set(realImages));
            
            // Return deduplicated real image URLs
            return uniqueImages;
          })(),
          hours: (() => {
            
            if (restaurantData.hours_parsed) {
              // hours_parsed is already a parsed object, not a JSON string
              return parseHoursFromJson(restaurantData.hours_json || '{}')
            } else if (restaurantData.hours_json) {
              return parseHoursFromJson(restaurantData.hours_json)
            } else if (restaurantData.hours_of_operation) {
              // Try to parse hours_of_operation as JSON or use it as is
              try {
                return parseHoursFromJson(restaurantData.hours_of_operation)
              } catch (_err) {
                // If it's not JSON, try to create a simple hours structure
                return parseHoursFromJson('{"weekday_text": []}')
              }
            } else {
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
            view_count: restaurantData.view_count || 0,
            share_count: restaurantData.share_count || 0,
            favorite_count: restaurantData.favorite_count || 0,
          },
          google_reviews: restaurantData.google_reviews,
          admin_settings: {
            show_order_button: restaurantData.admin_settings?.show_order_button ?? true, // Default to true if not provided
            order_url: restaurantData.admin_settings?.order_url || '',
          }
        }

        setEatery(eateryData)
        setLoading(false)
        isFetchingRef.current = false
        
        // Track the view after successful data load (non-blocking)
        trackView()
        
        // Fetch reviews for this restaurant (non-blocking)
        if (eateryData.id) {
          fetchReviews(eateryData.id, 0, 10) // Start with first 10 reviews
        }
        
      } catch (err) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching eatery data:', err)
          console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
        }
        
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
        isFetchingRef.current = false
      }
    }

    if (eateryId) {
      fetchEateryData()
    }
  }, [eateryId, fetchReviews, trackView])

  // Convert new location format to old format for compatibility with mapEateryToListingData
  const legacyUserLocation = useMemo(() => {
    return userLocation ? {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    } : null;
  }, [userLocation]);

  // Memoize the listing data to prevent infinite re-renders
  // This must be called before any early returns to maintain hook order
  const finalListingData = useMemo(() => {
    if (!eatery) return null
    
    try {
      const listingData = mapEateryToListingData(eatery, legacyUserLocation, reviews, requestLocation, permissionStatus === 'unsupported' ? 'unknown' : permissionStatus)
      
      // Override the favorite state and handler with reactive versions
      if (listingData.header) {
        listingData.header.isFavorited = isFavorite(eatery.id)
        listingData.header.onFavorite = () => {
          if (eatery) {
            toggleFavorite({ id: eatery.id, name: eatery.name })
          }
        }
      }
      
      return listingData
    } catch (err) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error mapping eatery data:', err)
      }
      return null
    }
  }, [eatery, legacyUserLocation, reviews, requestLocation, permissionStatus, isFavorite, toggleFavorite])

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
  if (eatery && finalListingData) {
    try {
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
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error mapping eatery data:', err)
      }
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
