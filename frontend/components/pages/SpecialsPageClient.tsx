'use client';

import { Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BottomNavigation, CategoryTabs } from '@/components/core';
import { Header } from '@/components/layout';
import { SpecialCard } from '@/components/specials';
import { SkeletonCard } from '@/components/ui/LoadingStates';
import { TimeUpdateProvider } from '@/contexts/TimeUpdateProvider';
import { getSpecials } from '@/lib/api/specials';
import type { Special } from '@/types/specials';

const PAGE_LIMIT = 24;

export default function SpecialsPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('specials');
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);

  const fetchSpecials = useCallback(async (reset = false) => {
    try {
      setError(null);
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }

      const response = await getSpecials({ limit: PAGE_LIMIT, offset: offsetRef.current });
      const incoming = response.specials || [];

      setSpecials((prev) => (reset ? incoming : [...prev, ...incoming]));
      setHasMore(Boolean(response.has_more));

      offsetRef.current = reset ? incoming.length : offsetRef.current + incoming.length;
    } catch (err) {
      console.error('Failed to fetch specials:', err);
      setError('Failed to load specials. Please try again later.');
    } finally {
      if (reset) {
        setLoading(false);
      }
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecials(true);
  }, [fetchSpecials]);

  const _handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Navigate to different pages based on the selected tab
    switch (tab) {
      case 'mikvah':
        router.push('/mikvah');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'marketplace':
        router.push('/marketplace');
        break;
      case 'shtel':
        router.push('/shtel');
        break;
      case 'specials':
        // Already on specials page, just update the tab
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

  const isCurrentlyActive = (special: Special) => {
    const now = new Date();
    const validFrom = new Date(special.valid_from);
    const validUntil = new Date(special.valid_until);
    return now >= validFrom && now <= validUntil;
  };

  const isUpcoming = (special: Special) => {
    const now = new Date();
    const validFrom = new Date(special.valid_from);
    return now < validFrom;
  };

  const activeSpecials = useMemo(
    () => specials.filter(isCurrentlyActive),
    [specials]
  );
  const upcomingSpecials = useMemo(
    () => specials.filter(isUpcoming),
    [specials]
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchSpecials(false);
    }
  };

  const LoadingGrid = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonCard key={`specials-loading-${index}`} />
      ))}
    </div>
  );

  let bodyContent: React.ReactNode;

  if (loading && specials.length === 0) {
    bodyContent = (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading specials...</p>
        </div>
      </div>
    );
  } else if (error && specials.length === 0) {
    bodyContent = (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchSpecials(true)}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  } else {
    bodyContent = (
      <div className="px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Ticket className="w-6 h-6 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Kosher Specials</h1>
          </div>
          <p className="text-gray-600">
            Discover amazing deals and offers from kosher establishments in your area.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{activeSpecials.length}</div>
            <div className="text-sm text-gray-600">Active Now</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{upcomingSpecials.length}</div>
            <div className="text-sm text-gray-600">Coming Soon</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{specials.length}</div>
            <div className="text-sm text-gray-600">Total Specials</div>
          </div>
        </div>

        {/* Active Specials */}
        {activeSpecials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-900">Active Now</h2>
              <span className="text-sm text-gray-500">({activeSpecials.length})</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSpecials.map((special) => (
                <SpecialCard
                  key={special.id}
                  special={special}
                  compact={false}
                  showClaimButton={true}
                  showShareButton={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Specials */}
        {upcomingSpecials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-900">Coming Soon</h2>
              <span className="text-sm text-gray-500">({upcomingSpecials.length})</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingSpecials.map((special) => (
                <SpecialCard
                  key={special.id}
                  special={special}
                  compact={false}
                  showClaimButton={false}
                  showShareButton={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Specials State */}
        {specials.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Specials Available</h2>
              <p className="text-gray-600 mb-6">
                Check back later for amazing deals and offers from kosher establishments.
              </p>
              <button
                onClick={() => router.push('/eatery')}
                className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Explore Eateries
              </button>
            </div>
          </div>
        )}

        {loadingMore && specials.length > 0 && <LoadingGrid />}

        {hasMore && specials.length > 0 && (
          <div className="text-center pt-6">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <TimeUpdateProvider>
      <div className="min-h-screen bg-[#f4f4f4]">
        <Header />

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={_handleTabChange} />
        </div>

        {bodyContent}

        <BottomNavigation />
      </div>
    </TimeUpdateProvider>
  );
}
