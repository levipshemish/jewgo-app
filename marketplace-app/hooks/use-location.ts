"use client"

import { useState, useEffect } from "react"

interface Location {
  city: string
  state: string
  coordinates?: {
    lat: number
    lng: number
  }
}

interface UseLocationReturn {
  currentLocation: Location | null
  isLoading: boolean
  error: string | null
  updateLocation: (location: string) => void
  getCurrentLocation: () => Promise<void>
  calculateDistance: (location1: string, location2: string) => number
}

// Mock coordinates for demo purposes
const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  "Miami Gardens, FL": { lat: 25.942, lng: -80.2456 },
  "Aventura, FL": { lat: 25.9564, lng: -80.1393 },
  "North Miami Beach, FL": { lat: 25.9331, lng: -80.1628 },
  "Hallandale Beach, FL": { lat: 25.9812, lng: -80.1484 },
  "Sunny Isles Beach, FL": { lat: 25.9418, lng: -80.1268 },
  "Hollywood, FL": { lat: 26.0112, lng: -80.1495 },
  "Fort Lauderdale, FL": { lat: 26.1224, lng: -80.1373 },
  "Boca Raton, FL": { lat: 26.3683, lng: -80.1289 },
}

export function useLocation(): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize with default location
    const defaultLocation = "Miami Gardens, FL"
    const savedLocation = localStorage.getItem("user-location") || defaultLocation
    updateLocation(savedLocation)
  }, [])

  const updateLocation = (locationString: string) => {
    const [city, state] = locationString.split(", ")
    const coordinates = locationCoordinates[locationString]

    const location: Location = {
      city,
      state,
      coordinates,
    }

    setCurrentLocation(location)
    localStorage.setItem("user-location", locationString)
  }

  const getCurrentLocation = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser")
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        })
      })

      // In a real app, you would reverse geocode these coordinates
      // For demo purposes, we'll use a mock location
      const mockLocation = "Current Location, FL"
      updateLocation(mockLocation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get location")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDistance = (location1: string, location2: string): number => {
    const coords1 = locationCoordinates[location1]
    const coords2 = locationCoordinates[location2]

    if (!coords1 || !coords2) {
      return 0 // Return 0 if coordinates not found
    }

    // Haversine formula to calculate distance between two points
    const R = 3959 // Earth's radius in miles
    const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180
    const dLng = ((coords2.lng - coords1.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords1.lat * Math.PI) / 180) *
        Math.cos((coords2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return Math.round(distance * 10) / 10 // Round to 1 decimal place
  }

  return {
    currentLocation,
    isLoading,
    error,
    updateLocation,
    getCurrentLocation,
    calculateDistance,
  }
}
