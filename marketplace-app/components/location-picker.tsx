"use client"

import { useState, useEffect } from "react"
import { MapPin, Search, Target, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LocationPickerProps {
  currentLocation: string
  onLocationChange: (location: string) => void
  onClose: () => void
}

const popularLocations = [
  "Miami Gardens, FL",
  "Aventura, FL",
  "North Miami Beach, FL",
  "Hallandale Beach, FL",
  "Sunny Isles Beach, FL",
  "Hollywood, FL",
  "Fort Lauderdale, FL",
  "Boca Raton, FL",
]

const recentLocations = ["Miami Gardens, FL", "Aventura, FL", "North Miami Beach, FL"]

export function LocationPicker({ currentLocation, onLocationChange, onClose }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState(popularLocations)

  useEffect(() => {
    if (searchQuery) {
      const filtered = popularLocations.filter((location) => location.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredLocations(filtered)
    } else {
      setFilteredLocations(popularLocations)
    }
  }, [searchQuery])

  const handleLocationSelect = (location: string) => {
    onLocationChange(location)
    onClose()
  }

  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you'd reverse geocode these coordinates
          // For demo purposes, we'll just use a mock location
          const mockLocation = "Current Location, FL"
          onLocationChange(mockLocation)
          setIsGettingLocation(false)
          onClose()
        },
        (error) => {
          console.error("Error getting location:", error)
          setIsGettingLocation(false)
        },
      )
    } else {
      setIsGettingLocation(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Choose Location</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search for a city or zip code"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Current Location Button */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 bg-transparent"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            <Target className="w-4 h-4 text-purple-600" />
            <span>{isGettingLocation ? "Getting location..." : "Use current location"}</span>
          </Button>

          {/* Recent Locations */}
          {!searchQuery && recentLocations.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Recent</h3>
              <div className="space-y-1">
                {recentLocations.map((location) => (
                  <Button
                    key={location}
                    variant="ghost"
                    className="w-full justify-start gap-3 bg-transparent hover:bg-gray-50"
                    onClick={() => handleLocationSelect(location)}
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{location}</span>
                    {location === currentLocation && <Badge variant="secondary">Current</Badge>}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Popular/Filtered Locations */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">{searchQuery ? "Search Results" : "Popular Locations"}</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredLocations.map((location) => (
                <Button
                  key={location}
                  variant="ghost"
                  className="w-full justify-start gap-3 bg-transparent hover:bg-gray-50"
                  onClick={() => handleLocationSelect(location)}
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{location}</span>
                  {location === currentLocation && <Badge variant="secondary">Current</Badge>}
                </Button>
              ))}
              {filteredLocations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>No locations found</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
