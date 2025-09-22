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

  const sortedSpecials = useMemo(() => {
    const now = Date.now();
    return [...specials].sort((a, b) => {
      const aValidFrom = new Date(a.valid_from).getTime();
      const aValidUntil = new Date(a.valid_until).getTime();
      const bValidFrom = new Date(b.valid_from).getTime();
      const bValidUntil = new Date(b.valid_until).getTime();

      const aActive = now >= aValidFrom && now <= aValidUntil;
      const bActive = now >= bValidFrom && now <= bValidUntil;

      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return aValidUntil - bValidUntil;
    });
  }, [specials]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchSpecials(false);
    }
  };

  const LoadingGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

        {sortedSpecials.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedSpecials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                showClaimButton
                showShareButton
              />
            ))}
          </div>
        )}

        {sortedSpecials.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Ticket className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No specials available</h2>
            <p className="text-sm max-w-sm">
              Check back soon for new promotions or explore eateries for more dining options.
            </p>
          </div>
        )}

        {loadingMore && sortedSpecials.length > 0 && <LoadingGrid />}

        {hasMore && sortedSpecials.length > 0 && (
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
