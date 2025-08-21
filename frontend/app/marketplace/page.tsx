'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import { BottomNavigation, CategoryTabs } from '@/components/navigation/ui';
import { UnifiedCard } from '@/components/ui/UnifiedCard';

import MarketplaceActionBar from '@/components/marketplace/MarketplaceActionBar';
import MarketplaceCategoriesDropdown from '@/components/marketplace/MarketplaceCategoriesDropdown';
import MarketplaceFilters from '@/components/marketplace/MarketplaceFilters';
import { fetchMarketplaceListings } from '@/lib/api/marketplace';
import { MarketplaceListing, MarketplaceCategory, MarketplaceFilters as MarketplaceFiltersType } from '@/lib/types/marketplace';

// Transform marketplace listing data to UnifiedCard format
const transformMarketplaceToCardData = (listing: MarketplaceListing) => {
  // Format price from cents to dollars
  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(0)}`;
  };

  // Format condition for display
  const formatCondition = (condition: string) => {
    switch (condition) {
      case 'new': return 'New';
      case 'used_like_new': return 'Like New';
      case 'used_good': return 'Good';
      case 'used_fair': return 'Fair';
      default: return condition;
    }
  };

  return {
    id: listing.id,
    imageUrl: listing.thumbnail || listing.images?.[0],
    imageTag: listing.category_name || listing.kind,
    imageTagLink: `/marketplace?category=${listing.category_id}`,
    title: listing.title,
    badge: listing.rating ? listing.rating.toString() : undefined,
    subtitle: formatPrice(listing.price_cents),
    additionalText: formatCondition(listing.condition),
    showHeart: true,
    isLiked: false // This will be handled by the component internally
  };
};

export default function MarketplacePage() {
  const router = useRouter();

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [showFilters, setShowFilters] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [marketplaceAvailable, setMarketplaceAvailable] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState<MarketplaceFiltersType>({
    category: '',
    subcategory: '',
    kind: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    region: ''
  });
  
  // Selected category state
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | undefined>();

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

  const handleFilterChange = (newFilters: MarketplaceFiltersType) => {
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
    
    // Handle navigation to different pages based on the selected tab
    switch (tab) {
      case 'mikvahs':
        router.push('/mikvahs');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      case 'marketplace':
        // Already on marketplace page, just update the tab
        break;
      default:
        break;
    }
  };

  const handleSell = () => {
    router.push('/marketplace/add');
  };

  const handleShowCategories = () => {
    setShowCategories(true);
  };

  const handleShowFilters = () => {
    setShowFilters(true);
  };

  const handleCategorySelect = (category: MarketplaceCategory) => {
    setSelectedCategory(category);
    if (category.id) {
      setFilters(prev => ({
        ...prev,
        category: category.name
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        category: ''
      }));
    }
    setCurrentPage(1);
    loadListings(1, false);
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
        placeholder="Search marketplace listings..."
        showFilters={true}
        onShowFilters={handleShowFilters}
      />

      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Marketplace Action Bar */}
      <MarketplaceActionBar
        onSell={handleSell}
        onShowCategories={handleShowCategories}
        onShowFilters={handleShowFilters}
      />



      {/* Listings */}
      <div className="px-4 py-4">
        <div className="max-w-7xl lg:max-w-none mx-auto">
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
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {listings.map(listing => (
                <div key={listing.id}>
                  <UnifiedCard
                    data={transformMarketplaceToCardData(listing)}
                    variant="default"
                    onCardClick={() => router.push(`/marketplace/${listing.id}`)}
                    onLikeToggle={(id, isLiked) => {
                      // Handle like toggle - you can add your like logic here
                      console.log(`Marketplace listing ${id} ${isLiked ? 'liked' : 'unliked'}`);
                    }}
                    onTagClick={(tagLink, event) => {
                      event.preventDefault();
                      // Handle tag click - you can add navigation logic here
                      console.log('Tag clicked:', tagLink);
                    }}
                    className="w-full"
                  />
                </div>
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
      </div>

      {/* Categories Dropdown */}
      <MarketplaceCategoriesDropdown
        isOpen={showCategories}
        onClose={() => setShowCategories(false)}
        onCategorySelect={handleCategorySelect}
        selectedCategory={selectedCategory}
      />

      {/* Filters Modal */}
      <MarketplaceFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFilterChange}
        currentFilters={filters}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
