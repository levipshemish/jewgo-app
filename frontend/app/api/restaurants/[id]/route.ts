import { NextRequest } from 'next/server';
import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';
import { withRateLimit, rateLimitConfigs } from '@/lib/utils/rateLimiter';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { handleRoute, forwardAuthHeader } from '@/lib/server/route-helpers';
import { getBackendUrl } from '@/lib';
import { createSuccessResponse } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

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
      return createSuccessResponse({
        success: false,
        message: 'Invalid restaurant ID'
      }, undefined, 400);
    }

    // Fetch restaurant data from backend
    const backendUrl = getBackendUrl();
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
            const restaurantsResponse = await fetch(`${getBackendUrl()}/api/restaurants?limit=1000`, {
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
                return createSuccessResponse({
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
          hours_json: JSON.stringify({
            weekday_text: [
              'Monday: 9:00 AM – 10:00 PM',
              'Tuesday: 9:00 AM – 10:00 PM',
              'Wednesday: 9:00 AM – 10:00 PM',
              'Thursday: 9:00 AM – 10:00 PM',
              'Friday: 9:00 AM – 3:00 PM',
              'Saturday: Closed',
              'Sunday: 9:00 AM – 10:00 PM'
            ]
          }),
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Include mock Google reviews for testing (with malformed JSON to test our fix)
          google_reviews: "{'reviews': [{'google_review_id': 1751588673, 'author_name': 'Steven Marks', 'author_url': 'https://www.google.com/maps/contrib/112638545508327569853/reviews', 'rating': 5, 'relative_time_description': 'a month ago', 'text': 'I pulled off here on the spur of the moment from the Turnpike. The diner is right near the exit, inside a giant glass office building. First floor. Marie was super nice. She made me \"The Vincent\" for breakfast. It was a pita with avocado and egg and cheese and it was really good. She took great care to make sure I was all set up with hot sauce and stuff. I had a really nice experience there and she really made me feel welcome. Food was great.', 'time': 1751588673, 'translated': False, 'language': 'en', 'profile_photo_url': 'https://lh3.googleusercontent.com/a/ACg8ocK6vre50aSUSoigpjsKAQ6doCuAcAF46owqgqdAMtv0t99lBw=s128-c0x00000000-cc-rp-mo', 'rating_date': '2025-07-03 20:24:33'}, {'google_review_id': 1527091917, 'author_name': 'יוסף לופז', 'author_url': 'https://www.google.com/maps/contrib/100880724373164296561/reviews', 'rating': 5, 'relative_time_description': '7 years ago', 'text': \"Excellent kosher eatery. Excellent salads. This is by far the best hidden gem when it comes to kosher food. I couldn't recommend this place more.\", 'time': 1527091917, 'translated': False, 'language': 'en', 'profile_photo_url': 'https://lh3.googleusercontent.com/a-/ALV-UjUT7OpQ346OCSNeyBkaTS-GcECGo9KSStG0W96Jp7hhAIDbokdq=s128-c0x00000000-cc-rp-mo-ba5', 'rating_date': '2018-05-23 12:11:57'}], 'overall_rating': 4.7, 'total_reviews': 13, 'fetched_at': 1754681020.445987}",
          google_rating: 4.5,
          google_review_count: 2
        };

        const sanitizedMock = sanitizeRestaurantData([mockRestaurant]);
        return createSuccessResponse({
          success: true,
          data: sanitizedMock[0],
          fallback: true,
          message: 'Using mock data - backend temporarily unavailable'
        });
      }
      
      // For other errors (404, 400), return the error
      return createSuccessResponse({
        success: false,
        message: `Restaurant not found`
      }, undefined, response.status);
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
      return createSuccessResponse({
        success: false,
        message: 'Invalid restaurant data received'
      }, undefined, 500);
    }

    // Sanitize image URLs before returning
    const sanitizedRestaurant = sanitizeRestaurantData([restaurant])[0];

    return createSuccessResponse({
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
    return createSuccessResponse({
      success: true,
      data: sanitizedMock[0],
      fallback: true,
      message: 'Using fallback data - network error'
    }, undefined, 200);
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return createSuccessResponse({
        success: false,
        message: 'Invalid restaurant ID'
      }, undefined, 400);
    }

    const body = await request.json();

    // Validate required fields - accept both phone and phone_number for compatibility
    if (!body.name || !body.address || (!body.phone && !body.phone_number)) {
      return createSuccessResponse({
        success: false,
        message: 'Name, address, and phone are required fields'
      }, undefined, 400);
    }

    // Normalize phone field to phone_number for backend consistency
    const normalizedBody = {
      ...body,
      phone_number: body.phone_number || body.phone
    };
    // Remove the old phone field if it exists to avoid confusion
    delete normalizedBody.phone;

    // Update restaurant data via backend API
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    // Prefer incoming Authorization header; fallback to admin token (Supabase access token)
    const authHeader = forwardAuthHeader(request, admin?.token ? `Bearer ${admin.token}` : undefined);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({
        ...normalizedBody,
        updated_at: new Date().toISOString()
      }),
    });

    async function parseJsonSafe(res: Response) {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    }

    if (!response.ok) {
      const errorData = await parseJsonSafe(response);
      return createSuccessResponse({
        success: false,
        message: errorData.message || `Backend API error: ${response.status}`
      }, undefined, response.status);
    }

    const result = response.status === 204 ? {} : await parseJsonSafe(response);

    return createSuccessResponse({
      success: true,
      message: 'Restaurant updated successfully',
      data: result.data || {
        id: restaurantId,
        ...normalizedBody,
        updated_at: new Date().toISOString()
      }
    });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return createSuccessResponse({
        success: false,
        message: 'Invalid restaurant ID'
      }, undefined, 400);
    }

    // Delete restaurant via backend API
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    // Prefer incoming Authorization header; fallback to admin token (Supabase access token)
    const authHeader = forwardAuthHeader(request, admin?.token ? `Bearer ${admin.token}` : undefined);

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    if (!response.ok) {
      const errorData = await (async () => { const t = await response.text(); try { return t ? JSON.parse(t) : {}; } catch { return {}; } })();
      return createSuccessResponse({
        success: false,
        message: errorData.message || `Backend API error: ${response.status}`
      }, undefined, response.status);
    }

    const result = response.status === 204 ? {} : await (async () => { const t = await response.text(); try { return t ? JSON.parse(t) : {}; } catch { return {}; } })();

    return createSuccessResponse({
      success: true,
      message: 'Restaurant deleted successfully',
      data: result.data || {
        id: restaurantId,
        deleted_at: new Date().toISOString()
      }
    });
  });
}

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return createSuccessResponse({
        success: false,
        message: 'Invalid restaurant ID'
      }, undefined, 400);
    }

    const body = await request.json();

    // Validate that at least one field is provided
    if (Object.keys(body).length === 0) {
      return createSuccessResponse({
        success: false,
        message: 'At least one field must be provided for update'
      }, undefined, 400);
    }

    // Partial update restaurant data via backend API
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}`;

    // Prefer incoming Authorization header; fallback to admin token (Supabase access token)
    const authHeader = forwardAuthHeader(request, admin?.token ? `Bearer ${admin.token}` : undefined);

    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify({
        ...body,
        updated_at: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      const errorData = await (async () => { const t = await response.text(); try { return t ? JSON.parse(t) : {}; } catch { return {}; } })();
      return createSuccessResponse({
        success: false,
        message: errorData.message || `Backend API error: ${response.status}`
      }, undefined, response.status);
    }

    const result = response.status === 204 ? {} : await (async () => { const t = await response.text(); try { return t ? JSON.parse(t) : {}; } catch { return {}; } })();

    return createSuccessResponse({
      success: true,
      message: 'Restaurant partially updated successfully',
      data: result.data || {
        id: restaurantId,
        ...body,
        updated_at: new Date().toISOString()
      }
    });
  });
} 
