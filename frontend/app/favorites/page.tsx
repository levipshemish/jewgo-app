'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { Header } from '@/components/layout';
import ActionButtons from '@/components/layout/ActionButtons';
import { BottomNavigation } from '@/components/navigation/ui';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { useFavorites } from '@/lib/utils/favorites';
import { isSupabaseConfigured, handleUserLoadError } from '@/lib/utils/auth-utils';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { Suspense } from 'react';

// Dynamically import Supabase client to prevent SSR issues
const getSupabaseClient = async () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const { supabaseBrowser } = await import('@/lib/supabase/client');
  return supabaseBrowser;
};

function FavoritesPageContent() {
  const { favorites } = useFavorites();
  const { handleImmediateTouch } = useMobileTouch();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('favorites');
  const [showFilters, setShowFilters] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientLoaded, setClientLoaded] = useState(false);

  // Use the shared advanced filters hook
  const {
    activeFilters,
    setFilter,
    toggleFilter,
    clearAllFilters
  } = useAdvancedFilters();

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

          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const supabase = await getSupabaseClient();
        if (!supabase) {

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

  const handleShowMap = () => {
    router.push('/live-map');
  };

  const handleAddEatery = () => {
    router.push('/add-eatery');
  };

  const handleFilterChange = (filterType: keyof typeof activeFilters, value: any) => {
    setFilter(filterType, value);
  };

  const handleToggleFilter = (filterType: keyof typeof activeFilters) => {
    toggleFilter(filterType);
  };

  const handleClearAllFilters = () => {
    clearAllFilters();
  };

  const handleDistanceChange = (distance: number) => {
    setFilter('maxDistanceMi', distance);
  };

  const handleCloseFilters = () => {
    setShowFilters(false);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
  };

  const handleCardClick = (restaurantId: string) => {
    router.push(`/restaurant/${restaurantId}`);
  };

  const handleAddToFavorites = (restaurantId: string) => {
    // This will be handled by the useFavorites hook

  };

  const handleRemoveFromFavorites = (restaurantId: string) => {
    // This will be handled by the useFavorites hook

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
          {/* Simple tab navigation */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex space-x-8 px-4">
              <button
                onClick={() => handleTabChange('favorites')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'favorites'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Favorites ({favorites.length})
              </button>
              <button
                onClick={() => handleTabChange('recent')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recent (0)
              </button>
              <button
                onClick={() => handleTabChange('saved')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'saved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Saved (0)
              </button>
            </div>
          </div>

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
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Added: {new Date(restaurant.addedAt).toLocaleDateString()}</p>
                          <p>Visits: {restaurant.visitCount}</p>
                          {restaurant.lastVisited && (
                            <p>Last visited: {new Date(restaurant.lastVisited).toLocaleDateString()}</p>
                          )}
                          {restaurant.notes && (
                            <p className="italic text-gray-500">"{restaurant.notes}"</p>
                          )}
                          {restaurant.tags && restaurant.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {restaurant.tags.map((tag, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    <button
                      onClick={handleCloseFilters}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <AdvancedFilters
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    onToggleFilter={handleToggleFilter}
                    onClearAll={handleClearAllFilters}
                    userLocation={null}
                    locationLoading={false}
                  />
                </div>
              </div>
            </div>
          )}

          <ActionButtons
            onShowFilters={handleShowFilters}
            onShowMap={handleShowMap}
            onAddEatery={handleAddEatery}
          />

          <BottomNavigation />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FavoritesPageContent />
    </Suspense>
  );
} 