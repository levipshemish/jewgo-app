'use client';

import React from 'react';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';

type Props = {
  enable: boolean;
  hasMore: boolean;
  loading: boolean;
  showManualLoad: boolean;
  attachSentinel: (el: HTMLElement | null) => void;
  onManualLoad: () => void;
};

export default function InfiniteScrollControls({ enable, hasMore, loading, showManualLoad, attachSentinel, onManualLoad }: Props) {
  if (!enable) return null;
  return (
    <>
      <LoadMoreSentinel
        ref={attachSentinel}
        hasMore={hasMore}
        isLoading={loading}
        onRetry={showManualLoad ? onManualLoad : undefined}
        aria-label="Load more restaurants"
      />

      {showManualLoad && (
        <div className="flex justify-center py-6" role="region" aria-label="Manual load controls">
          <button
            onClick={onManualLoad}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label={loading ? 'Loading more restaurants...' : 'Load more restaurants'}
            aria-busy={loading}
          >
            {loading ? 'Loading...' : 'Load More Restaurants'}
          </button>
        </div>
      )}
    </>
  );
}

