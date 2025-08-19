import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

// Validation schema for restaurant submission
const RestaurantSubmissionSchema = z.object({
  // Basic Info
  name: z.string().min(1, "Restaurant name is required").max(255),
  short_description: z.string().max(80, "Short description must be 80 characters or less"),
  description: z.string().optional(),
  certifying_agency: z.string().min(1, "Certifying agency is required"),
  kosher_category: z.enum(['meat', 'dairy', 'pareve']),
  
  // Kosher Info
  is_cholov_yisroel: z.boolean().optional(),
  cholov_stam: z.boolean().optional(),
  is_pas_yisroel: z.boolean().optional(),
  kosher_cert_link: z.string().url().optional().or(z.literal('')),
  
  // Contact & Location
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1, "Address is required"),
  website: z.string().url().optional().or(z.literal('')),
  google_listing_url: z.string().url().optional().or(z.literal('')),
  
  // Business Info
  hours_open: z.string().min(1, "Hours are required"),
  price_range: z.string().optional(),
  
  // Images
  image_url: z.string().url().optional().or(z.literal('')),
  
  // Meta
  category: z.string().default('restaurant'),
  user_type: z.enum(['owner', 'community']),
  owner_info: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional()
  }).optional()
}).refine((data) => {
  // Conditional validation for kosher subcategories
  if (data.kosher_category === 'dairy' && data.is_cholov_yisroel === undefined) {
    return false;
  }
  if (['meat', 'pareve'].includes(data.kosher_category) && data.is_pas_yisroel === undefined) {
    return false;
  }
  // Ensure milk supervision is mutually exclusive
  if (data.kosher_category === 'dairy' && data.is_cholov_yisroel === true && data.cholov_stam === true) {
    return false;
  }
  return true;
}, {
  message: "Kosher subcategory is required and milk supervision must be mutually exclusive",
  path: ["kosher_category"]
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = RestaurantSubmissionSchema.parse(body);
    
    // Transform data for database insertion
    const restaurantData = {
      name: validatedData.name,
      short_description: validatedData.short_description,
      description: validatedData.description || null,
      certifying_agency: validatedData.certifying_agency,
      kosher_category: validatedData.kosher_category,
      is_cholov_yisroel: validatedData.kosher_category === 'dairy' ? validatedData.is_cholov_yisroel : null,
      cholov_stam: validatedData.kosher_category === 'dairy' ? (validatedData.is_cholov_yisroel ? false : validatedData.cholov_stam) : null,
      is_pas_yisroel: ['meat', 'pareve'].includes(validatedData.kosher_category) ? validatedData.is_pas_yisroel : null,
      kosher_cert_link: validatedData.kosher_cert_link || null,
      phone: validatedData.phone,
      email: validatedData.email || null,
      address: validatedData.address,
      website: validatedData.website || null,
      google_listing_url: validatedData.google_listing_url || null,
      hours_open: validatedData.hours_open,
      price_range: validatedData.price_range || null,
      image_url: validatedData.image_url || null,
      category: validatedData.category,
      status: 'pending_approval', // Default status for new submissions
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into database via backend API
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants`;
    
    if (process.env.NODE_ENV === 'development') {
      }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env["ADMIN_TOKEN"] || ''}`,
      },
      body: JSON.stringify(restaurantData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Backend API error: ${response.status}`);
    }
    
    const result = await response.json();
    // Send notification email to admin (optional)
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/notifications/new-restaurant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant: result.data,
            submittedBy: validatedData.owner_info?.email || validatedData.email || 'Anonymous',
          }),
        });
      } catch (emailError) {
        }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Restaurant submitted successfully for review',
      data: result.data || {
        id: result.id || Math.floor(Math.random() * 10000),
        ...restaurantData
      }
    }, { status: 201 });

  } catch (_error) {
    // // console.error('Restaurant submission error:', error);
    
    if (_error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: _error.issues
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!request.nextUrl) {
      throw new Error('Request URL is undefined');
    }
    
    const { searchParams } = request.nextUrl;
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Filter parameters
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const certifying_agency = searchParams.get('certifying_agency');
    const kosher_category = searchParams.get('kosher_category');
    const is_cholov_yisroel = searchParams.get('is_cholov_yisroel');
    const cholov_stam = searchParams.get('cholov_stam');
    const listing_type = searchParams.get('listing_type');
    const business_types = searchParams.getAll('business_types');
    const price_range = searchParams.get('price_range');
    const min_rating = searchParams.get('min_rating');
    const has_reviews = searchParams.get('has_reviews');
    const open_now = searchParams.get('open_now');
    const status = searchParams.get('status');
    
    // Location-based filtering
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    
    // Build query parameters for backend API
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    if (offset) {
      queryParams.append('offset', offset.toString());
    }
    if (search) {
      queryParams.append('query', search);
    }
    if (city) {
      queryParams.append('city', city);
    }
    if (state) {
      queryParams.append('state', state);
    }
    if (certifying_agency) {
      queryParams.append('certifying_agency', certifying_agency);
    }
    // Map kosher_category to kosher_type for backend API compatibility
    if (kosher_category) {
      queryParams.append('kosher_type', kosher_category);
    }
    if (is_cholov_yisroel) {
      queryParams.append('is_cholov_yisroel', is_cholov_yisroel);
    }
    if (cholov_stam) {
      queryParams.append('cholov_stam', cholov_stam);
    }
    if (listing_type) {
      queryParams.append('listing_type', listing_type);
    }
    if (business_types && business_types.length > 0) {
      business_types.forEach(type => {
        queryParams.append('business_types', type);
      });
    }
    if (price_range) {
      queryParams.append('price_range', price_range);
    }
    if (min_rating) {
      queryParams.append('min_rating', min_rating);
    }
    if (has_reviews) {
      queryParams.append('has_reviews', has_reviews);
    }
    if (open_now) {
      queryParams.append('open_now', open_now);
    }
    if (status) {
      queryParams.append('status', status);
    }
    if (lat) {
      queryParams.append('lat', lat);
    }
    if (lng) {
      queryParams.append('lng', lng);
    }
    if (radius) {
      queryParams.append('radius', radius);
    }
    
    // Fetch from backend with pagination aggregation to bypass backend's default 50 limit
    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const targetLimit = Number.isFinite(limit) ? Math.max(0, limit) : 50;
    // Increase perPage size to reduce number of backend calls
    const perPage = Math.min(500, targetLimit || 500); // Increased from 200 to 500
    let currentOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
    let aggregated: any[] = [];

    // Copy query params that are not limit/offset
    const baseParams = new URLSearchParams(queryParams.toString());
    // We'll control limit/offset explicitly per page
    baseParams.delete('limit');
    baseParams.delete('offset');

    // Page until we meet targetLimit or no more results
    for (let page = 0; page < 10; page++) { // Reduced from 20 to 10 pages max
      const pageParams = new URLSearchParams(baseParams.toString());
      pageParams.set('limit', String(perPage));
      pageParams.set('offset', String(currentOffset));
      const apiUrl = `${backendUrl}/api/restaurants?${pageParams.toString()}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }
      const pageData = await response.json();
      const pageRestaurants: any[] = (pageData?.restaurants || pageData?.data || pageData || []);
      if (!Array.isArray(pageRestaurants) || pageRestaurants.length === 0) {
        break;
      }
      aggregated = aggregated.concat(pageRestaurants);
      currentOffset += pageRestaurants.length;
      if (aggregated.length >= targetLimit) {
        break;
      }
      if (pageRestaurants.length < perPage) {
        break; // no more pages
      }
    }

    // Slice to requested limit (if any)
    const restaurants = targetLimit > 0 ? aggregated.slice(0, targetLimit) : aggregated;
    
    // Sanitize image URLs before returning to frontend
    const sanitizedRestaurants = Array.isArray(restaurants) ? sanitizeRestaurantData(restaurants) : [];

    // Apply frontend-side filtering for parameters the backend may not support
    const toLower = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '');
    const parseNumber = (v: string | null) => (v !== null ? Number(v) : NaN);
    const calculateDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 3959; // miles
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    const timeToMinutes = (timeStr: string): number => {
      const time = timeStr.toLowerCase().trim();
      const match = time.match(/(\d+):?(\d*)\s*(am|pm)/);
      if (!match || !match[1] || !match[3]) {return -1;}
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const period = match[3];
      if (period === 'pm' && hours !== 12) {hours += 12;}
      if (period === 'am' && hours === 12) {hours = 0;}
      return hours * 60 + minutes;
    }

    let filtered = [...sanitizedRestaurants];

    // Text search
    if (search) {
      const q = toLower(search);
      filtered = filtered.filter((r: any) =>
        toLower(r.name).includes(q) ||
        toLower(r.address).includes(q) ||
        toLower(r.city).includes(q) ||
        toLower(r.state).includes(q) ||
        toLower(r.listing_type).includes(q) ||
        toLower(r.certifying_agency).includes(q)
      );
    }

    // Field filters
    if (city) {
      filtered = filtered.filter((r: any) => toLower(r.city) === toLower(city));
    }
    if (state) {
      filtered = filtered.filter((r: any) => toLower(r.state) === toLower(state));
    }
    if (certifying_agency) {
      filtered = filtered.filter((r: any) => toLower(r.certifying_agency) === toLower(certifying_agency));
    }
    if (listing_type) {
      filtered = filtered.filter((r: any) => toLower(r.listing_type) === toLower(listing_type));
    }
    if (kosher_category) {
      const cat = toLower(kosher_category === 'parve' ? 'pareve' : kosher_category);
      filtered = filtered.filter((r: any) => toLower(r.kosher_category) === cat);
    }

    // Min rating
    if (min_rating && !Number.isNaN(Number(min_rating))) {
      const min = Number(min_rating);
      filtered = filtered.filter((r: any) => {
        const rating = r.rating ?? r.star_rating ?? r.google_rating;
        return typeof rating === 'number' ? rating >= min : false;
      });
    }

    // Has reviews
    if (has_reviews) {
      const expect = toLower(has_reviews) !== 'false';
      filtered = filtered.filter((r: any) => {
        const count = r.review_count ?? r.google_review_count ?? 0;
        return expect ? count > 0 : true;
      });
    }

    // Open now (best-effort based on hours_of_operation JSON array)
    if (open_now) {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      filtered = filtered.filter((r: any) => {
        const raw = r.hours_of_operation;
        if (!raw) {return false;}
        try {
          const hours = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!Array.isArray(hours)) {return false;}
          const today = hours.find((h: any) => h.day === currentDay);
          if (!today || !today.open || !today.close) {return false;}
          const openM = timeToMinutes(today.open);
          const closeM = timeToMinutes(today.close);
          if (openM === -1 || closeM === -1) {return false;}
          return closeM < openM ? (currentTime >= openM || currentTime <= closeM) : (currentTime >= openM && currentTime <= closeM);
        } catch { return false; }
      });
    }

    // Near me filtering
    const latNum = parseNumber(lat);
    const lngNum = parseNumber(lng);
    const radiusNum = parseNumber(radius);
    if (!Number.isNaN(latNum) && !Number.isNaN(lngNum) && !Number.isNaN(radiusNum)) {
      filtered = filtered.filter((r: any) => {
        if (!r.latitude || !r.longitude) {return false;}
        const d = calculateDistanceMiles(Number(r.latitude), Number(r.longitude), latNum, lngNum);
        return d <= radiusNum;
      });
      // Sort by distance asc for better UX
      filtered.sort((a: any, b: any) => {
        const da = calculateDistanceMiles(Number(a.latitude), Number(a.longitude), latNum, lngNum);
        const db = calculateDistanceMiles(Number(b.latitude), Number(b.longitude), latNum, lngNum);
        return da - db;
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
      limit: typeof limit === 'number' ? limit : 50,
      offset: typeof offset === 'number' ? offset : 0
    });

  } catch (_error) {
    // console.error('Error fetching restaurants:', error);
    // console.error('Error type:', typeof error);
    // console.error('Error message:', error instanceof Error ? error.message : String(error));
    
    // Return mock data as fallback when backend is unavailable
    const mockRestaurants = [
      {
        id: 1,
        name: "Sample Kosher Restaurant",
        address: "123 Kosher Lane, Miami, FL 33139",
        phone: "(305) 555-0101",
        certifying_agency: "ORB",
        kosher_category: "meat",
        listing_type: "restaurant",
        image_url: "/images/default-restaurant.webp",
        rating: 4.5,
        description: "Authentic kosher dining experience",
        website: "https://example.com",
        hours_open: "Sunday-Thursday: 11:00 AM - 9:00 PM, Friday: 11:00 AM - 2:00 PM, Closed Saturday",
        latitude: 25.7617,
        longitude: -80.1918
      },
      {
        id: 2,
        name: "Kosher Dairy Cafe",
        address: "456 Dairy Street, Miami Beach, FL 33139",
        phone: "(305) 555-0102",
        certifying_agency: "Kosher Miami",
        kosher_category: "dairy",
        listing_type: "restaurant",
        image_url: "/images/default-restaurant.webp",
        rating: 4.2,
        description: "Fresh dairy kosher meals",
        website: "https://example.com",
        hours_open: "Sunday-Thursday: 8:00 AM - 8:00 PM, Friday: 8:00 AM - 2:00 PM, Closed Saturday",
        latitude: 25.7907,
        longitude: -80.1300
      }
    ];
    
    // Sanitize mock data as well
    const sanitizedMockRestaurants = sanitizeRestaurantData(mockRestaurants);
    
    return NextResponse.json({
      success: true,
      data: sanitizedMockRestaurants,
      total: sanitizedMockRestaurants.length,
      limit: parseInt(new URL(request.url).searchParams.get('limit') || '50'),
      offset: parseInt(new URL(request.url).searchParams.get('offset') || '0'),
      fallback: true,
      message: 'Using fallback data - backend temporarily unavailable'
    });
  }
} 