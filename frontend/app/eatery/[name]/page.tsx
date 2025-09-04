"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ListingPage } from '@/components/listing-details-utility/listing-page'
import { mapEateryToListingData } from '@/utils/eatery-mapping'
import { EateryDB, UserLocation } from '@/types/listing'
import Link from 'next/link'
import ErrorBoundary from '../components/ErrorBoundary'


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
                    console.log('Alternative time match 3 found:', altTimeMatch3)
                    hours[dayMap[dayName]] = {
                      open: `${altTimeMatch3[1]}:${altTimeMatch3[2]}`,
                      close: `${altTimeMatch3[3]}:${altTimeMatch3[4]}`,
                      closed: false
                    }
                  } else {
                    console.log('No alternative time match found')
                    hours[dayMap[dayName]] = { open: '', close: '', closed: true }
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log('Parsed hours:', hours)
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

export default function EateryNamePage() {
  return (
    <ErrorBoundary>
      <EateryNamePageContent />
    </ErrorBoundary>
  );
}

function EateryNamePageContent() {
  const params = useParams()
  const [eatery, setEatery] = useState<EateryDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsPagination, setReviewsPagination] = useState<any>(null)

  // Load more reviews function
  const handleLoadMoreReviews = () => {
    if (eatery && reviewsPagination?.hasMore && !reviewsLoading) {
      const nextOffset = reviewsPagination.offset + reviewsPagination.limit
      fetchReviews(eatery.id, nextOffset, reviewsPagination.limit)
    }
  }

  const eateryName = params.name as string

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

  // Fetch eatery data from backend API
  useEffect(() => {
    const fetchEateryData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to find the restaurant by name first (for URL slug to restaurant mapping)
        
        // Use the frontend API route which handles the backend connection
        const searchUrl = `/api/restaurants?limit=1000`
        
        const searchResponse = await fetch(searchUrl)
        
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text()
          console.error('Search response error:', errorText)
          throw new Error(`Failed to fetch restaurants: ${searchResponse.status} - ${errorText}`)
        }
        
        const searchData = await searchResponse.json()
        const restaurants = searchData.restaurants || []
        
        // Try to find the restaurant by name (case-insensitive, handle apostrophes and hyphens)
        const normalizedEateryName = eateryName.toLowerCase().replace(/['-]/g, '')
        
        const foundRestaurant = restaurants.find((restaurant: any) => {
          if (!restaurant.name) return false
          
          const restaurantName = restaurant.name.toLowerCase()
          
          // Convert URL slug back to potential restaurant name format
          // e.g., "ariels-bamboo-kitchen" -> "ariels bamboo kitchen"
          const eateryNameWithSpaces = eateryName.toLowerCase().replace(/-/g, ' ')
          
          // Also try with apostrophes restored - handle multiple patterns
          const eateryNameWithApostrophes = eateryNameWithSpaces
            .replace(/ariels/, "ariel's")
            .replace(/ariel s/, "ariel's")
          
          // Normalize both names for comparison (remove apostrophes and hyphens)
          const normalizedRestaurantName = restaurantName.replace(/['-]/g, '')
          
          // Check multiple variations
          return restaurantName === eateryNameWithSpaces ||
                 restaurantName === eateryNameWithApostrophes ||
                 restaurantName === normalizedEateryName ||
                 normalizedRestaurantName === normalizedEateryName ||
                 restaurantName.includes(eateryNameWithSpaces) ||
                 restaurantName.includes(eateryNameWithApostrophes) ||
                 eateryNameWithSpaces.includes(restaurantName) ||
                 eateryNameWithApostrophes.includes(restaurantName) ||
                 normalizedRestaurantName.includes(normalizedEateryName) ||
                 normalizedEateryName.includes(normalizedRestaurantName)
        })

        if (!foundRestaurant) {
          // Instead of throwing an error, set a specific "not found" state
          setError('restaurant_not_found')
          setLoading(false)
          return
        }

        // Now use the backend's ID-based search utility
        
        // Use the frontend API route for details
        const detailUrl = `/api/restaurants/${foundRestaurant.id}`
        
        const detailResponse = await fetch(detailUrl)
        
        if (!detailResponse.ok) {
          const errorText = await detailResponse.text()
          console.error('Detail response error:', errorText)
          throw new Error(`Failed to fetch restaurant details: ${detailResponse.status} - ${errorText}`)
        }
        
        const detailData = await detailResponse.json()
        
        // Convert restaurant data to EateryDB format
        const eateryData: EateryDB = {
          id: detailData.id?.toString() || foundRestaurant.id?.toString(),
          name: detailData.name || foundRestaurant.name,
          description: detailData.description || foundRestaurant.description || '',
          short_description: detailData.short_description || foundRestaurant.short_description || '',
          address: (() => {
            // Construct full address from components
            const addressParts = [
              detailData.address || foundRestaurant.address,
              detailData.city || foundRestaurant.city,
              detailData.state || foundRestaurant.state,
              detailData.zip_code || foundRestaurant.zip_code
            ].filter(Boolean)
            return addressParts.join(', ')
          })(),
          city: detailData.city || foundRestaurant.city || '',
          state: detailData.state || foundRestaurant.state || '',
          zip_code: detailData.zip_code || foundRestaurant.zip_code || '',
          phone_number: detailData.contact?.phone || foundRestaurant.phone_number || '',
          listing_type: detailData.listing_type || foundRestaurant.listing_type || 'restaurant',
          rating: detailData.rating || foundRestaurant.google_rating || 0,
          price_range: detailData.price_range || foundRestaurant.price_range || '$',
          kosher_type: detailData.kosher_type || foundRestaurant.kosher_category || '',
          kosher_agency: detailData.kosher_agency || foundRestaurant.certifying_agency || '',
          kosher_certification: detailData.kosher_certification || '',
          images: (() => {
            // Ensure we have at least one image for the gallery
            const allImages = [
              ...(detailData.images || []),
              ...(foundRestaurant.additional_images || []),
              foundRestaurant.image_url
            ].filter(Boolean)
            return allImages.length > 0 ? allImages : ['/modern-product-showcase-with-clean-background.png']
          })(),
          hours: (() => {
            console.log('Processing hours data...')
            console.log('detailData.hours_parsed:', detailData.hours_parsed)
            console.log('foundRestaurant.hours_json:', foundRestaurant.hours_json)
            
            if (detailData.hours_parsed) {
              console.log('Using hours_parsed from detailData')
              // hours_parsed is already a parsed object, not a JSON string
              return parseHoursFromJson(detailData.hours_parsed)
            } else if (foundRestaurant.hours_json) {
              console.log('Using hours_json from foundRestaurant')
              return parseHoursFromJson(foundRestaurant.hours_json)
            } else {
              console.log('No hours data available')
              return parseHoursFromJson('{"weekday_text": []}')
            }
          })(),
          contact: {
            phone: detailData.contact?.phone || foundRestaurant.phone_number || '',
            email: detailData.contact?.email || foundRestaurant.business_email || '',
            website: detailData.contact?.website || foundRestaurant.website || '',
          },
          location: {
            latitude: detailData.location?.latitude || foundRestaurant.latitude || 0,
            longitude: detailData.location?.longitude || foundRestaurant.longitude || 0,
          },
          stats: {
            view_count: 1234, // TODO: Get from backend
            share_count: 0, // TODO: Get from backend
          },
          admin_settings: {
            show_order_button: detailData.admin_settings?.show_order_button ?? true, // Default to true if not provided
            order_url: detailData.admin_settings?.order_url || '',
          }
        }

        setEatery(eateryData)
        setLoading(false)
        
        // Fetch reviews for this restaurant
        if (eateryData.id) {
          fetchReviews(eateryData.id, 0, 10) // Start with first 10 reviews
        }
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

    if (eateryName) {
      fetchEateryData()
    }
  }, [eateryName])

  // TODO: Implement location permission checking when needed
  // Function removed to fix lint warning - not used in current implementation

  // Handle location request from distance button
  const handleLocationRequest = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    // Always try to request location, even if previously denied
    // This allows users to try again if they've changed their browser settings
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now()
        });
        setLocationError(null);
        setLocationPermission('granted');
      },
      (geolocationError) => {
        let errorMessage = 'Unable to get your location';
        
        switch (geolocationError.code) {
          case geolocationError.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
            setLocationPermission('denied');
            break;
          case geolocationError.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case geolocationError.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        setLocationError(errorMessage);
        setUserLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Monitor location permission changes and set up location watching
  useEffect(() => {
    let watchId: number | null = null;
    let permissionResult: PermissionStatus | null = null;

    const setupLocationWatching = async () => {
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          permissionResult = permission;
          
          const handlePermissionChange = () => {
            const newState = permission.state;
            setLocationPermission(newState as 'granted' | 'denied' | 'prompt');
            
            // If permission was revoked, clear location and stop watching
            if (newState === 'denied') {
              setUserLocation(null);
              setLocationError('Location access was denied. Please enable location services in your browser settings.');
              if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
              }
            }
            
            // If permission was granted, try to get location and start watching
            if (newState === 'granted') {
              handleLocationRequest();
              
              // Start watching for location changes
              if (navigator.geolocation && !watchId) {
                watchId = navigator.geolocation.watchPosition(
                  (position) => {
                    setUserLocation({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      timestamp: Date.now()
                    });
                    setLocationError(null);
                  },
                  (watchError) => {
                    if (watchError.code === watchError.PERMISSION_DENIED) {
                      setLocationPermission('denied');
                      setUserLocation(null);
                      setLocationError('Location access was denied. Please enable location services in your browser settings.');
                    }
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 300000, // 5 minutes
                  }
                );
              }
            }
          };

          permission.addEventListener('change', handlePermissionChange);
          
          // Initial setup
          if (permission.state === 'granted' && !userLocation) {
            handleLocationRequest();
          }
        } catch (error) {
          // Silently handle permission setup errors
          console.error('Error setting up location permissions:', error);
        }
      }
    };

    setupLocationWatching();

    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (permissionResult) {
        permissionResult.removeEventListener('change', () => {});
      }
    };
  }, [userLocation, handleLocationRequest]);

  // Note: getUserLocation function was removed, location is handled by handleLocationRequest

  // Map eatery data to listing format
  const listingData = eatery ? mapEateryToListingData(eatery, userLocation, reviews, handleLocationRequest, locationPermission) : undefined

  // Render loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p className="text-gray-600">Loading eatery details for: {eateryName}</p>
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
                We couldn&apos;t find a restaurant named &quot;{eateryName}&quot;
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-3 text-blue-800">Suggestions</h2>
                <ul className="text-left text-blue-700 space-y-2">
                  <li>• Check the spelling of the restaurant name</li>
                  <li>• Try searching for the restaurant on our main page</li>
                  <li>• The restaurant may have been removed or renamed</li>
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
            <p className="text-gray-600">Eatery: {eateryName}</p>
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
      const finalListingData = mapEateryToListingData(eatery, userLocation, reviews, handleLocationRequest, locationPermission)
      
      // Add pagination and load more props
      const listingDataWithPagination = {
        ...finalListingData,
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
          <p className="text-gray-600">No eatery data available for: {eateryName}</p>
        </div>
      </div>
    </main>
  )
}
