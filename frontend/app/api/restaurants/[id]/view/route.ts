import { NextRequest, NextResponse } from 'next/server'

// Ensure Node.js runtime for server-side operations
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params
    console.log(`🔍 [FRONTEND API] View tracking request for restaurant_id: ${restaurantId}`)

    if (!restaurantId || isNaN(Number(restaurantId))) {
      console.error(`❌ [FRONTEND API] Invalid restaurant ID: ${restaurantId}`)
      return NextResponse.json(
        { success: false, error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app'
    const backendEndpoint = `${backendUrl}/api/restaurants/${restaurantId}/view`
    
    console.log(`📡 [FRONTEND API] Forwarding request to backend: ${backendEndpoint}`)
    
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`📡 [FRONTEND API] Backend response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`❌ [FRONTEND API] Backend error:`, errorData)
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || 'Failed to track view' 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND API] Backend response data:`, data)
    
    if (data.success && data.data) {
      console.log(`📊 [FRONTEND API] View count updated: ${data.data.view_count_before} → ${data.data.view_count} (+${data.data.increment})`)
    }
    
    return NextResponse.json(data)

  } catch (error) {
    console.error('💥 [FRONTEND API] Error in view tracking API route:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
