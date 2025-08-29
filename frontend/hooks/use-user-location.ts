import { useState, useEffect } from 'react'

export interface UserLocation {
  lat: number
  lng: number
}

interface UseUserLocationReturn {
  location: UserLocation | null
  loading: boolean
  error: string | null
  requestLocation: () => void
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoading(false)
      },
      (error) => {
        setError(`Unable to retrieve your location: ${error.message}`)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  // For testing, provide a default location
  useEffect(() => {
    // Set a default location for testing (New York City)
    setLocation({
      lat: 40.7128,
      lng: -74.0060
    })
  }, [])

  return {
    location,
    loading,
    error,
    requestLocation
  }
}
