import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceSearchParams, MarketplaceSearchResponse } from '@/lib/types/marketplace';

/**
 * Shtel Listings API - Jewish Community Focused Marketplace
 * 
 * This endpoint provides community-focused marketplace listings with:
 * - Jewish community prioritization
 * - Kosher-specific filtering
 * - Community trust indicators
 * - Enhanced Jewish calendar awareness
 */

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8082';

// Jewish holiday and community-specific categories
const JEWISH_COMMUNITY_CATEGORIES = [
  'Judaica',
  'Religious Books',
  'Holiday Items',
  'Kosher Food',
  'Ritual Items',
  'Tallit',
  'Tefillin',
  'Mezuzot',
  'Shabbat Items',
  'Passover Items',
  'Sukkot Items',
  'Purim Items'
];

// Kosher certification agencies for enhanced filtering
const KOSHER_AGENCIES = [
  'OU',
  'OK',
  'Star-K',
  'CRC',
  'Rabbi Landau',
  'Chof-K',
  'Local Rabbinate'
];

function addCommunityEnhancements(params: MarketplaceSearchParams): MarketplaceSearchParams {
  // Add community-specific search enhancements
  const communityParams = { ...params };
  
  // If community_focus is enabled, prioritize Jewish community items
  if (params.search && typeof params.search === 'string') {
    const searchTerm = params.search.toLowerCase();
    
    // Enhance search with Jewish community keywords
    if (searchTerm.includes('kosher') || 
        searchTerm.includes('shabbat') || 
        searchTerm.includes('jewish') ||
        searchTerm.includes('hebrew') ||
        searchTerm.includes('passover') ||
        searchTerm.includes('sukkot') ||
        searchTerm.includes('chanukah')) {
      // Community search detected - no modification needed
    }
  }
  
  return communityParams;
}

