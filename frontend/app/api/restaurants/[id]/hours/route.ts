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
      // For server errors, return default hours
      if (response.status >= 500) {
        return NextResponse.json({
          hours: {
            monday: { open: '9:00 AM', close: '10:00 PM', closed: false },
            tuesday: { open: '9:00 AM', close: '10:00 PM', closed: false },
            wednesday: { open: '9:00 AM', close: '10:00 PM', closed: false },
            thursday: { open: '9:00 AM', close: '10:00 PM', closed: false },
            friday: { open: '9:00 AM', close: '3:00 PM', closed: false },
            saturday: { closed: true },
            sunday: { open: '9:00 AM', close: '10:00 PM', closed: false }
          },
          message: 'Using default hours - service temporarily unavailable'
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch hours' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // For network errors, return default hours to ensure UI works
    return NextResponse.json({
      hours: {
        monday: { open: '9:00 AM', close: '10:00 PM', closed: false },
        tuesday: { open: '9:00 AM', close: '10:00 PM', closed: false },
        wednesday: { open: '9:00 AM', close: '10:00 PM', closed: false },
        thursday: { open: '9:00 AM', close: '10:00 PM', closed: false },
        friday: { open: '9:00 AM', close: '3:00 PM', closed: false },
        saturday: { closed: true },
        sunday: { open: '9:00 AM', close: '10:00 PM', closed: false }
      },
      message: error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network')
      ) ? 'Hours service temporarily unavailable' : 'Using default hours'
    }, { status: 200 });
  }
}
