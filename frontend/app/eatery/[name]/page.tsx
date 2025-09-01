/* eslint-disable no-console */
"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ListingPage } from "@/components/listing-details-utility/listing-page"
import { mapEateryToListingData } from "@/utils/eatery-mapping"
import { EateryDB, UserLocation } from "@/types/listing"



/**
 * Parse hours from the backend JSON format into EateryDB format
 */
function parseHoursFromJson(hoursData: string | object): EateryDB['hours'] {
  try {
    const parsed = typeof hoursData === 'string' ? JSON.parse(hoursData) : hoursData
    const weekdayText = parsed.weekday_text || []
    
    // Check if there are no hours data at all
    if (!weekdayText || weekdayText.length === 0) {
      console.log('No hours data available in database')
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
      // eslint-disable-next-line no-console
      console.log('Parsing day text:', dayText)
      const dayMatch = dayText.match(/^(\w+):\s*(.+)$/i)
      if (dayMatch) {
        const dayName = dayMatch[1].toLowerCase()
        const rawTimeText = dayMatch[2].trim()
        // eslint-disable-next-line no-console
        console.log('Day name:', dayName, 'Raw time text:', rawTimeText)
        
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
            
            // eslint-disable-next-line no-console
            console.log('Normalized time text:', normalizedTimeText)
            
            // More flexible regex to handle various time formats
            const timeMatch = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
            if (timeMatch) {
              // eslint-disable-next-line no-console
              console.log('Time match found:', timeMatch)
              hours[dayMap[dayName]] = {
                open: `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3]}`,
                close: `${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6]}`,
                closed: false
              }
            } else {
              // eslint-disable-next-line no-console
              console.log('No time match for normalized text:', normalizedTimeText)
              // Try alternative format without AM/PM for first time
              const altTimeMatch = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
              if (altTimeMatch) {
                console.log('Alternative time match found:', altTimeMatch)
                hours[dayMap[dayName]] = {
                  open: `${altTimeMatch[1]}:${altTimeMatch[2]}`,
                  close: `${altTimeMatch[3]}:${altTimeMatch[4]} ${altTimeMatch[5]}`,
                  closed: false
                }
              } else {
                // Try format with AM/PM for first time but not second (like "12:00 AM – 8:00")
                const altTimeMatch2 = normalizedTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})/i)
                if (altTimeMatch2) {
                  console.log('Alternative time match 2 found:', altTimeMatch2)
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
      console.log('Fetching reviews for restaurant:', restaurantId, 'offset:', offset, 'limit:', limit)
      
      // Use the frontend API route for reviews
      const response = await fetch(`/api/reviews?restaurantId=${restaurantId}&status=approved&limit=${limit}&offset=${offset}&includeGoogleReviews=true`)
      if (!response.ok) {
        console.log('No reviews found or error fetching reviews')
        if (offset === 0) {
          setReviews([])
        }
        return
      }
      
      const data = await response.json()
      console.log('Received reviews data:', data)
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (data.success && data.data && data.data.reviews) {
        console.log('Setting reviews:', data.data.reviews)
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
        console.log('No reviews found in response')
        console.log('Data structure:', JSON.stringify(data, null, 2))
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

  console.log('=== EATERY NAME PAGE DEBUG ===')
  console.log('Page: Eatery Name Page')
  console.log('Eatery Name:', eateryName)
  console.log('Loading:', loading)
  console.log('Error:', error)
  console.log('Raw eatery data:', eatery)
  console.log('User location:', userLocation)
  console.log('Mapped listing data:', eatery ? mapEateryToListingData(eatery, userLocation) : undefined)
  console.log('==========================')

  // Fetch eatery data from backend API
  useEffect(() => {
    const fetchEateryData = async () => {
      try {
        console.log('Starting to fetch eatery data for:', eateryName)
        setLoading(true)
        setError(null)

        // Try to find the restaurant by name first (for URL slug to restaurant mapping)
        console.log('Fetching restaurants list...')
        // Use the frontend API route which handles the backend connection
        const searchUrl = `/api/restaurants?limit=1000`
        console.log('Fetching from:', searchUrl)
        
        const searchResponse = await fetch(searchUrl)
        console.log('Search response status:', searchResponse.status)
        
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text()
          console.error('Search response error:', errorText)
          throw new Error(`Failed to fetch restaurants: ${searchResponse.status} - ${errorText}`)
        }
        
        const searchData = await searchResponse.json()
        const restaurants = searchData.restaurants || []
        console.log('Found', restaurants.length, 'restaurants')
        
        // Try to find the restaurant by name (case-insensitive, handle apostrophes and hyphens)
        const normalizedEateryName = eateryName.toLowerCase().replace(/['-]/g, '')
        console.log('Looking for restaurant with normalized name:', normalizedEateryName)
        
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
          const normalizedEateryName = eateryName.toLowerCase().replace(/['-]/g, '')
          
          console.log(`Comparing URL slug: "${eateryName}" with restaurant: "${restaurantName}"`)
          console.log(`  - URL with spaces: "${eateryNameWithSpaces}"`)
          console.log(`  - URL with apostrophes: "${eateryNameWithApostrophes}"`)
          console.log(`  - Normalized restaurant name: "${normalizedRestaurantName}"`)
          console.log(`  - Normalized eatery name: "${normalizedEateryName}"`)
          
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
          console.log('Restaurant not found. Available restaurants:', restaurants.map((r: any) => r.name))
          throw new Error(`Restaurant not found: ${eateryName}`)
        }

        console.log('Found restaurant:', foundRestaurant.name, 'with ID:', foundRestaurant.id)

        // Now use the backend's ID-based search utility
        console.log('Fetching restaurant details...')
        // Use the frontend API route for details
        const detailUrl = `/api/restaurants/${foundRestaurant.id}`
        console.log('Fetching details from:', detailUrl)
        
        const detailResponse = await fetch(detailUrl)
        console.log('Detail response status:', detailResponse.status)
        
        if (!detailResponse.ok) {
          const errorText = await detailResponse.text()
          console.error('Detail response error:', errorText)
          throw new Error(`Failed to fetch restaurant details: ${detailResponse.status} - ${errorText}`)
        }
        
        const detailData = await detailResponse.json()
        console.log('Received restaurant details:', detailData)
        
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

        console.log('Converted eatery data:', eateryData)
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

  // Check location permission status
  const checkLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!navigator.geolocation) {
      return 'denied';
    }

    try {
      // Use the Permissions API if available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return permission.state as 'granted' | 'denied' | 'prompt';
      }
      
      // Fallback: try to get current position to check permission
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              resolve('denied');
            } else {
              resolve('prompt');
            }
          },
          { timeout: 1000, maximumAge: 0 }
        );
      });
    } catch {
      return 'prompt';
    }
  };

  // Get user location with proper permission handling
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    const permission = await checkLocationPermission();
    setLocationPermission(permission);

    if (permission === 'denied') {
      setLocationError('Location access was denied. Please enable location services in your browser settings.');
      setUserLocation(null);
      return;
    }

    if (permission === 'prompt') {
      // Don't automatically request location, wait for user action
      setUserLocation(null);
      return;
    }

    // Permission is granted, get location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
        setLocationPermission('granted');
      },
      (error) => {
        console.log('Location error:', error.message);
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
            setLocationPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
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
  };

  // Handle location request from distance button
  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    // Always try to request location, even if previously denied
    // This allows users to try again if they've changed their browser settings
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
        setLocationPermission('granted');
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
            setLocationPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        setLocationError(errorMessage);
        setUserLocation(null);
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Monitor location permission changes and set up location watching
  useEffect(() => {
    let watchId: number | null = null;

    if ('permissions' in navigator) {
      const permission = navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      permission.then((result) => {
        const handlePermissionChange = () => {
          console.log('Location permission changed to:', result.state);
          setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
          
          // If permission was revoked, clear location and stop watching
          if (result.state === 'denied') {
            setUserLocation(null);
            setLocationError('Location access was denied. Please enable location services in your browser settings.');
            if (watchId) {
              navigator.geolocation.clearWatch(watchId);
              watchId = null;
            }
          }
          
          // If permission was granted, try to get location and start watching
          if (result.state === 'granted') {
            getUserLocation();
            
            // Start watching for location changes
            if (navigator.geolocation && !watchId) {
              watchId = navigator.geolocation.watchPosition(
                (position) => {
                  console.log('Location updated:', position.coords);
                  setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  });
                  setLocationError(null);
                },
                (error) => {
                  console.log('Location watch error:', error.message);
                  if (error.code === error.PERMISSION_DENIED) {
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

        result.addEventListener('change', handlePermissionChange);
        
        // Initial setup
        if (result.state === 'granted' && !userLocation) {
          getUserLocation();
        }
        
        return () => {
          result.removeEventListener('change', handlePermissionChange);
          if (watchId) {
            navigator.geolocation.clearWatch(watchId);
          }
        };
      });
    }

    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [userLocation]);

  useEffect(() => {
    getUserLocation()
  }, [])

  // Map eatery data to listing format
  const listingData = eatery ? mapEateryToListingData(eatery, userLocation, reviews, handleLocationRequest, locationPermission) : undefined

  // Debug logging
  console.log('=== EATERY NAME PAGE DEBUG ===')
  console.log('Page: Eatery Name Page')
  console.log('Eatery Name:', eateryName)
  console.log('Loading:', loading)
  console.log('Error:', error)
  console.log('Raw eatery data:', eatery)
  console.log('User location:', userLocation)
  console.log('Location permission:', locationPermission)
  console.log('Location error:', locationError)
  console.log('Mapped listing data:', listingData)
  console.log('==========================')

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
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-gray-600">Eatery: {eateryName}</p>
          </div>
        </div>
      </main>
    )
  }

  // Render eatery details
  if (eatery) {
    try {
      const listingData = mapEateryToListingData(eatery, userLocation, reviews, handleLocationRequest, locationPermission)
      console.log('Final listing data with reviews:', listingData)
      
      // Add pagination and load more props
      const listingDataWithPagination = {
        ...listingData,
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
