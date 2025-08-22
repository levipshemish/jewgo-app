import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json({ message: 'Invalid restaurant ID' }, { status: 400 });
    }

    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const response = await fetch(`${backendUrl}/api/restaurants/${restaurantId}/hours`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Avoid caching stale hours
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch hours' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { message: _error instanceof Error ? _error.message : 'Failed to fetch hours' },
      { status: 500 }
    );
  }
}
