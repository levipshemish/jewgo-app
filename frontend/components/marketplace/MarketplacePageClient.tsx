'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Heart, Filter, Grid, List, Star, TrendingUp, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import { MarketplaceAPI } from '@/lib/api/marketplace';
import { 
  MarketplaceProduct, 
  MarketplaceCategory, 
  MarketplaceFilters as MarketplaceFiltersType,
  MarketplaceStats 
} from '@/lib/types/marketplace';
import ProductCard from './ProductCard';
import CategoryCard from './CategoryCard';
import MarketplaceFiltersComponent from './MarketplaceFilters';

export default function MarketplacePageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<MarketplaceProduct[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [filters, setFilters] = useState<MarketplaceFiltersType>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [cart, setCart] = useState<MarketplaceProduct[]>([]);
  const [wishlist, setWishlist] = useState<MarketplaceProduct[]>([]);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      loadFilteredProducts();
    }
  }, [filters]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, featuredData, statsData] = await Promise.all([
        MarketplaceAPI.getProducts(),
        MarketplaceAPI.getCategories(),
        MarketplaceAPI.getFeaturedProducts(),
        MarketplaceAPI.getStats()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setFeaturedProducts(featuredData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredProducts = async () => {
    try {
      const filteredProducts = await MarketplaceAPI.getProducts(filters);
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to load filtered products:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMarketplaceData();
      return;
    }

    try {
      const searchResults = await MarketplaceAPI.search(searchQuery, filters);
      setProducts(searchResults.products);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'mikvahs':
        router.push('/mikvahs');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'marketplace':
        // Already on marketplace page
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      default:
        break;
    }
  };

  const handleAddToCart = (product: MarketplaceProduct) => {
    setCart(prev => [...prev, product]);
    // You could also show a toast notification here
  };

  const handleAddToWishlist = (product: MarketplaceProduct) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const handleCategoryClick = (category: MarketplaceCategory) => {
    router.push(`/marketplace/category/${category.id}`);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleFiltersChange = (newFilters: MarketplaceFiltersType) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading marketplace...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <Header />
      
      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="What do you want to find?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar - Sell, Category, My Messages */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Sell
          </button>
          
          <button className="flex-1 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 transition-colors">
            Category
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button className="flex-1 bg-white text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            My messages
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <MarketplaceFiltersComponent
              filters={filters}
              categories={categories}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats Banner - Simplified */}
        {stats && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">{stats.totalProducts}</div>
                <div className="text-xs text-gray-500">Products</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{stats.totalVendors}</div>
                <div className="text-xs text-gray-500">Vendors</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{stats.totalCategories}</div>
                <div className="text-xs text-gray-500">Categories</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{stats.averageRating.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Section - More compact */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <button 
              onClick={() => router.push('/marketplace/categories')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {categories.slice(0, 4).map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        </div>

        {/* Featured Products - Tighter grid */}
        {featuredProducts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900">Featured</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="featured"
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Products - Marketplace style grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
                          <h2 className="text-lg font-semibold text-gray-900">
                Today&apos;s Picks
              </h2>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Miami Gardens, FL</span>
            </div>
          </div>
          
          {products.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🛍️</div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-sm text-gray-600 mb-3">
                {searchQuery 
                  ? `No products match "${searchQuery}"`
                  : 'No products available'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadMarketplaceData();
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className={`grid gap-3 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                : 'grid-cols-1'
            }`}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant={viewMode === 'list' ? 'compact' : 'default'}
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
