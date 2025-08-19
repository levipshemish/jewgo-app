'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import { BottomNavigation } from '@/components/navigation/ui';
import MarketplaceSearch from '@/components/marketplace/MarketplaceSearch';
import MarketplaceFilters from '@/components/marketplace/MarketplaceFilters';
import MarketplaceListingCard from '@/components/marketplace/MarketplaceListingCard';
import { fetchMarketplaceListings } from '@/lib/api/marketplace';
import { MarketplaceListing } from '@/lib/types/marketplace';


export default function MarketplacePage() {
  const router = useRouter();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
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

      const response = await fetchMarketplaceListings(params);
      
      if (response.success && response.data?.listings) {
        const newListings = response.data.listings;
        
        // Check if marketplace is available (not empty due to "not yet available" message)
        if (newListings.length === 0 && (response.data as any).message === 'Marketplace is not yet available') {
          setMarketplaceAvailable(false);
          setListings([]);
          setHasMore(false);
        } else {
          setMarketplaceAvailable(true);
          if (append) {
            setListings(prev => [...prev, ...newListings]);
          } else {
            setListings(newListings);
          }
          
          setHasMore(newListings.length === 20);
          setCurrentPage(page);
        }
      } else {
        setError(response.error || 'Failed to load listings');
      }
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
    
    // Filter by listing kind based on tab
    let kind = '';
    switch (tab) {
      case 'regular':
        kind = 'regular';
        break;
      case 'vehicle':
        kind = 'vehicle';
        break;
      case 'appliance':
        kind = 'appliance';
        break;
      default:
        kind = '';
    }
    
    setFilters(prev => ({ ...prev, kind }));
    setCurrentPage(1);
    loadListings(1, false);
  };

  const handleListingClick = (listing: MarketplaceListing) => {
    router.push(`/marketplace/${listing.id}`);
  };

  const handleAddListing = () => {
    router.push('/marketplace/add');
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Search and Filters */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <MarketplaceSearch 
            onSearch={handleSearch}
            placeholder="Search marketplace listings..."
          />
          
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              Filters
            </button>
            
            <button
              onClick={handleAddListing}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Listing
            </button>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {[
            { id: 'all', label: 'All Items', icon: '🛍️' },
            { id: 'regular', label: 'Regular', icon: '📦' },
            { id: 'vehicle', label: 'Vehicles', icon: '🚗' },
            { id: 'appliance', label: 'Appliances', icon: '🏠' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200">
          <MarketplaceFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

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
            <div className="text-gray-400 text-6xl mb-4">🛍️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search or filters'
                : 'Be the first to add a listing!'
              }
            </p>
            {!searchQuery && !Object.values(filters).some(f => f) && (
              <button
                onClick={handleAddListing}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Your First Listing
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                onClick={() => handleListingClick(listing)}
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
