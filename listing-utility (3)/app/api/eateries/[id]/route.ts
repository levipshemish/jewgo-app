import { type NextRequest, NextResponse } from "next/server"
import type { EateryDB } from "@/types/listing"
import { createMockEateryData } from "@/utils/eatery-mapping"

// Mock database - replace with your actual database
const mockEateries: Record<string, EateryDB> = {
  "eatery-123": createMockEateryData(),
  "eatery-456": {
    id: "eatery-456",
    name: "Shalom Pizza & Grill",
    description: "Authentic kosher pizza and grill serving the community for over 20 years.",
    short_description: "Kosher pizza and grill",
    address: "456 Broadway, Brooklyn, NY 11211",
    rating: 4.2,
    price_range: "$",
    kosher_type: "Kosher",
    kosher_agency: "Kof-K",
    images: [
      "/modern-product-showcase-with-clean-background.png",
      "/placeholder.svg?height=400&width=400",
    ],
    hours: {
      monday: { open: "11:00 AM", close: "11:00 PM" },
      tuesday: { open: "11:00 AM", close: "11:00 PM" },
      wednesday: { open: "11:00 AM", close: "11:00 PM" },
      thursday: { open: "11:00 AM", close: "11:00 PM" },
      friday: { open: "11:00 AM", close: "2:00 PM" },
      saturday: { closed: true },
      sunday: { open: "12:00 PM", close: "10:00 PM" },
    },
    contact: {
      phone: "+1-555-987-6543",
      email: "info@shalompizza.com",
      website: "https://shalompizza.com",
    },
    location: {
      latitude: 40.7182,
      longitude: -73.9584,
    },
    admin_settings: {
      show_order_button: false,
      order_url: "",
    },
    stats: {
      view_count: 890,
      share_count: 45,
    },
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = params
    const eatery = mockEateries[id]

    if (!eatery) {
      return NextResponse.json(
        {
          success: false,
          error: "Eatery not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: eatery,
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
