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
import ProductCard from './ProductCard';
import CategoryCard from './CategoryCard';
import MarketplaceFiltersComponent from './MarketplaceFilters';



// Action buttons component matching marketplace-app design
function ActionButtons() {
  const router = useRouter();

  const handleSellClick = () => {
    router.push('/marketplace/sell');
  };

  const handleMessagesClick = () => {
    router.push('/marketplace/messages');
  };

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleSellClick}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 py-2 font-medium flex items-center gap-2 transition-colors"
      >
        <Zap className="w-4 h-4" />
        Sell
      </button>
      <button className="rounded-full px-4 py-2 border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
        Category
        <ChevronDown className="w-4 h-4" />
      </button>
      <button 
        onClick={handleMessagesClick}
        className="rounded-full px-4 py-2 border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 ml-auto"
      >
        <MessageCircle className="w-4 h-4" />
        My messages
      </button>
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

// Product grid component matching marketplace-app design
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
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🛍️</div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">No products found</h3>
        <p className="text-sm text-gray-600">No products available at the moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-purple-600">Today&apos;s Picks</h2>
        <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
          View All
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-square bg-gray-100 relative">
                             <img
                 src={product.thumbnail || product.images?.[0] || "/placeholder.svg"}
                 alt={product.name}
                 className="w-full h-full object-cover"
               />
                             <div className="absolute top-2 left-2 bg-white/90 text-gray-700 px-2 py-1 rounded text-xs">
                 {product.isOnSale ? 'Sale' : 'New'}
               </div>
              <button
                className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded"
                onClick={() => toggleFavorite(product.id)}
              >
                <Heart
                  className={`w-4 h-4 ${favorites.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                />
              </button>
                             {product.price === 0 && (
                 <div className="absolute bottom-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                   FREE
                 </div>
               )}
            </div>
            <div className="p-3 space-y-2">
                             <div className="flex items-start justify-between gap-2">
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="font-semibold text-gray-900">
                       {product.price === 0 ? 'Free' : `$${product.price}`}
                     </span>
                     {product.originalPrice && product.originalPrice > product.price && (
                       <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
                     )}
                   </div>
                   <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
                 </div>
               </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                                 <div className="flex items-center gap-1">
                   <MapPin className="w-3 h-3" />
                   <span className="truncate">
                     {product.vendor?.city && product.vendor?.state 
                       ? `${product.vendor.city}, ${product.vendor.state}` 
                       : 'Miami Gardens, FL'}
                   </span>
                 </div>
                <div className="flex items-center gap-3">
                                     <div className="flex items-center gap-1">
                     <Clock className="w-3 h-3" />
                     <span>{getTimeAgo(product.createdAt)}</span>
                   </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{product.views || 45}</span>
                  </div>
                </div>
              </div>

                             <div className="flex items-center justify-between">
                 <div className="px-2 py-1 border border-gray-300 rounded text-xs">
                   {product.category?.name || 'General'}
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                   <span className="text-xs text-gray-600">{product.vendor?.name || 'Seller'}</span>
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
      <div className="px-4 py-4 space-y-4">
        <ActionButtons />
        <LocationDisplay />
        <ProductGrid 
          products={products} 
          onAddToCart={handleAddToCart}
          onAddToWishlist={handleAddToWishlist}
        />
      </div>
      <BottomNavigation />
    </div>
  );
}
