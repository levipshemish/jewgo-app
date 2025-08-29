import { useState, useEffect } from 'react'
import { UserLocation } from '@/types/listing'

interface UseUserLocationReturn {
  location: UserLocation | null
  loading: boolean
  error: string | null
  requestPermission: () => void
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoading(false)
      },
      (err) => {
        let errorMessage = 'Failed to get location'
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case err.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
          default:
            errorMessage = 'An unknown error occurred'
        }
        
        setError(errorMessage)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const requestPermission = () => {
    // Check if we already have location
    if (location) return

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    // Request location
    getLocation()
  }

  // Try to get location on mount if permission is already granted
  useEffect(() => {
    // Check if we have a stored location
    const storedLocation = localStorage.getItem('userLocation')
    if (storedLocation) {
      try {
        const parsed = JSON.parse(storedLocation)
        setLocation(parsed)
        return
      } catch {
        // Invalid stored location, remove it
        localStorage.removeItem('userLocation')
      }
    }

    // Try to get current location
    getLocation()
  }, [])

  // Store location in localStorage when it changes
  useEffect(() => {
    if (location) {
      localStorage.setItem('userLocation', JSON.stringify(location))
    }
  }, [location])

  return {
    location,
    loading,
    error,
    requestPermission
  }
}
