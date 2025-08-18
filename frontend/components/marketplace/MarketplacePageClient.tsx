'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MapPin, Clock, Eye, Zap, ChevronDown, MessageCircle } from 'lucide-react';
import { BottomNavigation, CategoryTabs } from '@/components/navigation/ui';
import { MarketplaceAPI } from '@/lib/api/marketplace';
import MarketplaceHeader from './MarketplaceHeader';
import { 
  MarketplaceProduct, 
  MarketplaceCategory, 
  MarketplaceFilters as MarketplaceFiltersType,
  MarketplaceStats 
} from '@/lib/types/marketplace';

// Marketplace-specific action buttons using eatery design style
function MarketplaceActionButtons() {
  const router = useRouter();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleSellClick = () => {
    router.push('/marketplace/sell');
  };

  const handleCategoryClick = () => {
    // TODO: Implement category filter
  };

  const handleMessagesClick = () => {
    router.push('/marketplace/messages');
  };

  return (
    <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
      <div className="max-w-screen-sm sm:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between space-x-2 sm:space-x-3 lg:space-x-6">
          {/* Sell Button */}
          <button
            type="button"
            onClick={handleSellClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              ...(isMobile && {
                transition: 'all 0.1s ease-out'
              })
            }}
          >
            <Zap className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Sell</span>
          </button>
          
          {/* Category Filter Button */}
          <button
            type="button"
            onClick={handleCategoryClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              ...(isMobile && {
                transition: 'all 0.1s ease-out'
              })
            }}
          >
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Category</span>
            <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          </button>
          
          {/* Messages Button */}
          <button
            type="button"
            onClick={handleMessagesClick}
            className="flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 lg:px-6 py-3 lg:py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 flex-1 font-medium text-xs sm:text-sm lg:text-base min-w-0 touch-manipulation"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              ...(isMobile && {
                transition: 'all 0.1s ease-out'
              })
            }}
          >
            <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Messages</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Location display component
function LocationDisplay() {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500">
      <MapPin className="w-4 h-4" />
      <span>Miami Gardens, FL</span>
    </div>
  );
}

// Helper function to get relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }
  if (diffInSeconds < 2592000) {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

// Product grid component matching unified eatery sizing
function ProductGrid({ products, onAddToCart, onAddToWishlist }: {
  products: MarketplaceProduct[];
  onAddToCart: (product: MarketplaceProduct) => void;
  onAddToWishlist: (product: MarketplaceProduct) => void;
}) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16 lg:py-24">
        <div className="text-gray-400 text-6xl lg:text-8xl mb-4 lg:mb-6">🛍️</div>
        <div className="text-gray-500 text-lg lg:text-xl mb-3 font-medium">No products found</div>
        <div className="text-gray-400 text-sm lg:text-base">No products available at the moment</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Today&apos;s Picks</h2>
        <button className="text-gray-700 hover:text-gray-900 text-sm font-medium">
          View All
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        {products.map((product) => (
          <div key={product.id} className="relative">
            <div className="w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation">
              {/* Image Container - Using balanced aspect ratio matching eatery */}
              <div className="relative aspect-[5/4] overflow-hidden rounded-3xl">
                <img
                  src={product.thumbnail || product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-white/90 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                  {product.isOnSale ? 'Sale' : 'New'}
                </div>
                <button
                  className="absolute top-2 right-2 w-10 h-10 px-2 py-0 transition-all duration-200 hover:scale-105 z-10 flex items-start justify-center active:scale-95"
                  onClick={() => toggleFavorite(product.id)}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                    minHeight: '44px',
                    minWidth: '44px'
                  }}
                >
                  <Heart
                    className={`w-5 h-5 transition-all duration-150 ease-out stroke-white stroke-2 drop-shadow-sm ${
                      favorites.has(product.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'fill-transparent text-white hover:fill-red-500 hover:text-red-500'
                    }`}
                  />
                </button>
                {product.price === 0 && (
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    FREE
                  </div>
                )}
              </div>

              {/* Text Content Container - Separate transparent container matching eatery */}
              <div className="p-1.5 bg-transparent">
                {/* Product Name - Bold text with standardized height */}
                <div className="min-h-8 mb-1 flex items-center">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight break-words">
                    {product.name}
                  </h3>
                </div>
                
                {/* Price and Views - Swapped positions to match eatery */}
                <div className="flex items-center justify-between min-w-0">
                  <span className="text-xs text-gray-500 font-normal truncate flex-1 mr-2">
                    {product.price === 0 ? 'Free' : `$${product.price}`}
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-gray-400 line-through ml-1">${product.originalPrice}</span>
                    )}
                  </span>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Eye className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-800">
                      {product.views || 45}
                    </span>
                  </div>
                </div>

                {/* Location and Time */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">
                      {product.vendor?.city && product.vendor?.state 
                        ? `${product.vendor.city}, ${product.vendor.state}` 
                        : 'Miami Gardens, FL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeAgo(product.createdAt)}</span>
                  </div>
                </div>

                {/* Category and Vendor */}
                <div className="flex items-center justify-between mt-1">
                  <div className="px-2 py-1 border border-gray-300 rounded-full text-xs">
                    {product.category?.name || 'General'}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">{product.vendor?.name || 'Seller'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MarketplaceHeader onSearch={handleSearch} />
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading marketplace...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketplaceHeader onSearch={handleSearch} />
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-24 md:pb-28 lg:pb-28 xl:pb-32 2xl:pb-36">
        <div className="max-w-7xl mx-auto space-y-4">
          <MarketplaceActionButtons />
          <LocationDisplay />
          <ProductGrid 
            products={products} 
            onAddToCart={handleAddToCart}
            onAddToWishlist={handleAddToWishlist}
          />
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