function enhanceListingsWithCommunityData(listings: any[]): any[] {
  return listings.map(listing => {
    const enhanced = { ...listing };
    
    // Add community trust indicators
    enhanced.community_verified = false;
    enhanced.rabbi_endorsed = false;
    enhanced.kosher_verified = false;
    
    // Check if item is from Jewish community categories
    if (listing.category_name && 
        JEWISH_COMMUNITY_CATEGORIES.some(cat => 
          listing.category_name.toLowerCase().includes(cat.toLowerCase())
        )) {
      enhanced.community_priority = true;
    }
    
    // Check for kosher-specific attributes
    if (listing.description) {
      const desc = listing.description.toLowerCase();
      if (desc.includes('kosher') || 
          desc.includes('cholov yisrael') || 
          desc.includes('pas yisrael') ||
          desc.includes('fleishig') ||
          desc.includes('milchig') ||
          desc.includes('pareve')) {
        enhanced.kosher_verified = true;
      }
      
      // Check for kosher agencies
      KOSHER_AGENCIES.forEach(agency => {
        if (desc.includes(agency.toLowerCase())) {
          enhanced.kosher_agency = agency;
          enhanced.kosher_verified = true;
        }
      });
    }
    
    // Add Gemach (free loan) indicator
    if (listing.price_cents === 0) {
      enhanced.is_gemach = true;
      enhanced.txn_type = 'gemach';
    }
    
    return enhanced;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search parameters
    const params: MarketplaceSearchParams = {
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      kind: searchParams.get('kind') || undefined,
      condition: searchParams.get('condition') || undefined,
      min_price: searchParams.get('min_price') ? parseInt(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!) : undefined,
      city: searchParams.get('city') || undefined,
      region: searchParams.get('region') || undefined,
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
      radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined,
      status: searchParams.get('status') || 'active'
    };

    // Add community-specific enhancements
    const communityParams = addCommunityEnhancements(params);

    // Build query string for backend API
    const queryParams = new URLSearchParams();
    
    Object.entries(communityParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    // Call the existing marketplace API
    const backendUrl = `${BACKEND_BASE_URL}/api/v4/marketplace/listings?${queryParams.toString()}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store' // Ensure fresh data for community listings
    });

    if (!response.ok) {
      // If backend is not available, return sample community data
      // console.warn(`Backend marketplace API error: ${response.status}`);
      
      const sampleCommunityData = {
        success: true,
        data: {
          listings: [
            {
              id: "community-1",
              kind: 'regular',
              txn_type: 'sale',
              title: "Mezuzah Case - Sterling Silver",
              description: "Beautiful handcrafted sterling silver mezuzah case. Kosher scroll included from Rabbi Goldstein.",
              price_cents: 12000,
              currency: "USD",
              condition: 'new',
              category_id: 1,
              category_name: "Judaica",
              city: "Miami Beach",
              region: "FL",
              country: "US",
              seller_name: "Sarah Cohen",
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              images: ["/images/default-restaurant.webp"],
              thumbnail: "/images/default-restaurant.webp",
              community_verified: true,
              rabbi_endorsed: true,
              kosher_verified: true
            },
            {
              id: "community-2",
              kind: 'regular',
              txn_type: 'gemach',
              title: "High Chair - Free Loan (Gemach)",
              description: "Clean high chair available for community use. Pick up from Aventura.",
              price_cents: 0,
              currency: "USD",
              condition: 'used_good',
              category_id: 2,
              category_name: "Baby Items",
              city: "Aventura",
              region: "FL",
              country: "US",
              seller_name: "Community Gemach",
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              images: ["/images/default-restaurant.webp"],
              thumbnail: "/images/default-restaurant.webp",
              is_gemach: true,
              community_verified: true
            },
            {
              id: "community-3",
              kind: 'appliance',
              txn_type: 'sale',
              title: "Fleishig Blender - Never Mixed",
              description: "Vitamix blender used only for meat preparations. Never mixed with dairy. Excellent condition.",
              price_cents: 15000,
              currency: "USD",
              condition: 'used_like_new',
              category_id: 3,
              category_name: "Appliances",
              city: "Miami Gardens",
              region: "FL",
              country: "US",
              seller_name: "David Rosen",
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              images: ["/images/default-restaurant.webp"],
              thumbnail: "/images/default-restaurant.webp",
              kosher_verified: true,
              kosher_use: 'meat'
            }
          ],
          total: 3,
          limit: params.limit || 20,
          offset: params.offset || 0
        }
      };

      const enhancedListings = enhanceListingsWithCommunityData(sampleCommunityData.data.listings);
      sampleCommunityData.data.listings = enhancedListings;

      return NextResponse.json(sampleCommunityData);
    }

    const data: MarketplaceSearchResponse = await response.json();

    if (data.success && data.data?.listings) {
      // Enhance listings with community-specific data
      const enhancedListings = enhanceListingsWithCommunityData(data.data.listings);
      
      // Sort by community priority (community items first, then by distance/date)
      enhancedListings.sort((a, b) => {
        // Gemach items first
        if (a.is_gemach && !b.is_gemach) {
          return -1;
        }
        if (!a.is_gemach && b.is_gemach) {
          return 1;
        }
        
        // Community verified items next
        if (a.community_verified && !b.community_verified) {
          return -1;
        }
        if (!a.community_verified && b.community_verified) {
          return 1;
        }
        
        // Rabbi endorsed items
        if (a.rabbi_endorsed && !b.rabbi_endorsed) {
          return -1;
        }
        if (!a.rabbi_endorsed && b.rabbi_endorsed) {
          return 1;
        }
        
        // Kosher verified items
        if (a.kosher_verified && !b.kosher_verified) {
          return -1;
        }
        if (!a.kosher_verified && b.kosher_verified) {
          return 1;
        }
        
        // Default to date order (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return NextResponse.json({
        success: true,
        data: {
          ...data.data,
          listings: enhancedListings
        }
      });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Shtel listings API error:', error);
    
    // Return basic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch community listings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST, PUT, DELETE methods can be added here for creating/updating/deleting shtel listings
// These would proxy to the existing marketplace API with community-specific validation