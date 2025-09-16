import { NextRequest, NextResponse } from 'next/server';
import { type RealMikvah } from '@/lib/types/mikvah';

// Database connection configuration
const DATABASE_URL = "postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db";

// Function to fetch mikvah data directly from database
async function fetchMikvahFromDatabase(mikvahId: number): Promise<RealMikvah | null> {
  try {
    // Use node-postgres to query the database directly
    const { Client } = require('pg');
    const client = new Client({
      connectionString: DATABASE_URL,
    });

    await client.connect();

    const query = `
      SELECT * FROM mikvah 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await client.query(query, [mikvahId]);
    await client.end();

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Transform database row to RealMikvah type
    const mikvah: RealMikvah = {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      phone_number: row.phone_number,
      website: row.website,
      email: row.email,
      mikvah_type: row.mikvah_type,
      mikvah_category: row.mikvah_category,
      business_hours: row.business_hours,
      requires_appointment: row.requires_appointment,
      appointment_phone: row.appointment_phone,
      appointment_website: row.appointment_website,
      walk_in_available: row.walk_in_available,
      advance_booking_days: row.advance_booking_days,
      distance: row.distance,
      distance_miles: row.distance_miles ? parseFloat(row.distance_miles) : undefined,
      rating: row.rating ? parseFloat(row.rating) : undefined,
      review_count: row.review_count || 0,
      star_rating: row.star_rating ? parseFloat(row.star_rating) : undefined,
      google_rating: row.google_rating ? parseFloat(row.google_rating) : undefined,
      image_url: row.image_url,
      logo_url: row.logo_url,
      has_changing_rooms: row.has_changing_rooms,
      has_shower_facilities: row.has_shower_facilities,
      has_towels_provided: row.has_towels_provided,
      has_soap_provided: row.has_soap_provided,
      has_hair_dryers: row.has_hair_dryers,
      has_private_entrance: row.has_private_entrance,
      has_disabled_access: row.has_disabled_access,
      has_parking: row.has_parking,
      rabbinical_supervision: row.rabbinical_supervision,
      kosher_certification: row.kosher_certification,
      community_affiliation: row.community_affiliation,
      religious_authority: row.religious_authority,
      fee_amount: row.fee_amount ? parseFloat(row.fee_amount) : undefined,
      fee_currency: row.fee_currency,
      accepts_credit_cards: row.accepts_credit_cards,
      accepts_cash: row.accepts_cash,
      accepts_checks: row.accepts_checks,
      is_active: row.is_active,
      is_verified: row.is_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags,
      admin_notes: row.admin_notes,
      specials: row.specials,
      listing_type: row.listing_type,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined
    };

    return mikvah;
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
    const mikvahId = parseInt(id);
    
    if (isNaN(mikvahId)) {
      return NextResponse.json(
        { error: 'Invalid mikvah ID' },
        { status: 400 }
      );
    }

    // Fetch real mikvah data from database
    const mikvahData = await fetchMikvahFromDatabase(mikvahId);
    
    if (!mikvahData) {
      return NextResponse.json(
        { error: `Mikvah not found`, message: `We couldn't find a mikvah with ID "${mikvahId}"` },
        { status: 404 }
      );
    }

    // Return raw mikvah data - transformation will be done on the client side
    return NextResponse.json({
      success: true,
      data: mikvahData
    });

  } catch (error) {
    console.error('Error fetching mikvah:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
