'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { CategoryTabs } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import ActionButtons from '@/components/layout/ActionButtons';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  cuisine: string;
  rating: number | string;
  price_range: string;
  image_url: string;
  is_open: boolean;
  distance?: number;
}

interface ApiResponse {
  success: boolean;
  data: Restaurant[];
  total: number;
  error: string | null;
}

export function EateryPageClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit] = useState(50);

  const fetchRestaurants = useCallback(async (page: number = 1, query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // Construct URL more explicitly to avoid encoding issues
      const baseUrl = '/api/restaurants-with-images';
      const queryParams: string[] = [];
      queryParams.push(`page=${encodeURIComponent(page.toString())}`);
      queryParams.push(`limit=${encodeURIComponent(limit.toString())}`);
      
      if (query && query.trim()) {
        queryParams.push(`search=${encodeURIComponent(query.trim())}`);
      }
      
      const url = `${baseUrl}?${queryParams.join('&')}`;
      const response = await fetch(url);
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setRestaurants(data.data);
        setTotalPages(Math.ceil(data.total / limit));
      } else {
        setError(data.error || 'Failed to fetch restaurants');
      }
    } catch (err) {
      setError('Failed to fetch restaurants');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRestaurants(currentPage, searchQuery);
  }, [currentPage, searchQuery, fetchRestaurants]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const handleShowFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          onSearch={handleSearch}
          placeholder="Search restaurants..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab="eatery" />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <button
            onClick={() => fetchRestaurants(currentPage, searchQuery)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-20">
      <Header 
        onSearch={handleSearch}
        placeholder="Search restaurants..."
        showFilters={true}
        onShowFilters={handleShowFilters}
      />
      
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
        <CategoryTabs activeTab="eatery" />
      </div>
      
      <ActionButtons 
        onShowFilters={handleShowFilters}
        onShowMap={() => router.push('/live-map')}
        onAddEatery={() => router.push('/add-eatery')}
      />
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🍽️</div>
          <p className="text-lg text-gray-600 mb-2">No restaurants found</p>
          <p className="text-sm text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a restaurant!'
            }
          </p>
        </div>
      ) : (
        <div 
          className="restaurant-grid"
          role="grid"
          aria-label="Restaurant listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {restaurants.map((restaurant, index) => (
            <div 
              key={restaurant.id} 
              className="w-full" 
              role="gridcell"
              style={{
                contain: 'layout style paint',
                willChange: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <UnifiedCard
                data={{
                  id: restaurant.id,
                  imageUrl: restaurant.image_url,
                  title: restaurant.name,
                  badge: typeof restaurant.rating === 'number' ? restaurant.rating.toFixed(1) : String(restaurant.rating || ''),
                  subtitle: restaurant.price_range || '',
                  additionalText: restaurant.distance ? String(restaurant.distance) : '',
                  showHeart: true,
                  isLiked: false,
                  kosherCategory: restaurant.cuisine,
                  city: restaurant.address
                }}
                onCardClick={() => router.push(`/restaurant/${restaurant.id}`)}
                priority={index < 4}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="mt-8 mb-24" role="navigation" aria-label="Pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={loading}
            className="mb-4"
          />
          <div className="text-center text-sm text-gray-600">
            Showing {restaurants.length} of {restaurants.length * totalPages} restaurants
          </div>
        </div>
      )}
    </div>
  );
}
