"use client"

import { MapPin, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { LocationPicker } from "@/components/location-picker"

export function LocationDisplay() {
  const [currentLocation, setCurrentLocation] = useState("Miami Gardens, FL")
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-purple-600 hover:bg-purple-50 p-0"
        onClick={() => setShowLocationPicker(true)}
      >
        <MapPin className="w-4 h-4" />
        <span className="font-medium">{currentLocation}</span>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {showLocationPicker && (
        <LocationPicker
          currentLocation={currentLocation}
          onLocationChange={setCurrentLocation}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  )
}
