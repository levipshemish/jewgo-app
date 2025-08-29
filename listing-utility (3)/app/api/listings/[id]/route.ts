import { type NextRequest, NextResponse } from "next/server"
import type { BackendListingData, ListingApiResponse } from "@/types/listing"

// Mock database - replace with your actual database
const mockListings: Record<string, BackendListingData> = {
  "example-listing-id": {
    id: "example-listing-id",
    title: "Premium Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 299,
    currency: "USD",
    category: "Electronics",
    status: "active",
    imageUrl: "/modern-product-showcase-with-clean-background.png",
    imageAlt: "Premium wireless headphones",
    imageActionLabel: "View Gallery",
    leftText: "Brand New",
    rightText: "$299",
    leftActionLabel: "Details",
    rightActionLabel: "Buy Now",
    primaryActionLabel: "Add to Cart",
    secondaryActionLabels: ["Save for Later", "Compare", "Share"],
    bottomActionLabel: "Contact Seller",
    tags: ["Electronics", "Audio", "Premium"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorited: false,
    viewCount: 127,
    shareCount: 23,
    location: "New York, NY",
    seller: {
      id: "seller-123",
      name: "TechStore Pro",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4.8,
    },
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ListingApiResponse>> {
  try {
    const { id } = params
    const listing = mockListings[id]

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error: "Listing not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: listing,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ListingApiResponse>> {
  try {
    const { id } = params
    const updates = await request.json()

    if (!mockListings[id]) {
      return NextResponse.json(
        {
          success: false,
          error: "Listing not found",
        },
        { status: 404 },
      )
    }

    // Update the listing
    mockListings[id] = {
      ...mockListings[id],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: mockListings[id],
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
