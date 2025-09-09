/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleBackendError, fetchWithTimeout, getFallbackResponse } from '../../../lib/utils/backend-error-handler';
import { createSuccessResponse } from '../../../lib/utils/error-responses';

// Enhanced restaurant submission schema
const restaurantSubmissionSchema = z.object({
  // Basic business info
  name: z.string().min(1, 'Business name is required').max(255),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100).optional().or(z.literal('')),
  state: z.string().min(1, 'State is required').max(50).optional().or(z.literal('')),
  zip_code: z.string().min(1, 'ZIP code is required').max(20).optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
  business_email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  listing_type: z.string().min(1, 'Listing type is required').max(100),
  
  // Kosher certification
  kosher_category: z.enum(['meat', 'dairy', 'pareve']),
  certifying_agency: z.string().min(1, 'Certifying agency is required').max(100),
  is_cholov_yisroel: z.boolean().optional(),
  is_pas_yisroel: z.boolean().optional(),
  cholov_stam: z.boolean().optional(),
  
  // Business details
  short_description: z.string().min(1, 'Short description is required').max(80),
  description: z.string().max(2000).optional().or(z.literal('')),
  hours_of_operation: z.string().optional().or(z.literal('')),
  hours_open: z.string().optional().or(z.literal('')),
  google_listing_url: z.string().url().optional().or(z.literal('')),
  instagram_link: z.string().url().optional().or(z.literal('')),
  facebook_link: z.string().url().optional().or(z.literal('')),
  tiktok_link: z.string().url().optional().or(z.literal('')),
  
  // Images
  business_images: z.array(z.string().url()).min(2, 'At least 2 images are required').max(5),
  
  // Owner information
  is_owner_submission: z.boolean(),
  owner_name: z.string().max(255).optional().or(z.literal('')),
  owner_email: z.string().email().optional().or(z.literal('')),
  owner_phone: z.string().max(50).optional().or(z.literal('')),
  
  // Additional business details
  business_license: z.string().max(100).optional().or(z.literal('')),
  tax_id: z.string().max(100).optional().or(z.literal('')),
  years_in_business: z.number().int().min(0).max(100).optional(),
  seating_capacity: z.number().int().min(1).max(10000).optional().or(z.literal(0)),
  delivery_available: z.boolean().default(false),
  takeout_available: z.boolean().default(false),
  catering_available: z.boolean().default(false),
  
  // Contact preferences
  preferred_contact_method: z.enum(['email', 'phone', 'text', 'any']).optional(),
  preferred_contact_time: z.enum(['morning', 'afternoon', 'evening']).optional(),
  contact_notes: z.string().max(1000).optional().or(z.literal('')),
  
  // Submission metadata
  submission_status: z.string().default('pending_approval'),
  submission_date: z.string().optional(),
}).refine((data) => {
  // Conditional validation for kosher categories
  if (data.kosher_category === 'dairy' && data.is_cholov_yisroel === undefined) {
    return false;
  }
  if (['meat', 'pareve'].includes(data.kosher_category) && data.is_pas_yisroel === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Please specify kosher certification details',
  path: ['kosher_category']
}).refine((data) => {
  // Conditional validation for owner submissions
  if (data.is_owner_submission) {
    if (!data.owner_name || !data.owner_email || !data.owner_phone) {
      return false;
    }
  }
  return true;
}, {
  message: 'Owner submissions require owner contact information',
  path: ['is_owner_submission']
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = restaurantSubmissionSchema.parse(body);
    
    // Check for duplicate restaurants
    const duplicateCheck = await checkForDuplicates(validatedData);
    if (!duplicateCheck.isValid) {
      return NextResponse.json({
        success: false,
        message: 'Duplicate restaurant found',
        errors: duplicateCheck.errors
      }, { status: 400 });
    }
    
    // Prepare data for database insertion
    const restaurantData = {
      ...validatedData,
      phone_number: validatedData.phone, // Map to database field
      image_url: validatedData.business_images[0] || '', // Use first image as main image
      status: 'pending', // Set status to pending instead of active
      submission_date: validatedData.submission_date || new Date().toISOString(),
      // Ensure hours data is included
      hours_of_operation: validatedData.hours_of_operation || validatedData.hours_open || '',
      // Handle kosher flags properly - convert undefined to null
      is_cholov_yisroel: validatedData.is_cholov_yisroel ?? null,
      is_pas_yisroel: validatedData.is_pas_yisroel ?? null,
      cholov_stam: validatedData.cholov_stam ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Remove fields that don't match database schema
    const { phone: _phone, hours_open: _hours_open, description: _description, ...restaurantDataWithoutPhone } = restaurantData;
    
    // Use API v4 endpoint
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    let backendResponse: Response | undefined;
    let lastError: Error | undefined;
    
    try {
      backendResponse = await fetch(`${backendUrl}/api/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restaurantDataWithoutPhone),
      });

    } catch (error) {

      lastError = error as Error;
    }
    
    if (!backendResponse || !backendResponse.ok) {
      console.error('[API] All backend URLs failed. Last error:', lastError);
      
      return NextResponse.json({
        success: false,
        message: 'Unable to connect to backend server. Please try again later.',
        error: lastError?.message || 'Backend connection failed'
      }, { status: 503 });
    }
    
    return createSuccessResponse({ message: 'Restaurant submitted successfully' });
    
  } catch (error) {
    console.error('Restaurant submission error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '200'; // Increased default limit
  const _page = searchParams.get('page') || '1';
  
  try {
    const _status = searchParams.get('status');
    const offset = searchParams.get('offset') || '0';
    const _cursor = searchParams.get('cursor');
    
    // Build query parameters - pass through all parameters from the request
    const queryParams = new URLSearchParams();
    
    // Add all search parameters from the request
    searchParams.forEach((value, key) => {
      if (value && value.trim() !== '') {
        queryParams.append(key, value);
      }
    });
    
    // Don't override limit if it's already set - let the backend handle it
    if (!searchParams.has('limit')) {
      queryParams.set('limit', limit);
    }
    queryParams.set('offset', offset);
    
    // Use the correct backend URL - fallback to production URL if not set
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    const fullBackendUrl = `${backendUrl}/api/restaurants?${queryParams}`;
    
    console.log('Frontend API: Calling backend URL:', fullBackendUrl);
    
    // Use the improved fetch with timeout
    const response = await fetchWithTimeout(fullBackendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, 10000);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Frontend API: Direct fetch result:', JSON.stringify(responseData, null, 2));
    
    const result = {
      success: true,
      data: responseData,
      cached: false,
      performance: { requestTime: 0, cacheHit: false, retryCount: 0 }
    };
    
    if (!result.success) {
      // For server errors, return empty list with success status
      return NextResponse.json({
        success: true,
        items: [],
        next_cursor: null,
        limit: parseInt(limit),
        message: 'No restaurants found'
      });
    }
    
    const backendData = result.data;
    
    // For cursor-based pagination, pass through the backend response directly
    // The EateryGrid component expects the cursor-based format with 'items' and 'next_cursor'
    const transformedResponse = {
      ...backendData,
      cached: result.cached,
      performance: result.performance
    };
    
    return NextResponse.json(transformedResponse);
    
  } catch (error) {
    // Use the centralized error handler
    const errorResponse = handleBackendError(error, {
      fallbackData: getFallbackResponse('restaurants'),
      customMessage: 'Restaurants retrieved successfully'
    });
    
    return NextResponse.json(errorResponse);
  }
}

async function checkForDuplicates(data: any): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Fetch existing restaurants
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://api.jewgo.app';
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    const response = await fetch(`${backendUrl}/api/restaurants?limit=1000`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch existing restaurants for duplicate check');
      return { isValid: true, errors: [] }; // Proceed if we can't check
    }
    
    const result = await response.json();
    const existingRestaurants = result.data || result.restaurants || [];
    
    // Check for duplicate name (case-insensitive)
    const duplicateName = existingRestaurants.find((restaurant: any) => 
      restaurant.name?.toLowerCase().trim() === data.name.toLowerCase().trim()
    );
    if (duplicateName) {
      errors.push(`A restaurant with the name "${data.name}" already exists.`);
    }
    
    // Check for duplicate phone number (normalized)
    const normalizedPhone = data.phone.replace(/\D/g, '');
    const duplicatePhone = existingRestaurants.find((restaurant: any) => {
      const existingPhone = restaurant.phone_number?.replace(/\D/g, '') || '';
      return existingPhone === normalizedPhone && normalizedPhone.length > 0;
    });
    if (duplicatePhone) {
      errors.push(`A restaurant with the phone number "${data.phone}" already exists.`);
    }
    
    // Check for duplicate address (case-insensitive, normalized)
    const normalizedAddress = data.address.toLowerCase().trim().replace(/\s+/g, ' ');
    const duplicateAddress = existingRestaurants.find((restaurant: any) => {
      const existingAddress = restaurant.address?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
      return existingAddress === normalizedAddress && normalizedAddress.length > 0;
    });
    if (duplicateAddress) {
      errors.push(`A restaurant with the address "${data.address}" already exists.`);
    }
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    // If we can't check for duplicates, we'll proceed but log the error
  }
  
  return { isValid: errors.length === 0, errors };
} 
/* eslint-disable no-console */
