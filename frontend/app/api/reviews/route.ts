import { NextRequest, NextResponse } from 'next/server';

export interface Review {
  id: string;
  restaurant_id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  updated_at?: string;
  helpful_count: number;
  report_count: number;
  verified_purchase: boolean;
  moderator_notes?: string;
}

// Mock reviews data for development (unused but kept for reference)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const _mockReviews: Review[] = [
//   {
//     id: '1',
//     restaurant_id: 1,
//     user_id: 'user1',
//     user_name: 'John Doe',
//     rating: 5,
//     title: 'Great kosher food!',
//     content: 'Amazing experience, highly recommend.',
//     status: 'approved',
//     helpful_count: 3,
//     created_at: new Date().toISOString(),
//     updated_at: new Date().toISOString(),
//   },
//   {
//     id: '2',
//     restaurant_id: 1,
//     user_id: 'user2',
//     user_name: 'Jane Smith',
//     rating: 4,
//     title: 'Good food, friendly staff',
//     content: 'Nice atmosphere and good service.',
//     status: 'approved',
//     helpful_count: 1,
//     created_at: new Date().toISOString(),
//     updated_at: new Date().toISOString(),
//   },
// ];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
    
    // Forward the request to the backend with all query parameters
    const queryParams = new URLSearchParams(searchParams);
    const apiUrl = `${backendUrl}/api/v4/reviews?${queryParams.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // For server errors (500+), fall back to mock data
      if (response.status >= 500) {
        // return getMockReviewsResponse(searchParams);
      }
      
      // For other errors (404, 400, etc.), return empty response
      return NextResponse.json({
        reviews: [],
        pagination: {
          total: 0,
          limit: parseInt(searchParams.get('limit') || '10'),
          offset: parseInt(searchParams.get('offset') || '0'),
          hasMore: false
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch {
    // Only use mock data for actual connectivity issues, not for normal "no reviews" responses
    // For most errors, return empty response and let frontend handle gracefully
    return NextResponse.json({
      reviews: [],
      pagination: {
        total: 0,
        limit: parseInt(new URL(request.url).searchParams.get('limit') || '10'),
        offset: parseInt(new URL(request.url).searchParams.get('offset') || '0'),
        hasMore: false
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, rating, title, content, images = [], userId, userName, userEmail } = body;

    // Validate required fields
    if (!restaurantId || !rating || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward review creation to backend API to persist in DB
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo-app-oyoh.onrender.com';
    const apiUrl = `${backendUrl}/api/v4/reviews`;

    const forwardPayload = {
      restaurantId,
      rating,
      title,
      content,
      images,
      userId,
      userName,
      userEmail,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: 'Failed to create review', details: errorText || undefined },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });

  } catch {
    // // console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
