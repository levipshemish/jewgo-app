import { NextRequest, NextResponse } from 'next/server';
import { transformShulToListing, type RealShul } from '@/lib/types/shul';

// Database connection configuration
const DATABASE_URL = "postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db";

// This would typically come from your location context or user preferences
const getUserLocation = (): { latitude: number; longitude: number } | null => {
  // For now, return null - in a real app you'd get this from user location
  // or from request headers/cookies
  return null;
};

// Function to fetch shul data directly from database
async function fetchShulFromDatabase(shulId: number): Promise<RealShul | null> {
  try {
    // Use node-postgres to query the database directly
    const { Client } = require('pg');
    const client = new Client({
      connectionString: DATABASE_URL,
    });

    await client.connect();

    const query = `
      SELECT * FROM shuls 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await client.query(query, [shulId]);
    await client.end();

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Transform database row to RealShul type
    const shul: RealShul = {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      country: row.country,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
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
      distance_miles: row.distance_miles ? parseFloat(row.distance_miles) : undefined,
      rating: row.rating ? parseFloat(row.rating) : undefined,
      review_count: row.review_count,
      star_rating: row.star_rating ? parseFloat(row.star_rating) : undefined,
      google_rating: row.google_rating ? parseFloat(row.google_rating) : undefined,
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
      membership_fee: row.membership_fee ? parseFloat(row.membership_fee) : undefined,
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
    };

    return shul;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shulId = parseInt(id);
    
    if (isNaN(shulId)) {
      return NextResponse.json(
        { error: 'Invalid shul ID' },
        { status: 400 }
      );
    }

    // Fetch real shul data from database
    const shulData = await fetchShulFromDatabase(shulId);
    
    if (!shulData) {
      return NextResponse.json(
        { error: `Synagogue not found`, message: `We couldn't find a synagogue with ID "${shulId}"` },
        { status: 404 }
      );
    }

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
