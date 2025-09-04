import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib';
import { errorResponses } from '@/lib';

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

// Removed legacy mock reviews to avoid unused variable noise.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get backend URL from environment
    const backendUrl = getBackendUrl();
    
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
      // For server errors (500+), return empty reviews with success
      if (response.status >= 500) {
        return NextResponse.json({
          reviews: [],
          pagination: {
            total: 0,
            limit: parseInt(searchParams.get('limit') || '10'),
            offset: parseInt(searchParams.get('offset') || '0'),
            hasMore: false
          },
          message: 'Reviews service temporarily unavailable'
        });
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

  } catch (error) {
    // For network/connectivity issues, return empty response with success status
    // This ensures the UI continues to work even when backend is down
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      reviews: [],
      pagination: {
        total: 0,
        limit: parseInt(searchParams.get('limit') || '10'),
        offset: parseInt(searchParams.get('offset') || '0'),
        hasMore: false
      },
      message: error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network')
      ) ? 'Reviews service temporarily unavailable' : 'No reviews available'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, rating, title, content, images = [], userId, userName, userEmail } = body;

    // Validate required fields
    if (!restaurantId || !rating || !content) {
      return errorResponses.badRequest();
    }

    // Forward review creation to backend API to persist in DB
    const backendUrl = getBackendUrl();
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
    return errorResponses.internalError();
  }
}
