'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import MarketplaceSearch from '@/components/marketplace/MarketplaceSearch';
import MarketplaceFilters from '@/components/marketplace/MarketplaceFilters';
import MarketplaceListingCard from '@/components/marketplace/MarketplaceListingCard';
import { fetchMarketplaceListings } from '@/lib/api/marketplace';
import { MarketplaceListing } from '@/lib/types/marketplace';
import { scrollToTop } from '@/lib/utils/scrollUtils';

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
  
  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    listingType: '',
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
        type: filters.listingType || undefined,
        condition: filters.condition || undefined,
        min_price: filters.minPrice ? parseInt(filters.minPrice) * 100 : undefined, // Convert to cents
        max_price: filters.maxPrice ? parseInt(filters.maxPrice) * 100 : undefined,
        city: filters.city || undefined,
        region: filters.region || undefined
      };

      const response = await fetchMarketplaceListings(params);
      
      if (response.success && response.data?.listings) {
        const newListings = response.data.listings;
        
        if (append) {
          setListings(prev => [...prev, ...newListings]);
        } else {
          setListings(newListings);
        }
        
        setHasMore(newListings.length === 20);
        setCurrentPage(page);
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
    
    // Filter by listing type based on tab
    let listingType = '';
    switch (tab) {
      case 'sale':
        listingType = 'sale';
        break;
      case 'free':
        listingType = 'free';
        break;
      case 'borrow':
        listingType = 'borrow';
        break;
      case 'gemach':
        listingType = 'gemach';
        break;
      default:
        listingType = '';
    }
    
    setFilters(prev => ({ ...prev, listingType }));
    setCurrentPage(1);
    loadListings(1, false);
  };

  const handleListingClick = (listing: MarketplaceListing) => {
    router.push(`/marketplace/${listing.id}`);
  };

  const handleAddListing = () => {
    router.push('/marketplace/add');
  };

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
        {/* <CategoryTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        /> */}
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
