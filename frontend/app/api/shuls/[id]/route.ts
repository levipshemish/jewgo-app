import { NextRequest, NextResponse } from 'next/server';
import { transformShulToListing, type RealShul } from '@/lib/types/shul';

// This would typically come from your location context or user preferences
const getUserLocation = (): { latitude: number; longitude: number } | null => {
  // For now, return null - in a real app you'd get this from user location
  // or from request headers/cookies
  return null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shulId = parseInt(params.id);
    
    if (isNaN(shulId)) {
      return NextResponse.json(
        { error: 'Invalid shul ID' },
        { status: 400 }
      );
    }

    // Fetch shul data from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/v5/geocoding/get-shul/${shulId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Synagogue not found`, message: `We couldn't find a synagogue with ID "${shulId}"` },
          { status: 404 }
        );
      }
      
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch synagogue data' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'Invalid response from backend' },
        { status: 500 }
      );
    }

    const shulData = result.data as RealShul;
    const userLocation = getUserLocation();
    
    // Transform to ShulListing format
    const listing = transformShulToListing(shulData, userLocation, {
      viewCount: Math.floor(Math.random() * 500) + 50, // Mock view count
      shareCount: Math.floor(Math.random() * 50) + 5,   // Mock share count
      isLiked: false, // This would come from user favorites
      // reviews: [] // Could add reviews here
    });

    return NextResponse.json({
      success: true,
      data: listing
    });

  } catch (error) {
    console.error('Error fetching shul:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
