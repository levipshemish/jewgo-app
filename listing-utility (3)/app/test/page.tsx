"use client"

import { useState } from "react"
import { ListingPage } from "@/components/listing/listing-page"
import { useEateryDetails } from "@/hooks/use-eatery-details"
import { useUserLocation } from "@/hooks/use-user-location"
import { mapEateryToListingData } from "@/utils/eatery-mapping"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TestPage() {
  const [selectedEateryId, setSelectedEateryId] = useState("eatery-123")
  const { data: eatery, loading, error, refetch } = useEateryDetails(selectedEateryId)
  const { location: userLocation, loading: locationLoading, error: locationError, requestPermission } = useUserLocation()

  const listingData = eatery ? mapEateryToListingData(eatery, userLocation) : undefined

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Test</CardTitle>
            <CardDescription>
              Test the listing utility with real API data and location services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Eatery Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Eatery:</label>
              <div className="flex gap-2">
                <Button 
                  variant={selectedEateryId === "eatery-123" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedEateryId("eatery-123")}
                >
                  Kosher Delight (with order button)
                </Button>
                <Button 
                  variant={selectedEateryId === "eatery-456" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedEateryId("eatery-456")}
                >
                  Shalom Pizza (no order button)
                </Button>
              </div>
            </div>

            {/* Location Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location Status:</label>
              <div className="flex items-center gap-2">
                {locationLoading ? (
                  <Badge variant="secondary">Loading location...</Badge>
                ) : locationError ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Location error: {locationError}</Badge>
                    <Button size="sm" onClick={requestPermission}>
                      Request Permission
                    </Button>
                  </div>
                ) : userLocation ? (
                  <Badge variant="default">
                    Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </Badge>
                ) : (
                  <Badge variant="secondary">No location</Badge>
                )}
              </div>
            </div>

            {/* API Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">API Status:</label>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Badge variant="secondary">Loading eatery data...</Badge>
                ) : error ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">API error: {error}</Badge>
                    <Button size="sm" onClick={refetch}>
                      Retry
                    </Button>
                  </div>
                ) : eatery ? (
                  <Badge variant="default">Loaded: {eatery.name}</Badge>
                ) : (
                  <Badge variant="secondary">No data</Badge>
                )}
              </div>
            </div>

            {/* Data Preview */}
            {eatery && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Preview:</label>
                <div className="text-xs bg-gray-100 p-2 rounded">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify({
                      name: eatery.name,
                      rating: eatery.rating,
                      price_range: eatery.price_range,
                      kosher_type: eatery.kosher_type,
                      kosher_agency: eatery.kosher_agency,
                      has_order_button: eatery.admin_settings.show_order_button,
                      contact: {
                        has_website: !!eatery.contact.website,
                        has_phone: !!eatery.contact.phone,
                        has_email: !!eatery.contact.email,
                      },
                      user_location: userLocation ? "Available" : "Not available"
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listing Display */}
        <div className="flex justify-center">
          <ListingPage 
            data={listingData} 
            loading={loading} 
            error={error}
          />
        </div>
      </div>
    </div>
  )
}
