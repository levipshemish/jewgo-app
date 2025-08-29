"use client"

import { useMemo } from "react"
import { ListingPage } from "@/components/listing/listing-page"
import { useEateryDetails } from "@/hooks/use-eatery-details"
import { useUserLocation } from "@/hooks/use-user-location"
import { mapEateryToListingData } from "@/utils/eatery-mapping"

interface EateryDetailsPageProps {
  params: {
    id: string
  }
}

export default function EateryDetailsPage({ params }: EateryDetailsPageProps) {
  const { data: eatery, loading, error } = useEateryDetails(params.id)
  const { location: userLocation } = useUserLocation()

  const listingData = useMemo(() => {
    if (!eatery) return undefined
    return mapEateryToListingData(eatery, userLocation)
  }, [eatery, userLocation])

  return (
    <div className="min-h-screen bg-gray-50">
      <ListingPage 
        data={listingData} 
        loading={loading} 
        error={error}
      />
    </div>
  )
}
