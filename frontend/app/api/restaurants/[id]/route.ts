import { NextRequest, NextResponse } from 'next/server';

import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, rateLimitConfigs.api, 'restaurant-detail');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;
  try {
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restaurant ID'
      }, { status: 400 });
    }

    // Fetch restaurant data from backend
    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
              // If backend fails, try to fetch from restaurants listing and filter by ID
        if (response.status >= 500) {
          try {
            // Fetch all restaurants and find the one we need
            const restaurantsResponse = await fetch(`${backendUrl}/api/restaurants?limit=1000`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (restaurantsResponse.ok) {
              const restaurantsData = await restaurantsResponse.json();
              const restaurants = restaurantsData.restaurants || [];
              const restaurant = restaurants.find((r: any) => r.id === restaurantId);
              
              if (restaurant) {
                const sanitizedRestaurant = sanitizeRestaurantData([restaurant])[0];
                return NextResponse.json({
                  success: true,
                  data: sanitizedRestaurant,
                  fallback: true,
                  message: 'Using fallback data from restaurants listing'
                });
              }
            }
          } catch {
            // Silently handle fallback error
          }
        
        // If fallback also fails, use mock data
        const mockRestaurant = {
          id: restaurantId,
          name: `Restaurant ${restaurantId}`,
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip_code: '10001',
          phone_number: '(555) 123-4567',
          website: 'https://example.com',
          certificate_link: 'https://example.com/cert',
          image_url: '/images/default-restaurant.webp',
          kosher_category: 'Dairy',
          certifying_agency: 'ORB',
          listing_type: 'restaurant',
          latitude: 40.7128,
          longitude: -74.0060,
          hours: {
            monday: '9:00 AM - 10:00 PM',
            tuesday: '9:00 AM - 10:00 PM',
            wednesday: '9:00 AM - 10:00 PM',
            thursday: '9:00 AM - 10:00 PM',
            friday: '9:00 AM - 3:00 PM',
            saturday: 'Closed',
            sunday: '9:00 AM - 10:00 PM'
          },
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Include mock Google reviews for testing
          google_reviews: JSON.stringify([
            {
              author_name: "John Doe",
              rating: 5,
              text: "Amazing kosher food! Great service and atmosphere.",
              relative_time_description: "2 weeks ago",
              time: Math.floor(Date.now() / 1000) - 1209600, // 2 weeks ago
              profile_photo_url: "https://lh3.googleusercontent.com/a/default-user=s128-c0x00000000-cc-rp-mo"
            },
            {
              author_name: "Sarah Smith",
              rating: 4,
              text: "Delicious food, but service could be faster.",
              relative_time_description: "1 month ago",
              time: Math.floor(Date.now() / 1000) - 2628000, // 1 month ago
              profile_photo_url: "https://lh3.googleusercontent.com/a/default-user=s128-c0x00000000-cc-rp-mo"
            }
          ]),
          google_rating: 4.5,
          google_review_count: 2
        };

        const sanitizedMock = sanitizeRestaurantData([mockRestaurant]);
        return NextResponse.json({
          success: true,
          data: sanitizedMock[0],
          fallback: true,
          message: 'Using mock data - backend temporarily unavailable'
        });
      }
      
      // For other errors (404, 400), return the error
      return NextResponse.json({
        success: false,
        message: `Restaurant not found`
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Handle different response formats from backend
    let restaurant = null;
    if (data && data.restaurant) {
      restaurant = data.restaurant;
    } else if (data && data.success === true && data.data) {
      restaurant = data.data;
    } else if (data && data.id) {
      // Direct restaurant object
      restaurant = data;
    }

    if (!restaurant) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restaurant data received'
      }, { status: 500 });
    }

    // Sanitize image URLs before returning
    const sanitizedRestaurant = sanitizeRestaurantData([restaurant])[0];

    return NextResponse.json({
      success: true,
      data: sanitizedRestaurant
    });

  } catch {
    // console.error('Error fetching restaurant:', error);
    
    // Fallback to mock data on network error
    const mockRestaurant = {
      id: parseInt(id),
      name: `Restaurant ${id}`,
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      phone_number: '(555) 123-4567',
      website: 'https://example.com',
      certificate_link: 'https://example.com/cert',
      image_url: '/images/default-restaurant.webp',
      kosher_category: 'Dairy',
      certifying_agency: 'ORB',
      listing_type: 'restaurant',
      latitude: 40.7128,
      longitude: -74.0060,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Include mock Google reviews for development
      google_reviews: JSON.stringify([{
        author_name: "Mock Reviewer",
        rating: 4,
        text: "This is a mock review for development purposes.",
        relative_time_description: "1 week ago",
        time: Math.floor(Date.now() / 1000) - 604800
      }]),
      google_rating: 4.0,
      google_review_count: 1
    };

    const sanitizedMock = sanitizeRestaurantData([mockRestaurant]);
    return NextResponse.json({
      success: true,
      data: sanitizedMock[0],
      fallback: true,
      message: 'Using fallback data - network error'
    }, { status: 200 });
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restaurant ID'
      }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.address || !body.phone) {
      return NextResponse.json({
        success: false,
        message: 'Name, address, and phone are required fields'
      }, { status: 400 });
    }

    // Update restaurant data via backend API
    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env["ADMIN_TOKEN"] || ''}`,
      },
      body: JSON.stringify({
        ...body,
        updated_at: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        message: errorData.message || `Backend API error: ${response.status}`
      }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: result.data || {
        id: restaurantId,
        ...body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating restaurant:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update restaurant'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restaurant ID'
      }, { status: 400 });
    }

    // Delete restaurant via backend API
    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env["ADMIN_TOKEN"] || ''}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        message: errorData.message || `Backend API error: ${response.status}`
      }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Restaurant deleted successfully',
      data: result.data || {
        id: restaurantId,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting restaurant:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete restaurant'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restaurant ID'
      }, { status: 400 });
    }

    const body = await request.json();

    // Validate that at least one field is provided
    if (Object.keys(body).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'At least one field must be provided for update'
      }, { status: 400 });
    }

    // Partial update restaurant data via backend API
    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env["ADMIN_TOKEN"] || ''}`,
      },
      body: JSON.stringify({
        ...body,
        updated_at: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        message: errorData.message || `Backend API error: ${response.status}`
      }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Restaurant partially updated successfully',
      data: result.data || {
        id: restaurantId,
        ...body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error partially updating restaurant:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to partially update restaurant'
    }, { status: 500 });
  }
} 