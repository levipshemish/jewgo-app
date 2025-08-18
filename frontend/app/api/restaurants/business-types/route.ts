import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo.onrender.com';
    
    // Fetch business types from backend
    const response = await fetch(`${backendUrl}/api/restaurants/business-types`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data.business_types || []
    });

  } catch (_error) {
    console.error('Error fetching business types:', _error);
    
    // Return fallback data
    return NextResponse.json({
      success: true,
      data: [
        'restaurant',
        'bakery', 
        'cafe',
        'pizzeria',
        'sushi',
        'steakhouse',
        'deli',
        'ice_cream',
        'bbq',
        'mediterranean',
        'asian',
        'italian',
        'mexican',
        'american'
      ]
    });
  }
}
