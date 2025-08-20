'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { Header } from '@/components/layout';
import ActionButtons from '@/components/layout/ActionButtons';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import AdvancedFilters from '@/components/search/AdvancedFilters';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useFavorites } from '@/lib/utils/favorites';
import { isSupabaseConfigured, handleUserLoadError } from '@/lib/utils/auth-utils';

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

  // Check authentication status using centralized approach
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use centralized configuration check
        if (!isSupabaseConfigured()) {
          console.log('[Favorites] Supabase not configured');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabaseBrowser.auth.getSession();
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
  }, [router]);

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
      maxDistance: distance,
    }));
  };

  const handleCloseFilters = handleImmediateTouch(() => {
    setShowFilters(false);
  });

  // Show loading state while checking authentication
  if (loading || isAuthenticated === null) {
    return <LoadingState message="Loading favorites..." />;
  }

  // Show loading state if not authenticated (will redirect)
  if (!isAuthenticated) {
    return <LoadingState message="Redirecting to sign in..." />;
  }

  // Filter favorites based on search query only (other filters require full restaurant data)
  const filteredFavorites = favorites.filter(restaurant => {
    // Search query filter
    if (searchQuery && !restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Note: Advanced filtering (agency, category, dietary) would require fetching full restaurant data
    // For now, we only filter by search query using the available name property

    return true;
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f4f4f4]">
        {/* Search Header */}
        <Header
          onSearch={handleSearch}
          placeholder="Search your favorites..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />

        {/* Category Tabs */}
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Action Buttons - Responsive */}
        <ActionButtons
          onShowFilters={handleShowFilters}
          onShowMap={() => router.push('/live-map')}
          onAddEatery={() => router.push('/add-eatery')}
        />

        {/* Filters Modal */}
        {showFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <button
                    onClick={handleCloseFilters}
                    className="text-gray-400 hover:text-gray-600"
                    style={{
                      minHeight: '44px',
                      minWidth: '44px',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
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
                  onDistanceChange={handleDistanceChange}
                  onClearAll={handleClearAllFilters}
                  userLocation={null}
                  locationLoading={false}
                  onRequestLocation={undefined}
                />
              </div>
              <div
                className="p-4 border-t border-gray-200"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              >
                  <button
                    type="button"
                  onClick={handleCloseFilters}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 text-sm text-gray-600 border-b border-gray-200">
          {filteredFavorites.length} {filteredFavorites.length === 1 ? 'favorite' : 'favorites'} found
          {Object.values(activeFilters).some(filter => filter !== undefined && filter !== false) && (
            <button 
              onClick={handleImmediateTouch(() => handleClearAllFilters())}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Favorites Grid */}
        <div className="container mx-auto px-4 py-6 pb-24">
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">❤️</div>
              <div className="text-gray-500 text-lg mb-3 font-medium">
                No favorites found
              </div>
              <div className="text-gray-400 text-sm">
                {searchQuery || Object.values(activeFilters).some(filter => filter !== undefined && filter !== false) 
                  ? 'Try adjusting your search or filters' 
                  : 'Start adding restaurants to your favorites'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredFavorites.map((restaurant) => (
                <div key={restaurant.id} className="bg-white rounded-2xl shadow-lg p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">{restaurant.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Added: {new Date(restaurant.addedAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Visits: {restaurant.visitCount}
                  </p>
                  {restaurant.notes && (
                    <p className="text-gray-500 text-sm mt-2 italic">
                      &quot;{restaurant.notes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </ErrorBoundary>
  );
} 