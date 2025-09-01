import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json({ message: 'Invalid restaurant ID' }, { status: 400 });
    }

    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo-app-oyoh.onrender.com';
    const response = await fetch(`${backendUrl}/api/v4/restaurants/${restaurantId}/hours`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Avoid caching stale hours
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // For server errors, return hours not available
      if (response.status >= 500) {
        return NextResponse.json({
          hours: null,
          message: 'Hours information temporarily unavailable',
          available: false
        }, { status: 200 });
      }
      
      // For 404, hours don't exist in database
      if (response.status === 404) {
        return NextResponse.json({
          hours: null,
          message: 'Hours not available for this restaurant',
          available: false
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch hours' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // For network errors, return hours not available
    return NextResponse.json({
      hours: null,
      message: error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network')
      ) ? 'Hours service temporarily unavailable' : 'Hours information not available',
      available: false
    }, { status: 200 });
  }
}
