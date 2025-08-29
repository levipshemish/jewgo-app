import { type NextRequest, NextResponse } from "next/server"
import type { EateryDB } from "@/types/listing"
import { createMockEateryData, createMockEateryDataNoEmail } from "@/utils/eatery-mapping"

// Mock database - replace with your actual database
const mockEateries: Record<string, EateryDB> = {
  "eatery-123": createMockEateryData(),
  "eatery-456": createMockEateryDataNoEmail(),
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
