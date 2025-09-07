'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs } from '@/components/core';
import { ActionButtons } from '@/components/layout';
import { ShulBottomNavigation } from '@/components/shuls';
import Card from '@/components/core/cards/Card';
import { generateMockShtetl, type MockShtetl } from '@/lib/mockData/shtetl';

// Types
interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  condition: string;
  category_name: string;
  city: string;
  region: string;
  seller_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  images: string[];
  thumbnail: string;
  distance?: string;
  distance_miles?: number;
}

interface MarketplaceResponse {
  success: boolean;
  data: {
    listings: MarketplaceListing[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

// Fetch marketplace listings
async function fetchMarketplaceListings(limit: number = 50, offset: number = 0): Promise<MarketplaceListing[]> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    // Use unified API endpoint
    const { unifiedApiCall } = await import('@/lib/utils/unified-api');
    const result = await unifiedApiCall(`/api/marketplace/unified?${params.toString()}`, {
      ttl: 30 * 1000, // 30 seconds cache (marketplace changes frequently)
      deduplicate: true,
      retry: true,
      retryAttempts: 2,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch marketplace listings');
    }

    const data = result.data;
    
    if (data.success && (data.products || data.listings)) {
      return data.products || data.listings || [];
    } else {
      throw new Error(data.message || 'Failed to fetch marketplace listings');
    }
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    throw error;
  }
}

// Map MockShtetl to MarketplaceListing
function mapShtetlToMarketplaceListing(shtetl: MockShtetl): MarketplaceListing {
  return {
    id: shtetl.id.toString(),
    title: shtetl.title,
    description: shtetl.description || '',
    price_cents: 0, // MockShtetl doesn't have price info
    currency: 'USD',
    condition: 'new',
    category_name: shtetl.category || 'General',
    city: shtetl.city || '',
    region: shtetl.state || '',
    seller_name: 'Community',
    status: shtetl.is_active ? 'active' : 'inactive',
    created_at: shtetl.created_at || new Date().toISOString(),
    updated_at: shtetl.updated_at || new Date().toISOString(),
    images: shtetl.image_url ? [shtetl.image_url] : [],
    thumbnail: shtetl.image_url || '',
    distance: shtetl.distance,
    distance_miles: shtetl.distance_miles,
  };
}

// Map marketplace listing to unified card data
function mapMarketplaceToListingData(listing: MarketplaceListing) {
  return {
    id: listing.id,
    title: listing.title,
    imageUrl: listing.thumbnail || listing.images?.[0] || '/images/default-restaurant.webp',
    subtitle: listing.description || '',
    additionalText: listing.distance || `${listing.city}, ${listing.region}`,
    showHeart: true,
    isLiked: false,
    kosherCategory: listing.category_name || '',
    city: listing.city || '',
    imageTag: listing.category_name || '',
    badge: listing.category_name || '',
  };
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState(false); // Track if backend is accessible
  const [activeTab, setActiveTab] = useState('marketplace');
  const [showFilters, setShowFilters] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load marketplace listings
  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      setBackendError(false);
      const data = await fetchMarketplaceListings(50, 0);
      setListings(data);
    } catch (err) {
      console.error('Error loading marketplace listings:', err);
      
      // Switch to mock data after error
      console.log('Backend unreachable, switching to mock data');
      setBackendError(true);
      setError(null); // Clear error since we're showing mock data
      
      // Fall back to mock data
      const mockListings = generateMockShtetl(24);
      setListings(mockListings.map(mapShtetlToMarketplaceListing));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  // Handle search
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // TODO: Implement search functionality
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Navigate to the appropriate page
    switch (tab) {
      case 'eatery':
        router.push('/eatery');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'marketplace':
        router.push('/marketplace');
        break;
      case 'shtel':
        router.push('/shtel');
        break;
      case 'stores':
        router.push('/stores');
        break;
      case 'mikvah':
        router.push('/mikvah');
        break;
      default:
        break;
    }
  };

  // Handle show filters
  const handleShowFilters = () => {
    setShowFilters(true);
  };

  // Handle close filters
  const handleCloseFilters = () => {
    setShowFilters(false);
  };

  // Handle filter apply
  const handleFilterApply = (filters: any) => {
    console.log('Applied filters:', filters);
      setShowFilters(false);
    // TODO: Implement filter functionality
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onSearch={handleSearch} placeholder="Find items in the marketplace" />
      
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        <ActionButtons 
          onShowFilters={handleShowFilters}
          onShowMap={() => console.log("View map")}
          onAddEatery={() => console.log("Create listing")}
          addButtonText="Add Listing"
        />
      </div>

      <div 
        ref={scrollContainerRef}
        className="overflow-y-auto pb-4" 
        style={{ 
          height: 'calc(100vh - 64px - 64px - 64px - 160px)', 
          maxHeight: 'calc(100vh - 64px - 64px - 64px - 160px)' 
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error && !backendError ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={loadListings}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No marketplace listings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="px-4 py-4">
            {/* Backend Status Indicator */}
            {backendError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Backend Service Unavailable
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Showing sample data. Real marketplace listings will appear when the backend is accessible.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {listings.map((listing, index) => (
                <div key={`listing-${listing.id}-${index}`}>
                  <Card
                    data={mapMarketplaceToListingData(listing)}
                    variant="default"
                    showStarInBadge={true}
                    onCardClick={() => router.push(`/marketplace/${listing.id}`)}
                    priority={false}
                    className="w-full h-full"
                  />
                </div>
              ))}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {/* End of Results */}
            {!loading && listings.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Showing all {listings.length} marketplace listings
              </div>
            )}
          </div>
        )}
      </div>

      <ShulBottomNavigation />

      {/* Filter Popup */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Filter Marketplace</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select className="w-full p-2 border rounded">
                  <option value="">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Garden</option>
                  <option value="judaica">Judaica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Condition</label>
                <select className="w-full p-2 border rounded">
                  <option value="">All Conditions</option>
                  <option value="new">New</option>
                  <option value="used_like_new">Like New</option>
                  <option value="used_good">Good</option>
                  <option value="used_fair">Fair</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price Range</label>
                <div className="flex space-x-2">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="flex-1 p-2 border rounded"
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="flex-1 p-2 border rounded"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button 
                onClick={handleCloseFilters}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleFilterApply({})}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}