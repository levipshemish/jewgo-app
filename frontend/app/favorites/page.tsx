'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { Header } from '@/components/layout';
import ActionButtons from '@/components/layout/ActionButtons';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { useFavorites } from '@/lib/utils/favorites';
import { isSupabaseConfigured, handleUserLoadError } from '@/lib/utils/auth-utils';

// Dynamically import Supabase client to prevent SSR issues
const getSupabaseClient = async () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const { supabaseBrowser } = await import('@/lib/supabase/client');
  return supabaseBrowser;
};

interface FilterState {
  agency?: string;
  dietary?: string;
  openNow?: boolean;
  category?: string;
  nearMe?: boolean;
  maxDistance?: number;
}

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('favorites');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientLoaded, setClientLoaded] = useState(false);

  // Check authentication status using centralized approach
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait for client to be loaded
        if (!clientLoaded) {
          setClientLoaded(true);
          return;
        }

        // Use centralized configuration check
        if (!isSupabaseConfigured()) {
          console.log('[Favorites] Supabase not configured');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const supabase = await getSupabaseClient();
        if (!supabase) {
          console.log('[Favorites] Supabase client not available');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Redirect to sign in if not authenticated
          router.push('/auth/signin?redirectTo=/favorites');
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        handleUserLoadError(error, router);
        router.push('/auth/signin?redirectTo=/favorites');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, clientLoaded]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleShowFilters = () => {
    setShowFilters(true);
  };

  const handleFilterChange = (filterType: 'agency' | 'dietary' | 'category', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleToggleFilter = (filterType: 'openNow' | 'nearMe', value: boolean) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearAllFilters = () => {
    setActiveFilters({});
  };

  const handleDistanceChange = (distance: number) => {
    setActiveFilters(prev => ({
      ...prev,
      maxDistance: distance
    }));
  };

  const handleCloseFilters = () => {
    setShowFilters(false);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setActiveFilters({});
    setShowFilters(false);
  };

  const handleCardClick = (restaurantId: string) => {
    router.push(`/restaurant/${restaurantId}`);
  };

  const handleAddToFavorites = (restaurantId: string) => {
    // This will be handled by the useFavorites hook
    console.log('Add to favorites:', restaurantId);
  };

  const handleRemoveFromFavorites = (restaurantId: string) => {
    // This will be handled by the useFavorites hook
    console.log('Remove from favorites:', restaurantId);
  };

  // Show loading state while checking authentication
  if (loading || !clientLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingState />
      </div>
    );
  }

  // Show error state if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">Authentication required to view favorites</p>
          <button 
            onClick={() => router.push('/auth/signin?redirectTo=/favorites')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header 
          onSearch={handleSearch}
          placeholder="Search your favorites..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />
        
        <div className="flex flex-col h-full">
          <CategoryTabs 
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          <div className="flex-1 overflow-hidden">
            {activeTab === 'favorites' && (
              <div className="p-4">
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">❤️</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No favorites yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Start exploring restaurants and add them to your favorites!
                    </p>
                    <button 
                      onClick={() => router.push('/eatery')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Explore Restaurants
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((restaurant) => (
                      <div 
                        key={restaurant.id}
                        className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleCardClick(restaurant.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {restaurant.name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromFavorites(restaurant.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            ❤️
                          </button>
                        </div>
                        {/* Image placeholder since FavoriteRestaurant doesn't have image_url */}
                        <div className="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">No image</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Added: {new Date(restaurant.addedAt).toLocaleDateString()}</p>
                          {restaurant.visitCount > 0 && <p>Visited: {restaurant.visitCount} times</p>}
                          {restaurant.notes && <p>Notes: {restaurant.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recent' && (
              <div className="p-4 text-center text-gray-500">
                <p>Recent activity will appear here</p>
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="p-4 text-center text-gray-500">
                <p>Saved items will appear here</p>
              </div>
            )}
          </div>

          {showFilters && (
            <AdvancedFilters
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onToggleFilter={handleToggleFilter}
              onDistanceChange={handleDistanceChange}
              onClose={handleCloseFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
          )}

          <ActionButtons
            onShowFilters={handleShowFilters}
            showFilters={showFilters}
            onTouch={handleImmediateTouch}
          />

          <BottomNavigation />
        </div>
      </div>
    </ErrorBoundary>
  );
} 