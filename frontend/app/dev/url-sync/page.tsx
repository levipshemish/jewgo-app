/**
 * Dev Route: URL Sync Test Page
 * 
 * This route tests the URL synchronization functionality to prove PR-5 works correctly.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import MapEngine from '@/components/map/MapEngine';
import { getURLState } from '@/services/urlSync';
import type { Restaurant } from '@/types/livemap';

// Mock restaurants for testing
const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Kosher Burger Joint',
    pos: { lat: 25.7617, lng: -80.1918 },
    rating: 4.5,
    kosher: 'MEAT',
    openNow: true,
    agencies: ['OU'],
  },
  {
    id: '2',
    name: 'Dairy Delight Cafe',
    pos: { lat: 25.771, lng: -80.195 },
    rating: 4.2,
    kosher: 'DAIRY',
    openNow: false,
    agencies: ['Kof-K'],
  },
  {
    id: '3',
    name: 'Pareve Pastries',
    pos: { lat: 25.755, lng: -80.188 },
    rating: 4.8,
    kosher: 'PAREVE',
    openNow: true,
    agencies: ['Star-K'],
  },
];

export default function URLSyncTestPage() {
  const [urlState, setUrlState] = useState(getURLState());
  const { setRestaurants, setFilters, setMap } = useLivemapStore();

  // Update URL state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setUrlState(getURLState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize with mock data
  useEffect(() => {
    setRestaurants(mockRestaurants);
    useLivemapStore.getState().applyFilterResults(mockRestaurants.map(r => r.id));
  }, [setRestaurants]);

  const handleTestFilter = (filterType: string) => {
    switch (filterType) {
      case 'meat':
        setFilters({ kosher: ['MEAT'] });
        break;
      case 'dairy':
        setFilters({ kosher: ['DAIRY'] });
        break;
      case 'high-rating':
        setFilters({ minRating: 4.5 });
        break;
      case 'search':
        setFilters({ query: 'burger' });
        break;
      case 'clear':
        setFilters({});
        break;
    }
  };

  const handleTestLocation = () => {
    setMap({
      center: { lat: 25.8, lng: -80.2 },
      zoom: 15,
    });
  };

  const handleResetLocation = () => {
    setMap({
      center: { lat: 25.7617, lng: -80.1918 },
      zoom: 14,
    });
  };

  const handleTestURL = () => {
    // Test direct URL manipulation
    const testURL = new URL(window.location.href);
    testURL.searchParams.set('q', 'test query');
    testURL.searchParams.set('k', 'MEAT,DAIRY');
    testURL.searchParams.set('r', '4.0');
    testURL.searchParams.set('c', '25.8,-80.2');
    testURL.searchParams.set('z', '15');
    
    window.history.pushState({}, '', testURL.toString());
    window.location.reload();
  };

  const handleClearURL = () => {
    window.history.pushState({}, '', window.location.pathname);
    window.location.reload();
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-semibold text-gray-800">
          URL Sync Test - PR-5 Architecture
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Testing URL synchronization with store state
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Filter Controls */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Filter Tests</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTestFilter('meat')}
                className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
              >
                Meat Only
              </button>
              <button
                onClick={() => handleTestFilter('dairy')}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
              >
                Dairy Only
              </button>
              <button
                onClick={() => handleTestFilter('high-rating')}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
              >
                4.5+ Stars
              </button>
              <button
                onClick={() => handleTestFilter('search')}
                className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
              >
                Search: Burger
              </button>
              <button
                onClick={() => handleTestFilter('clear')}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Location Controls */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Location Tests</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTestLocation}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
              >
                Move to North Miami
              </button>
              <button
                onClick={handleResetLocation}
                className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
              >
                Reset to Miami Center
              </button>
            </div>
          </div>
        </div>

        {/* URL Controls */}
        <div className="mt-4">
          <h3 className="font-medium text-gray-700 mb-2">URL Tests</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleTestURL}
              className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200"
            >
              Test URL with Params
            </button>
            <button
              onClick={handleClearURL}
              className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
            >
              Clear URL
            </button>
          </div>
        </div>

        {/* URL State Display */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Current URL</div>
            <div className="text-gray-600 break-all">
              {window.location.href}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Parsed URL State</div>
            <pre className="text-gray-600 text-xs overflow-auto">
              {JSON.stringify(urlState, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapEngine />
      </div>

      {/* Instructions */}
      <div className="bg-gray-100 border-t p-4">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="font-medium">URL Sync Test Instructions:</div>
          <div>1. <strong>Apply filters</strong> - Watch URL update automatically</div>
          <div>2. <strong>Move map</strong> - Center and zoom sync to URL</div>
          <div>3. <strong>Test URL params</strong> - Click "Test URL with Params" and reload</div>
          <div>4. <strong>Deep link</strong> - Copy URL and open in new tab</div>
          <div>5. <strong>Browser back/forward</strong> - Should restore state</div>
        </div>
      </div>
    </div>
  );
}
