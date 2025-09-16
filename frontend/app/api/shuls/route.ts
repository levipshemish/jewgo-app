import { NextRequest, NextResponse } from 'next/server';
import { type RealShul } from '@/lib/types/shul';

// Database connection configuration
const DATABASE_URL = "postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db";

// Function to fetch shuls data directly from database
async function fetchShulsFromDatabase(
  limit: number = 30,
  searchQuery?: string,
  userLat?: number,
  userLng?: number,
  radius?: number
): Promise<{ shuls: RealShul[]; total: number }> {
  try {
    // Use node-postgres to query the database directly
    const { Client } = require('pg');
    const client = new Client({
      connectionString: DATABASE_URL,
    });

    await client.connect();

    let query = `
      SELECT * FROM shuls 
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Add search filter if provided
    if (searchQuery && searchQuery.trim()) {
      query += ` AND (name ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`;
      params.push(`%${searchQuery.trim()}%`);
      paramIndex++;
    }

    // Add location-based filtering if coordinates provided
    if (userLat && userLng && radius) {
      // Use PostGIS distance calculation if available, otherwise skip location filtering
      query += ` AND latitude IS NOT NULL AND longitude IS NOT NULL`;
    }

    // Add ordering and limit
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await client.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM shuls WHERE is_active = true`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (searchQuery && searchQuery.trim()) {
      countQuery += ` AND (name ILIKE $${countParamIndex} OR city ILIKE $${countParamIndex} OR address ILIKE $${countParamIndex})`;
      countParams.push(`%${searchQuery.trim()}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    await client.end();

    // Transform database rows to RealShul type
    const shuls: RealShul[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      country: row.country,
      latitude: row.latitude ? parseFloat(row.latitude.toString()) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude.toString()) : undefined,
      phone_number: row.phone_number,
      website: row.website,
      email: row.email,
      shul_type: row.shul_type,
      shul_category: row.shul_category,
      denomination: row.denomination,
      business_hours: row.business_hours,
      hours_parsed: row.hours_parsed,
      timezone: row.timezone,
      has_daily_minyan: row.has_daily_minyan,
      has_shabbat_services: row.has_shabbat_services,
      has_holiday_services: row.has_holiday_services,
      has_women_section: row.has_women_section,
      has_mechitza: row.has_mechitza,
      has_separate_entrance: row.has_separate_entrance,
      distance: row.distance,
      distance_miles: row.distance_miles ? parseFloat(row.distance_miles.toString()) : undefined,
      rating: row.rating ? parseFloat(row.rating.toString()) : undefined,
      review_count: row.review_count || 0,
      star_rating: row.star_rating ? parseFloat(row.star_rating.toString()) : undefined,
      google_rating: row.google_rating ? parseFloat(row.google_rating.toString()) : undefined,
      image_url: row.image_url,
      logo_url: row.logo_url,
      has_parking: row.has_parking,
      has_disabled_access: row.has_disabled_access,
      has_kiddush_facilities: row.has_kiddush_facilities,
      has_social_hall: row.has_social_hall,
      has_library: row.has_library,
      has_hebrew_school: row.has_hebrew_school,
      has_adult_education: row.has_adult_education,
      has_youth_programs: row.has_youth_programs,
      has_senior_programs: row.has_senior_programs,
      rabbi_name: row.rabbi_name,
      rabbi_phone: row.rabbi_phone,
      rabbi_email: row.rabbi_email,
      religious_authority: row.religious_authority,
      community_affiliation: row.community_affiliation,
      kosher_certification: row.kosher_certification,
      membership_required: row.membership_required,
      membership_fee: row.membership_fee ? parseFloat(row.membership_fee.toString()) : undefined,
      fee_currency: row.fee_currency,
      accepts_visitors: row.accepts_visitors,
      visitor_policy: row.visitor_policy,
      is_active: row.is_active,
      is_verified: row.is_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags,
      admin_notes: row.admin_notes,
      specials: row.specials,
      listing_type: row.listing_type
    }));

    return { shuls, total };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse parameters
    const limit = parseInt(searchParams.get('limit') || '30');
    const searchQuery = searchParams.get('search') || undefined;
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 10; // Default 10 mile radius

    // Fetch shuls from database
    const { shuls, total } = await fetchShulsFromDatabase(limit, searchQuery, userLat, userLng, radius);

    // Return in the expected format
    return NextResponse.json({
      success: true,
      data: {
        shuls,
        synagogues: shuls, // Alias for compatibility
        total_count: total,
        total,
        page: 1,
        limit,
        has_more: shuls.length >= limit
      }
    });

  } catch (error) {
    console.error('Error fetching shuls:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
