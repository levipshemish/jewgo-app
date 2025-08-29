"use client"

import { useState } from "react"
import { ListingPage } from "@/components/listing/listing-page"
import { useEateryDetails } from "@/hooks/use-eatery-details"
import { useUserLocation } from "@/hooks/use-user-location"
import { mapEateryToListingData } from "@/utils/eatery-mapping"

export default function TestPage() {
  const [selectedEateryId, setSelectedEateryId] = useState("eatery-123")
  const { data: eatery, loading, error } = useEateryDetails(selectedEateryId)
  const { location: userLocation } = useUserLocation()

  const listingData = eatery ? mapEateryToListingData(eatery, userLocation) : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Production-like full-screen view */}
      <div className="w-full max-w-sm sm:max-w-none sm:px-8 md:px-12 lg:px-16 xl:px-20 mx-auto">
        <ListingPage 
          data={listingData} 
          loading={loading} 
          error={error}
        />
      </div>
    </div>
  )
}
