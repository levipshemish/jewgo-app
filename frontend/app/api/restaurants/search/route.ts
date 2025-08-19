import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sanitizeRestaurantData } from '@/lib/utils/imageUrlValidator';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Validation schema for search filters
const SearchFiltersSchema = z.object({
  q: z.string().optional(),
  agency: z.string().optional(),
  dietary: z.string().optional(),
  category: z.string().optional(),
  businessTypes: z.array(z.string()).optional(),
  openNow: z.boolean().optional(),
  nearMe: z.boolean().optional(),
  maxDistance: z.number().optional(),
  ratingMin: z.number().optional(),
  priceRange: z.tuple([z.number(), z.number()]).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
  page: z.number().default(1),
  limit: z.number().default(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filters = SearchFiltersSchema.parse(body);

    // Build query parameters for backend API
    const queryParams = new URLSearchParams();
    
    // Pagination
    if (filters.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    if (filters.page) {
      queryParams.append('offset', ((filters.page - 1) * (filters.limit || 50)).toString());
    }

    // Search query
    if (filters.q) {
      queryParams.append('query', filters.q);
    }

    // Agency filter
    if (filters.agency) {
      queryParams.append('certifying_agency', filters.agency);
    }

    // Dietary filter (map to kosher_type for backend compatibility)
    if (filters.dietary) {
      queryParams.append('kosher_type', filters.dietary);
    }

    // Category filter
    if (filters.category) {
      queryParams.append('listing_type', filters.category);
    }

    // Business types filter
    if (filters.businessTypes && filters.businessTypes.length > 0) {
      filters.businessTypes.forEach(type => {
        queryParams.append('business_types', type);
      });
    }

    // Open now filter
    if (filters.openNow) {
      queryParams.append('open_now', 'true');
    }

    // Location-based filtering
    if (filters.lat && filters.lng) {
      queryParams.append('lat', filters.lat.toString());
      queryParams.append('lng', filters.lng.toString());
      
      if (filters.radius) {
        queryParams.append('radius', filters.radius.toString());
      } else if (filters.maxDistance) {
        queryParams.append('radius', filters.maxDistance.toString());
      }
    }

    // Rating filter
    if (filters.ratingMin) {
      queryParams.append('min_rating', filters.ratingMin.toString());
    }

    // Call the backend API
    const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants?${queryParams.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    // Ensure we have valid data structure from various backend shapes
    let restaurants: any = [];
    if (Array.isArray(data)) {
      restaurants = data;
    } else if (Array.isArray(data?.restaurants)) {
      restaurants = data.restaurants;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data?.data)) {
        restaurants = data.data;
      } else if (Array.isArray(data?.data?.restaurants)) {
        restaurants = data.data.restaurants;
      } else if (Array.isArray((data as any)?.data?.data)) {
        // extremely defensive: sometimes wrapped twice
        restaurants = (data as any).data.data;
      }
    }
    // Try to extract a reliable total from backend meta or fields
    const backendTotal =
      (typeof data?.total === 'number' ? data.total : undefined) ??
      (typeof data?.meta?.total === 'number' ? data.meta.total : undefined) ??
      (Array.isArray(restaurants) ? restaurants.length : 0);
    
    // Sanitize image URLs before returning to frontend
    const sanitizedRestaurants = Array.isArray(restaurants) ? sanitizeRestaurantData(restaurants) : [];

    // Apply additional frontend-side filtering for parameters the backend may not support
    let filtered = [...sanitizedRestaurants];

    // Text search (if not already handled by backend)
    if (filters.q && !queryParams.has('query')) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter((r: any) =>
        r.name?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.state?.toLowerCase().includes(q) ||
        r.listing_type?.toLowerCase().includes(q) ||
        r.certifying_agency?.toLowerCase().includes(q)
      );
    }

    // Open now filtering (if not already handled by backend)
    if (filters.openNow && !queryParams.has('open_now')) {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      filtered = filtered.filter((r: any) => {
        const raw = r.hours_of_operation;
        if (!raw) {
          return false;
        }
        
        try {
          const hours = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!Array.isArray(hours)) {
            return false;
          }
          
          const today = hours.find((h: any) => h.day === currentDay);
          if (!today || !today.open || !today.close) {
            return false;
          }
          
                      const timeToMinutes = (timeStr: string): number => {
              const time = timeStr.toLowerCase().trim();
              const match = time.match(/(\d+):?(\d*)\s*(am|pm)/);
              if (!match || !match[1] || !match[3]) {
                return -1;
              }
              
              let hours = parseInt(match[1]);
              const minutes = match[2] ? parseInt(match[2]) : 0;
              const period = match[3];
              
              if (period === 'pm' && hours !== 12) {
                hours += 12;
              }
              if (period === 'am' && hours === 12) {
                hours = 0;
              }
              
              return hours * 60 + minutes;
          }
          
          const openM = timeToMinutes(today.open);
          const closeM = timeToMinutes(today.close);
          
          if (openM === -1 || closeM === -1) {
            return false;
          }
          
          return closeM < openM 
            ? (currentTime >= openM || currentTime <= closeM) 
            : (currentTime >= openM && currentTime <= closeM);
        } catch {
          return false;
        }
      });
    }

    // Distance filtering (if not already handled by backend)
    if (filters.lat && filters.lng && filters.radius && !queryParams.has('lat')) {
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

      filtered = filtered.filter((r: any) => {
        if (!r.latitude || !r.longitude) {
          return false;
        }
        const d = calculateDistanceMiles(Number(r.latitude), Number(r.longitude), filters.lat!, filters.lng!);
        return d <= filters.radius!;
      });

      // Sort by distance for better UX
      filtered.sort((a: any, b: any) => {
        const da = calculateDistanceMiles(Number(a.latitude), Number(a.longitude), filters.lat!, filters.lng!);
        const db = calculateDistanceMiles(Number(b.latitude), Number(b.longitude), filters.lat!, filters.lng!);
        return da - db;
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: backendTotal,
      page: filters.page || 1,
      limit: filters.limit || 50,
      filters,
    });

  } catch (error) {
    console.error('Error in restaurant search:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid filter parameters',
        errors: error.issues
      }, { status: 400 });
    }
    
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
        hours_open: "Sunday-Thursday: 11:00 AM - 9:00 PM, Friday: 11:00 AM - 2:00 PM, Closed Saturday"
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
        hours_open: "Sunday-Thursday: 8:00 AM - 8:00 PM, Friday: 8:00 AM - 2:00 PM, Closed Saturday"
      }
    ];
    
    const sanitizedMockRestaurants = sanitizeRestaurantData(mockRestaurants);
    
    return NextResponse.json({
      success: true,
      data: sanitizedMockRestaurants,
      total: sanitizedMockRestaurants.length,
      page: 1,
      limit: 50,
      fallback: true,
      message: 'Using fallback data - backend temporarily unavailable'
    });
  }
} 