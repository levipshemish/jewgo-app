'use client';

import { useState, useEffect } from 'react';
import { MarketplaceListing } from '@/lib/types/marketplace';
import { Grid } from '@/components/core';

// Sample data matching the marketplace theme
const sampleListings: MarketplaceListing[] = [
  {
    id: "1",
    kind: 'regular',
    txn_type: 'sale',
    title: "2004 Toyota Sienna - Great Family Car",
    description: "Excellent condition family car with low mileage. Perfect for large families.",
    price_cents: 240000,
    originalPrice: 310000,
    currency: "USD",
    condition: 'used_good',
    category_id: 1,
    category_name: "Vehicles",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "John Doe",
    endorse_up: 12,
    endorse_down: 1,
    status: "active",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    views: 127,
    rating: 4.5,
    images: ["/silver-toyota-sienna.png"]
  },
  {
    id: "2",
    kind: 'regular',
    txn_type: 'sale',
    title: "Box of small legos - Mixed colors and pieces",
    description: "Large collection of LEGO pieces in various colors. Great for creative building.",
    price_cents: 0,
    currency: "USD",
    condition: 'used_good',
    category_id: 2,
    category_name: "Toys",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Sarah Smith",
    endorse_up: 8,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-15T08:15:00Z",
    updated_at: "2024-01-15T08:15:00Z",
    views: 89,
    rating: 4.8,
    images: ["/scattered-lego.png"]
  },
  {
    id: "3",
    kind: 'appliance',
    txn_type: 'sale',
    title: "Kosher fleishig oven - Excellent condition",
    description: "Dedicated meat oven in perfect condition. Never mixed with dairy.",
    price_cents: 0,
    currency: "USD",
    condition: 'used_like_new',
    category_id: 3,
    category_name: "Appliances",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Rachel Cohen",
    endorse_up: 15,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-14T16:45:00Z",
    updated_at: "2024-01-14T16:45:00Z",
    views: 203,
    rating: 5.0,
    images: ["/modern-white-kitchen-oven.png"]
  },
  {
    id: "4",
    kind: 'regular',
    txn_type: 'sale',
    title: "Couches & chairs - Living room furniture set",
    description: "Complete living room set including sofa and matching chairs.",
    price_cents: 10000,
    currency: "USD",
    condition: 'used_good',
    category_id: 4,
    category_name: "Furniture",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "David Wilson",
    endorse_up: 6,
    endorse_down: 2,
    status: "active",
    created_at: "2024-01-15T12:20:00Z",
    updated_at: "2024-01-15T12:20:00Z",
    views: 156,
    rating: 4.2,
    images: ["/modern-gray-living-room.png"]
  },
  {
    id: "5",
    kind: 'regular',
    txn_type: 'sale',
    title: "Mountain bike - Trek hybrid, great condition",
    description: "Trek hybrid mountain bike perfect for trails and city riding.",
    price_cents: 25000,
    currency: "USD",
    condition: 'used_like_new',
    category_id: 5,
    category_name: "Sports",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Mike Johnson",
    endorse_up: 9,
    endorse_down: 1,
    status: "active",
    created_at: "2024-01-15T06:30:00Z",
    updated_at: "2024-01-15T06:30:00Z",
    views: 74,
    rating: 4.6,
    images: ["/mountain-bike-forest.png"]
  },
  {
    id: "6",
    kind: 'regular',
    txn_type: 'sale',
    title: "Office storage shelves - Multiple units available",
    description: "Professional office storage solutions. Multiple units available.",
    price_cents: 7500,
    currency: "USD",
    condition: 'used_good',
    category_id: 6,
    category_name: "Office",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Lisa Brown",
    endorse_up: 4,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-14T14:10:00Z",
    updated_at: "2024-01-14T14:10:00Z",
    views: 45,
    rating: 4.4,
    images: ["/wooden-storage-shelves.png"]
  },
  {
    id: "7",
    kind: 'regular',
    txn_type: 'sale',
    title: "Dining table set - Seats 6 people",
    description: "Beautiful wooden dining table with 6 matching chairs.",
    price_cents: 18000,
    currency: "USD",
    condition: 'used_good',
    category_id: 4,
    category_name: "Furniture",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Emma Davis",
    endorse_up: 11,
    endorse_down: 1,
    status: "active",
    created_at: "2024-01-13T09:45:00Z",
    updated_at: "2024-01-13T09:45:00Z",
    views: 98,
    rating: 4.7,
    images: ["/wooden-dining-table.png"]
  },
  {
    id: "8",
    kind: 'regular',
    txn_type: 'sale',
    title: "Kids playground set - Swing and slide",
    description: "Complete backyard playground with swing set and slide.",
    price_cents: 30000,
    currency: "USD",
    condition: 'used_good',
    category_id: 7,
    category_name: "Kids",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Tom Anderson",
    endorse_up: 7,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-15T00:30:00Z",
    updated_at: "2024-01-15T00:30:00Z",
    views: 142,
    rating: 4.9,
    images: ["/backyard-playground.png"]
  }
];

export default function EnhancedMarketplaceDemo() {
  const [_loading, setLoading] = useState(true);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [likedListings, setLikedListings] = useState<Set<string>>(new Set());
  const [variant, setVariant] = useState<'default' | 'compact' | 'featured'>('default');
  const [gridCols, setGridCols] = useState<'2' | '3' | '4' | '5' | '6'>('4');
  const [showEndorsements, setShowEndorsements] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setListings(sampleListings);
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleLike = (listing: MarketplaceListing) => {
    setLikedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listing.id)) {
        newSet.delete(listing.id);
      } else {
        newSet.add(listing.id);
      }
      return newSet;
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Enhanced Marketplace Demo</h1>
        <p className="text-muted-foreground mb-4">
          Showcasing the merged marketplace card components with modern design and features
        </p>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Variant:</label>
            <select 
              value={variant} 
              onChange={(e) => setVariant(e.target.value as any)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="default">Default</option>
              <option value="compact">Compact</option>
              <option value="featured">Featured</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Grid:</label>
            <select 
              value={gridCols} 
              onChange={(e) => setGridCols(e.target.value as any)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="2">2 Columns</option>
              <option value="3">3 Columns</option>
              <option value="4">4 Columns</option>
              <option value="5">5 Columns</option>
              <option value="6">6 Columns</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Endorsements:</label>
            <input 
              type="checkbox" 
              checked={showEndorsements}
              onChange={(e) => setShowEndorsements(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <Grid
        category="all"
        searchQuery=""
        showDistance={true}
        showRating={true}
        showServices={true}
        scrollContainerRef={{ current: null }}
        userLocation={null}
        useRealData={false}
        activeFilters={{}}
        dataType="marketplace"
      />

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Liked {likedListings.size} items • Total {listings.length} listings
        </p>
      </div>
    </div>
  );
}
