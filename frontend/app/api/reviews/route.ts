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
const mockReviews: Review[] = [
  {
    id: '1',
    restaurant_id: 1,
    user_id: 'user1@example.com',
    user_name: 'Sarah Cohen',
    user_email: 'user1@example.com',
    rating: 5,
    title: 'Excellent kosher dining experience!',
    content: 'The food was absolutely delicious and the service was outstanding. Everything was fresh and the kosher standards were clearly maintained. Highly recommend the pastrami sandwich and the matzo ball soup.',
    images: [],
    status: 'approved',
    created_at: '2024-01-15T10:30:00Z',
    helpful_count: 8,
    report_count: 0,
    verified_purchase: true
  },
  {
    id: '2',
    restaurant_id: 1,
    user_id: 'user2@example.com',
    user_name: 'David Goldberg',
    user_email: 'user2@example.com',
    rating: 4,
    title: 'Great food, long wait',
    content: 'The quality of food is really good and everything tastes fresh. The portions are generous. Only downside was the 45-minute wait even with a reservation.',
    images: [],
    status: 'approved',
    created_at: '2024-01-12T18:45:00Z',
    helpful_count: 5,
    report_count: 0,
    verified_purchase: true
  },
  {
    id: '3',
    restaurant_id: 1,
    user_id: 'user3@example.com',
    user_name: 'Rachel Miller',
    user_email: 'user3@example.com',
    rating: 5,
    title: 'Perfect for Shabbat dinner',
    content: 'Brought my family here for Shabbat dinner and it was perfect. The atmosphere is warm and welcoming, and the challah was the best I\'ve had outside of home.',
    images: [],
    status: 'approved',
    created_at: '2024-01-10T16:20:00Z',
    helpful_count: 12,
    report_count: 0,
    verified_purchase: true
  },
  {
    id: '4',
    restaurant_id: 2,
    user_id: 'user4@example.com',
    user_name: 'Michael Rosen',
    user_email: 'user4@example.com',
    rating: 3,
    title: 'Decent but pricey',
    content: 'The food is good quality but quite expensive for what you get. Service was friendly though and the location is convenient.',
    images: [],
    status: 'approved',
    created_at: '2024-01-08T14:15:00Z',
    helpful_count: 3,
    report_count: 0,
    verified_purchase: false
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get backend URL from environment
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    
    // Forward the request to the backend with all query parameters
    const queryParams = new URLSearchParams(searchParams);
    const apiUrl = `${backendUrl}/api/reviews?${queryParams.toString()}`;
    
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
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/reviews`;

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
