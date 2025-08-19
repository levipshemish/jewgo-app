'use client';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

import { ArrowLeft, Search, Filter, Grid, List } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';

import ProductCard from '@/components/marketplace/ProductCard';
import { BottomNavigation } from '@/components/navigation/ui';
import { MarketplaceAPI } from '@/lib/api/marketplace';
import { MarketplaceListing, MarketplaceCategory, MarketplaceFilters as MarketplaceFiltersType } from '@/lib/types/marketplace';

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params?.id as string;
  
  const [category, setCategory] = useState<MarketplaceCategory | null>(null);
  const [products, setProducts] = useState<MarketplaceListing[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (categoryId) {
      loadCategoryData();
    }
  }, [categoryId]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      const [categoryData, productsData, categoriesData] = await Promise.all([
        MarketplaceAPI.getCategory(categoryId),
        MarketplaceAPI.getCategoryProducts(categoryId),
        MarketplaceAPI.fetchCategories()
      ]);

      setCategory(categoryData);
      setProducts(productsData);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Failed to load category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCategoryData();
      return;
    }

    try {
      const searchResults = await MarketplaceAPI.search(searchQuery, {
        ...filters,
        categories: [categoryId]
      });
      setProducts(searchResults.products);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const _handleFiltersChange = (newFilters: MarketplaceFiltersType) => {
    setFilters(newFilters);
  };

  const _handleClearFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      kind: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
      city: '',
      region: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading category...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Category not found</h3>
            <p className="text-gray-600 mb-4">The category you&apos;re looking for doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <Header />
      
      {/* Back Button and Category Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                style={{
                  background: `linear-gradient(135deg, #3B82F620 0%, #3B82F640 100%)`,
                  borderColor: '#3B82F6'
                }}
              >
                📦
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{category.name}</h1>
                <p className="text-sm text-gray-500">{products.length} products</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search in ${category.name}...`}
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

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-gray-600">Filters coming soon...</p>
          </div>
        </div>
      )}

      {/* Category Description - Simplified */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-gray-600">{category.description}</p>
        </div>
      </div>

      {/* Products - Marketplace style */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {searchQuery ? `Search: "${searchQuery}"` : category.name}
          </h2>
          <span className="text-sm text-gray-500">{products.length} items</span>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🛍️</div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-sm text-gray-600 mb-3">
              {searchQuery 
                ? `No products in ${category.name} match "${searchQuery}"`
                : `No products available in ${category.name}`
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  loadCategoryData();
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
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
