import { NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Return static filter options to avoid authentication issues
    // These can be updated periodically or fetched from a different source
    const filterOptions = {
      cities: [
        "Miami Beach", "Surfside", "Hollywood", "Aventura", "North Miami Beach",
        "Fort Lauderdale", "Boca Raton", "Hallandale Beach", "Miami Gardens"
      ],
      states: ["FL"],
      agencies: [
        "Kosher Miami", "ORB", "OU", "Star-K", "CRC", "Kof-K", "OK Kosher"
      ],
      listingTypes: ["Restaurant", "Bakery", "Catering", "Cafe", "Deli"],
      priceRanges: ["$", "$$", "$$$", "$$$$"],
      kosherCategories: ["Dairy", "Meat", "Pareve"],
      counts: {
        cities: {
          "Miami Beach": 25, "Surfside": 15, "Hollywood": 20, "Aventura": 18,
          "North Miami Beach": 12, "Fort Lauderdale": 8, "Boca Raton": 5,
          "Hallandale Beach": 3, "Miami Gardens": 2
        },
        states: { "FL": 207 },
        agencies: {
          "Kosher Miami": 150, "ORB": 45, "OU": 8, "Star-K": 2, "CRC": 1, "Kof-K": 1
        },
        listingTypes: {
          "Restaurant": 180, "Bakery": 15, "Catering": 8, "Cafe": 3, "Deli": 1
        },
        priceRanges: {
          "$": 45, "$$": 120, "$$$": 35, "$$$$": 7
        },
        kosherCategories: {
          "Dairy": 95, "Meat": 85, "Pareve": 27
        },
        total: 207
      }
    };

    return NextResponse.json({
      success: true,
      data: filterOptions
    });

  } catch (error) {
    console.error('Error in filter options API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load filter options' },
      { status: 500 }
    );
  }
} 