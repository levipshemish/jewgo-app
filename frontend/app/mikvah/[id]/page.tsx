"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ListingPage } from '@/components/listing-details-utility/listing-page'
import { mapMikvahToListingData } from '@/utils/mikvah-mapping'
import { MikvahDB, UserLocation } from '@/types/listing'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

/**
 * Parse hours from the backend JSON format into MikvahDB format
 */
function parseHoursFromJson(hoursData: string | object): MikvahDB['hours'] {
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
    
    const hours: MikvahDB['hours'] = {
      monday: { open: '', close: '', closed: true },
      tuesday: { open: '', close: '', closed: true },
      wednesday: { open: '', close: '', closed: true },
      thursday: { open: '', close: '', closed: true },
      friday: { open: '', close: '', closed: true },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true },
    }

    const dayMap: { [key: string]: keyof MikvahDB['hours'] } = {
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

    console.log('Parsed mikvah hours:', hours)
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

export default function MikvahIdPage() {
  return (
    <ErrorBoundary>
      <MikvahIdPageContent />
    </ErrorBoundary>
  );
}

function MikvahIdPageContent() {
  const params = useParams()
  const [mikvah, setMikvah] = useState<MikvahDB | null>(null)
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
    if (mikvah && reviewsPagination?.hasMore && !reviewsLoading) {
      const nextOffset = reviewsPagination.offset + reviewsPagination.limit
      fetchReviews(mikvah.id, nextOffset, reviewsPagination.limit)
    }
  }

  const mikvahId = params.id as string

  // Fetch reviews for a mikvah
  const fetchReviews = async (mikvahId: string, offset: number = 0, limit: number = 10) => {
    try {
      setReviewsLoading(true)
      
      // Use the frontend API route for reviews
      const response = await fetch(`/api/reviews?mikvahId=${mikvahId}&status=approved&limit=${limit}&offset=${offset}&includeGoogleReviews=true`)
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

  // Fetch mikvah data by ID
  useEffect(() => {
    const fetchMikvahData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Validate ID
        const mikvahIdNum = parseInt(mikvahId)
        if (isNaN(mikvahIdNum)) {
          setError('Invalid mikvah ID')
          setLoading(false)
          return
        }

        // Use the frontend API route for details
        const detailUrl = `/api/mikvah/${mikvahIdNum}`
        
        const detailResponse = await fetch(detailUrl)
        
        if (!detailResponse.ok) {
          if (detailResponse.status === 404) {
            setError('mikvah_not_found')
          } else {
            const errorText = await detailResponse.text()
            console.error('Detail response error:', errorText)
            throw new Error(`Failed to fetch mikvah details: ${detailResponse.status} - ${errorText}`)
          }
          setLoading(false)
          return
        }
        
        const detailData = await detailResponse.json()
        
        // Extract mikvah data from the response
        let mikvahData = null
        if (detailData.success && detailData.data) {
          // Handle nested data structure
          mikvahData = detailData.data.mikvah || detailData.data
        } else if (detailData.id) {
          // Direct mikvah object
          mikvahData = detailData
        }

        if (!mikvahData) {
          setError('mikvah_not_found')
          setLoading(false)
          return
        }

        // Convert mikvah data to MikvahDB format
        const mikvahDataFormatted: MikvahDB = {
          id: mikvahData.id?.toString(),
          name: mikvahData.name,
          description: mikvahData.description || '',
          short_description: mikvahData.short_description || '',
          address: (() => {
            // Construct full address from components
            const addressParts = [
              mikvahData.address,
              mikvahData.city,
              mikvahData.state,
              mikvahData.zip_code
            ].filter(Boolean)
            return addressParts.join(', ')
          })(),
          city: mikvahData.city || '',
          state: mikvahData.state || '',
          zip_code: mikvahData.zip_code || '',
          phone_number: mikvahData.phone_number || '',
          mikvah_type: mikvahData.mikvah_type || 'women\'s',
          listing_type: mikvahData.listing_type || 'mikvah',
          rating: mikvahData.google_rating || mikvahData.rating || 0,
          price_range: mikvahData.price_range || '',
          kosher_type: mikvahData.kosher_category || '',
          kosher_agency: mikvahData.certifying_agency || '',
          kosher_certification: mikvahData.kosher_certification || '',
          images: (() => {
            // Ensure we have at least one image for the gallery
            const allImages = [
              ...(mikvahData.images || []),
              mikvahData.image_url
            ].filter(Boolean)
            return allImages.length > 0 ? allImages : ['/modern-product-showcase-with-clean-background.png']
          })(),
          hours: (() => {
            console.log('Processing mikvah hours data...')
            console.log('mikvahData.hours_parsed:', mikvahData.hours_parsed)
            console.log('mikvahData.hours_json:', mikvahData.hours_json)
            
            if (mikvahData.hours_parsed) {
              console.log('Using hours_parsed from mikvahData')
              // hours_parsed is already a parsed object, not a JSON string
              return parseHoursFromJson(mikvahData.hours_parsed)
            } else if (mikvahData.hours_json) {
              console.log('Using hours_json from mikvahData')
              return parseHoursFromJson(mikvahData.hours_json)
            } else {
              console.log('No hours data available')
              return parseHoursFromJson('{"weekday_text": []}')
            }
          })(),
          contact: {
            phone: mikvahData.phone_number || '',
            email: mikvahData.business_email || '',
            website: mikvahData.website || '',
          },
          location: {
            latitude: mikvahData.latitude || 0,
            longitude: mikvahData.longitude || 0,
          },
          stats: {
            view_count: 1234, // TODO: Get from backend
            share_count: 0, // TODO: Get from backend
          },
          admin_settings: {
            show_order_button: mikvahData.admin_settings?.show_order_button ?? false, // Default to false for mikvah
            order_url: mikvahData.admin_settings?.order_url || '',
          },
          // Mikvah-specific fields
          mikvah_category: mikvahData.mikvah_category || 'community',
          requires_appointment: mikvahData.requires_appointment || false,
          appointment_phone: mikvahData.appointment_phone || '',
          appointment_website: mikvahData.appointment_website || '',
          walk_in_available: mikvahData.walk_in_available || false,
          advance_booking_days: mikvahData.advance_booking_days || 0,
          has_changing_rooms: mikvahData.has_changing_rooms || false,
          has_shower_facilities: mikvahData.has_shower_facilities || false,
          has_towels_provided: mikvahData.has_towels_provided || false,
          has_soap_provided: mikvahData.has_soap_provided || false,
          has_hair_dryers: mikvahData.has_hair_dryers || false,
          has_private_entrance: mikvahData.has_private_entrance || false,
          has_disabled_access: mikvahData.has_disabled_access || false,
          has_parking: mikvahData.has_parking || false,
          rabbinical_supervision: mikvahData.rabbinical_supervision || '',
          community_affiliation: mikvahData.community_affiliation || '',
          religious_authority: mikvahData.religious_authority || '',
          fee_amount: mikvahData.fee_amount || 0,
          fee_currency: mikvahData.fee_currency || 'USD',
          accepts_credit_cards: mikvahData.accepts_credit_cards || false,
          accepts_cash: mikvahData.accepts_cash || true,
          accepts_checks: mikvahData.accepts_checks || false,
        }

        setMikvah(mikvahDataFormatted)
        setLoading(false)
        
        // Fetch reviews for this mikvah
        if (mikvahDataFormatted.id) {
          fetchReviews(mikvahDataFormatted.id, 0, 10) // Start with first 10 reviews
        }
      } catch (err) {
        console.error('Error fetching mikvah data:', err)
        console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
        
        // More detailed error message
        let errorMessage = 'Failed to load mikvah data'
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

    if (mikvahId) {
      fetchMikvahData()
    }
  }, [mikvahId])

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

  // Render loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p className="text-gray-600">Loading mikvah details for ID: {mikvahId}</p>
          </div>
        </div>
      </main>
    )
  }

  // Render error state
  if (error) {
    // Special handling for mikvah not found
    if (error === 'mikvah_not_found') {
      return (
        <main className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4 text-gray-800">Mikvah Facility Not Found</h1>
              <p className="text-lg text-gray-600 mb-6">
                We couldn&apos;t find a mikvah facility with ID &quot;{mikvahId}&quot;
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-3 text-blue-800">Suggestions</h2>
                <ul className="text-left text-blue-700 space-y-2">
                  <li>• Check if the mikvah ID is correct</li>
                  <li>• Try searching for the mikvah on our main page</li>
                  <li>• The mikvah may have been removed</li>
                  <li>• Contact us if you believe this is an error</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Link 
                  href="/mikvah" 
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All Mikvah Facilities
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
            <p className="text-gray-600">Mikvah ID: {mikvahId}</p>
            <div className="mt-4">
              <Link 
                href="/mikvah" 
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

  // Render mikvah details
  if (mikvah) {
    try {
      const finalListingData = mapMikvahToListingData(mikvah, userLocation, reviews, handleLocationRequest, locationPermission)
      
      // Add pagination and load more props
      const listingDataWithPagination = {
        ...finalListingData,
        reviewsPagination,
        onLoadMoreReviews: handleLoadMoreReviews,
        reviewsLoading
      }
      
      return <ListingPage data={listingDataWithPagination} />
    } catch (err) {
      console.error('Error mapping mikvah data:', err)
      return (
        <main className="min-h-screen bg-gray-50 p-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
              <p className="text-gray-600 mb-4">Failed to display mikvah details</p>
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
          <p className="text-gray-600">No mikvah data available for ID: {mikvahId}</p>
        </div>
      </div>
    </main>
  )
}
