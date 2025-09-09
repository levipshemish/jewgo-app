import { NextRequest, NextResponse } from 'next/server'

// Ensure Node.js runtime for server-side operations
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params

    if (!restaurantId || isNaN(Number(restaurantId))) {
      return NextResponse.json(
        { success: false, error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'
    const response = await fetch(`${backendUrl}/api/v4/restaurants/${restaurantId}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || 'Failed to track view' 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in view tracking API route:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
