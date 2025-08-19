'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import ActionButtons from '@/components/layout/ActionButtons';
import { BottomNavigation } from '@/components/navigation/ui';
import MarketplaceCategoryTabs from '@/components/navigation/ui/MarketplaceCategoryTabs';

import { EateryCard } from '@/components/eatery/ui';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { Restaurant } from '@/lib/types/restaurant';

export default function MarketplacePage() {
  const router = useRouter();

  const [listings, setListings] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [marketplaceAvailable, setMarketplaceAvailable] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    kind: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    region: ''
  });

  // Load initial listings
  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async (page = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: 20,
        offset: (page - 1) * 20,
        search: searchQuery || undefined,
        category: filters.category || undefined,
        subcategory: filters.subcategory || undefined,
        kind: filters.kind || undefined,
        condition: filters.condition || undefined,
        min_price: filters.minPrice ? parseInt(filters.minPrice) * 100 : undefined, // Convert to cents
        max_price: filters.maxPrice ? parseInt(filters.maxPrice) * 100 : undefined,
        city: filters.city || undefined,
        region: filters.region || undefined
      };

      // Build query parameters for restaurant filtering
      const queryParams = new URLSearchParams();
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      if (filters.category) {
        queryParams.append('listing_type', filters.category);
      }
      if (filters.city) {
        queryParams.append('city', filters.city);
      }
      
      const response = await fetchRestaurants(200, queryParams.toString());
      const newListings = response.restaurants || [];
      
      if (append) {
        setListings(prev => [...prev, ...newListings]);
      } else {
        setListings(newListings);
      }
      
      setHasMore(newListings.length === 20);
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to load marketplace listings');
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    loadListings(1, false);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    loadListings(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadListings(currentPage + 1, true);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Filter by listing type based on tab (same as eatery page)
    let category = '';
    switch (tab) {
      case 'restaurant':
        category = 'restaurant';
        break;
      case 'bakery':
        category = 'bakery';
        break;
      case 'catering':
        category = 'catering';
        break;
      default:
        category = '';
    }
    
    setFilters(prev => ({ ...prev, category }));
    setCurrentPage(1);
    loadListings(1, false);
  };

  const handleListingClick = (listing: Restaurant) => {
    router.push(`/restaurant/${listing.id}`);
  };



  const handleShowFilters = () => {
    setShowFilters(true);
  };

  // Show marketplace not available message
  if (!marketplaceAvailable) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🛍️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Marketplace Coming Soon!
            </h1>
            <p className="text-gray-600 mb-6">
              Our marketplace feature is currently under development. We&apos;re working hard to bring you a great buying and selling experience for kosher items.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">What&apos;s Coming:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Buy and sell kosher items</li>
                <li>• Vehicle and appliance listings</li>
                <li>• Gemach (free loan) items</li>
                <li>• Location-based search</li>
                <li>• Secure transactions</li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header with Logo and Search */}
      <Header
        onSearch={handleSearch}
        placeholder="Search restaurants..."
        showFilters={true}
        onShowFilters={handleShowFilters}
      />

      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <MarketplaceCategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onShowFilters={handleShowFilters}
        onShowMap={() => router.push('/live-map')}
        onAddEatery={() => router.push('/add-eatery')}
      />



      {/* Listings */}
      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading && listings.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🍽️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search or filters'
                : 'No restaurants available in this area'
              }
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <EateryCard
                key={listing.id}
                restaurant={listing}
                className="w-full"
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Load More Listings
            </button>
          </div>
        )}

        {loading && listings.length > 0 && (
          <div className="mt-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
