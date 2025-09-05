"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ListingPage } from '@/components/listing-details-utility/listing-page'
import { mapShulToListingData } from '@/utils/shul-mapping'
import { ShulDB, UserLocation } from '@/types/listing'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

/**
 * Parse hours from the backend JSON format into ShulDB format
 */
function parseHoursFromJson(hoursData: string | object): ShulDB['hours'] {
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
    
    const hours: ShulDB['hours'] = {
      monday: { open: '', close: '', closed: true },
      tuesday: { open: '', close: '', closed: true },
      wednesday: { open: '', close: '', closed: true },
      thursday: { open: '', close: '', closed: true },
      friday: { open: '', close: '', closed: true },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true },
    }

    const dayMap: { [key: string]: keyof ShulDB['hours'] } = {
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

    console.log('Parsed shul hours:', hours)
    return hours
  } catch (err) {
    console.error('Error parsing shul hours JSON:', err)
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

export default function ShulNamePage() {
  return (
    <ErrorBoundary>
      <ShulNamePageContent />
    </ErrorBoundary>
  );
}

function ShulNamePageContent() {
  const params = useParams()
  const [shul, setShul] = useState<ShulDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [_locationError, setLocationError] = useState<string | null>(null) // TODO: Implement location error handling
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsPagination, setReviewsPagination] = useState<any>(null)

  // Load more reviews function
  const handleLoadMoreReviews = () => {
    if (shul && reviewsPagination?.hasMore && !reviewsLoading) {
      const nextOffset = reviewsPagination.offset + reviewsPagination.limit
      fetchReviews(shul.id, nextOffset, reviewsPagination.limit)
    }
  }

  const shulName = params.name as string

  // Fetch reviews for a synagogue
  const fetchReviews = async (synagogueId: string, offset: number = 0, limit: number = 10) => {
    try {
      setReviewsLoading(true)
      
      // Use the frontend API route for reviews
      const response = await fetch(`/api/reviews?restaurantId=${synagogueId}&status=approved&limit=${limit}&offset=${offset}&includeGoogleReviews=true`)
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

  // Fetch shul data from backend API
  useEffect(() => {
    const fetchShulData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to find the synagogue by name first (for URL slug to synagogue mapping)
        
        // Use the frontend API route which handles the backend connection
        const searchUrl = `/api/synagogues?limit=1000`
        
        const searchResponse = await fetch(searchUrl)
        
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text()
          console.error('Search response error:', errorText)
          throw new Error(`Failed to fetch synagogues: ${searchResponse.status} - ${errorText}`)
        }
        
        const searchData = await searchResponse.json()
        const synagogues = searchData.synagogues || []
        
        // Try to find the synagogue by name (case-insensitive, handle apostrophes and hyphens)
        const normalizedShulName = shulName.toLowerCase().replace(/['-]/g, '')
        
        const foundSynagogue = synagogues.find((synagogue: any) => {
          if (!synagogue.name) return false
          
          const synagogueName = synagogue.name.toLowerCase()
          
          // Convert URL slug back to potential synagogue name format
          // e.g., "beth-israel" -> "beth israel"
          const shulNameWithSpaces = shulName.toLowerCase().replace(/-/g, ' ')
          
          // Also try with apostrophes restored - handle multiple patterns
          const shulNameWithApostrophes = shulNameWithSpaces
            .replace(/beth/, "beth")
            .replace(/temple/, "temple")
          
          // Normalize both names for comparison (remove apostrophes and hyphens)
          const normalizedSynagogueName = synagogueName.replace(/['-]/g, '')
          
          // Check multiple variations
          return synagogueName === shulNameWithSpaces ||
                 synagogueName === shulNameWithApostrophes ||
                 synagogueName === normalizedShulName ||
                 normalizedSynagogueName === normalizedShulName ||
                 synagogueName.includes(shulNameWithSpaces) ||
                 synagogueName.includes(shulNameWithApostrophes) ||
                 shulNameWithSpaces.includes(synagogueName) ||
                 shulNameWithApostrophes.includes(synagogueName) ||
                 normalizedSynagogueName.includes(normalizedShulName) ||
                 normalizedShulName.includes(normalizedSynagogueName)
        })

        if (!foundSynagogue) {
          // Instead of throwing an error, set a specific "not found" state
          setError('synagogue_not_found')
          setLoading(false)
          return
        }

        // Now use the backend's ID-based search utility
        
        // Use the frontend API route for details
        const detailUrl = `/api/synagogues/${foundSynagogue.id}`
        
        const detailResponse = await fetch(detailUrl)
        
        if (!detailResponse.ok) {
          const errorText = await detailResponse.text()
          console.error('Detail response error:', errorText)
          throw new Error(`Failed to fetch synagogue details: ${detailResponse.status} - ${errorText}`)
        }
        
        const detailData = await detailResponse.json()
        
        // Convert synagogue data to ShulDB format
        const shulData: ShulDB = {
          id: detailData.id?.toString() || foundSynagogue.id?.toString(),
          name: detailData.name || foundSynagogue.name,
          description: detailData.description || foundSynagogue.description || '',
          short_description: detailData.short_description || foundSynagogue.short_description || '',
          address: (() => {
            // Construct full address from components
            const addressParts = [
              detailData.address || foundSynagogue.address,
              detailData.city || foundSynagogue.city,
              detailData.state || foundSynagogue.state,
              detailData.zip_code || foundSynagogue.zip_code
            ].filter(Boolean)
            return addressParts.join(', ')
          })(),
          city: detailData.city || foundSynagogue.city || '',
          state: detailData.state || foundSynagogue.state || '',
          zip_code: detailData.zip_code || foundSynagogue.zip_code || '',
          phone_number: detailData.phone_number || foundSynagogue.phone_number || '',
          listing_type: detailData.listing_type || foundSynagogue.listing_type || 'synagogue',
          rating: detailData.rating || foundSynagogue.rating || 0,
          denomination: detailData.denomination || foundSynagogue.denomination || 'Jewish',
          shul_type: detailData.shul_type || foundSynagogue.shul_type || '',
          religious_authority: detailData.religious_authority || foundSynagogue.religious_authority || '',
          images: (() => {
            // Ensure we have at least one image for the gallery
            const allImages = [
              ...(detailData.images || []),
              ...(foundSynagogue.additional_images || []),
              foundSynagogue.image_url
            ].filter(Boolean)
            return allImages.length > 0 ? allImages : ['/images/default-synagogue.webp']
          })(),
          hours: (() => {
            console.log('Processing shul hours data...')
            console.log('detailData.hours_parsed:', detailData.hours_parsed)
            console.log('foundSynagogue.hours_json:', foundSynagogue.hours_json)
            
            if (detailData.hours_parsed) {
              console.log('Using hours_parsed from detailData')
              // hours_parsed is already a parsed object, not a JSON string
              return parseHoursFromJson(detailData.hours_parsed)
            } else if (foundSynagogue.hours_json) {
              console.log('Using hours_json from foundSynagogue')
              return parseHoursFromJson(foundSynagogue.hours_json)
            } else {
              console.log('No hours data available')
              return parseHoursFromJson('{"weekday_text": []}')
            }
          })(),
          contact: {
            phone: detailData.phone_number || foundSynagogue.phone_number || '',
            email: detailData.email || foundSynagogue.email || '',
            website: detailData.website || foundSynagogue.website || '',
          },
          location: {
            latitude: detailData.latitude || foundSynagogue.latitude || 0,
            longitude: detailData.longitude || foundSynagogue.longitude || 0,
          },
          stats: {
            view_count: 1234, // TODO: Get from backend
            share_count: 0, // TODO: Get from backend
          },
          admin_settings: {
            show_contact_button: detailData.admin_settings?.show_contact_button ?? true, // Default to true if not provided
            contact_url: detailData.admin_settings?.contact_url || '',
          },
          // Shul-specific fields
          has_daily_minyan: detailData.has_daily_minyan || foundSynagogue.has_daily_minyan || false,
          has_shabbat_services: detailData.has_shabbat_services || foundSynagogue.has_shabbat_services || false,
          has_holiday_services: detailData.has_holiday_services || foundSynagogue.has_holiday_services || false,
          has_mechitza: detailData.has_mechitza || foundSynagogue.has_mechitza || false,
          has_parking: detailData.has_parking || foundSynagogue.has_parking || false,
          has_disabled_access: detailData.has_disabled_access || foundSynagogue.has_disabled_access || false,
          rabbi_name: detailData.rabbi_name || foundSynagogue.rabbi_name || '',
          services: detailData.services || foundSynagogue.services || [],
          features: detailData.features || foundSynagogue.features || []
        }

        setShul(shulData)
        setLoading(false)
        
        // Fetch reviews for this synagogue
        if (shulData.id) {
          fetchReviews(shulData.id, 0, 10) // Start with first 10 reviews
        }
      } catch (err) {
        console.error('Error fetching shul data:', err)
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
        
        // More detailed error message
        let errorMessage = 'Failed to load synagogue data'
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

    if (shulName) {
      fetchShulData()
    }
  }, [shulName])

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
          lat: position.coords.latitude,
          lng: position.coords.longitude
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
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
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
        } catch (locationError) {
          // Silently handle permission setup errors
          console.error('Error setting up location permissions:', locationError);
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

  // Map shul data to listing format
  const _listingData = shul ? mapShulToListingData(shul, userLocation, reviews, handleLocationRequest, locationPermission) : undefined // TODO: Use listing data

  // Render loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p className="text-gray-600">Loading synagogue details for: {shulName}</p>
          </div>
        </div>
      </main>
    )
  }

  // Render error state
  if (error) {
    // Special handling for synagogue not found
    if (error === 'synagogue_not_found') {
      return (
        <main className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4 text-gray-800">Synagogue Not Found</h1>
              <p className="text-lg text-gray-600 mb-6">
                We couldn&apos;t find a synagogue named &quot;{shulName}&quot;
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-3 text-blue-800">Suggestions</h2>
                <ul className="text-left text-blue-700 space-y-2">
                  <li>• Check the spelling of the synagogue name</li>
                  <li>• Try searching for the synagogue on our main page</li>
                  <li>• The synagogue may have been removed or renamed</li>
                  <li>• Contact us if you believe this is an error</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Link 
                  href="/shuls" 
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All Synagogues
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
            <p className="text-gray-600">Synagogue: {shulName}</p>
            <div className="mt-4">
              <Link 
                href="/shuls" 
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

  // Render shul details
  if (shul) {
    try {
      const finalListingData = mapShulToListingData(shul, userLocation, reviews, handleLocationRequest, locationPermission)
      
      // Add pagination and load more props
      const listingDataWithPagination = {
        ...finalListingData,
        reviewsPagination,
        onLoadMoreReviews: handleLoadMoreReviews,
        reviewsLoading
      }
      
      return <ListingPage data={listingDataWithPagination} />
    } catch (err) {
      console.error('Error mapping shul data:', err)
      return (
        <main className="min-h-screen bg-gray-50 p-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
              <p className="text-gray-600 mb-4">Failed to display synagogue details</p>
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
          <p className="text-gray-600">No synagogue data available for: {shulName}</p>
        </div>
      </div>
    </main>
  )
}
