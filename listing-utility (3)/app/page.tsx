"use client"

import { useState } from "react"
import { ListingPage } from "@/components/listing/listing-page"
import { useListing } from "@/hooks/use-listing"
import { createMockEateryData } from "@/utils/eatery-mapping"
import { mapEateryToListingData } from "@/utils/eatery-mapping"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [demoMode, setDemoMode] = useState<'original' | 'eatery'>('original')

  // Original demo data
  const { listingData } = useListing({
    title: "tag, tag",
    image: {
      alt: "Product image",
      actionLabel: "action",
      onAction: () => console.log("Image action clicked"),
    },
    content: {
      leftText: "text box",
      rightText: "text box",
      leftAction: "text box",
      rightAction: "action",
      onRightAction: () => console.log("Right action clicked"),
    },
    actions: {
      primaryAction: {
        label: "action",
        onClick: () => console.log("Primary action clicked"),
      },
      secondaryActions: [
        { label: "action", onClick: () => console.log("Secondary 1 clicked") },
        { label: "action", onClick: () => console.log("Secondary 2 clicked") },
        { label: "action", onClick: () => console.log("Secondary 3 clicked") },
      ],
      tags: ["tag", "tag", "tag"],
      onTagClick: (tag) => console.log("Tag clicked:", tag),
      bottomAction: {
        label: "action pop-up",
        hoursInfo: {
          title: "Business Hours",
          hours: [
            { day: "Monday", time: "9:00 AM - 6:00 PM" },
            { day: "Tuesday", time: "9:00 AM - 6:00 PM" },
            { day: "Wednesday", time: "9:00 AM - 6:00 PM" },
            { day: "Thursday", time: "9:00 AM - 8:00 PM" },
            { day: "Friday", time: "9:00 AM - 8:00 PM" },
            { day: "Saturday", time: "10:00 AM - 5:00 PM" },
            { day: "Sunday", time: "Closed" },
          ],
        },
        onClick: () => console.log("Bottom action clicked"),
      },
    },
    header: {
      onBack: () => console.log("Back clicked"),
      isFavorited: false,
    },
  })

  // Eatery demo data
  const mockEatery = createMockEateryData()
  const eateryListingData = mapEateryToListingData(mockEatery, null)

  const currentData = demoMode === 'eatery' ? eateryListingData : listingData

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* Demo Controls */}
      <div className="max-w-4xl mx-auto mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Listing Utility Demo</CardTitle>
            <CardDescription>
              Choose between the original demo and the new eatery details implementation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                variant={demoMode === 'original' ? 'default' : 'outline'}
                onClick={() => setDemoMode('original')}
              >
                Original Demo
              </Button>
              <Button 
                variant={demoMode === 'eatery' ? 'default' : 'outline'}
                onClick={() => setDemoMode('eatery')}
              >
                Eatery Details Demo
              </Button>
            </div>
            
            {demoMode === 'eatery' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  This demonstrates the enhanced listing utility with:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Kosher information in header</li>
                  <li>View and share counts</li>
                  <li>Distance calculation (when location is available)</li>
                  <li>Conditional order button</li>
                  <li>Contact actions (website, call, email)</li>
                  <li>Hours popup with formatted schedule</li>
                  <li>Address and description sections</li>
                </ul>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/eatery/eatery-123', '_blank')}
                  >
                    View Full Eatery Details Page
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listing Demo */}
      <div className="flex items-center justify-center">
        <ListingPage data={currentData} />
      </div>
    </main>
  )
}
