/**
 * Dev Route: Viewport Loading Test Page
 * 
 * This route tests the viewport loading functionality with real API calls
 * and cache behavior to prove PR-3 works correctly.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import MapEngine from '@/components/map/MapEngine';
import { getCacheStats } from '@/services/dataManager';
import { getFilterStats } from '@/services/workerManager';

export default function ViewportLoadingTestPage() {
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [filterStats, setFilterStats] = useState(getFilterStats());
  const { setMap, setFilters } = useLivemapStore();

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(getCacheStats());
      setFilterStats(getFilterStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize with Miami area
  useEffect(() => {
    setMap({
      center: { lat: 25.7617, lng: -80.1918 },
      zoom: 14,
    });
  }, [setMap]);

  const handleTestFilter = () => {
    setFilters({ kosher: ['MEAT'] });
  };

  const handleClearFilters = () => {
    setFilters({});
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

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Viewport Loading Test - PR-3 Architecture
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Testing real data loading with viewport-keyed cache and TTL
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border-b p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleTestFilter}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Filter: Meat Only
          </button>
          <button
            onClick={handleClearFilters}
            className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
          >
            Clear Filters
          </button>
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

        {/* Performance Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Cache Stats</div>
            <div className="space-y-1 text-gray-600">
              <div>Entries: {cacheStats.size}</div>
              <div>Fetches: {cacheStats.fetchCount}</div>
              <div>Cache Hits: {cacheStats.cacheHits}</div>
              <div>Hit Rate: {Math.round(cacheStats.hitRate * 100)}%</div>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Filter Stats</div>
            <div className="space-y-1 text-gray-600">
              <div>Operations: {filterStats.filterCount}</div>
              <div>Total Time: {filterStats.totalFilterTime.toFixed(1)}ms</div>
              <div>Avg Time: {filterStats.averageFilterTime.toFixed(1)}ms</div>
            </div>
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
          <div className="font-medium">Test Instructions:</div>
          <div>1. <strong>Pan/Zoom</strong> - Should trigger data loading with 250ms debounce</div>
          <div>2. <strong>Filter buttons</strong> - Should apply filters with 150ms debounce</div>
          <div>3. <strong>Cache behavior</strong> - Returning to same area should hit cache</div>
          <div>4. <strong>Loading states</strong> - Should show loading overlay during fetches</div>
          <div>5. <strong>Performance</strong> - Watch stats update in real-time</div>
        </div>
      </div>
    </div>
  );
}
