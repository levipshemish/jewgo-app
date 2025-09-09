/**
 * Dev Route: Worker Performance Test Page
 * 
 * This route tests the worker filtering performance with large datasets
 * to prove PR-4 works correctly and meets performance requirements.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import MapEngine from '@/components/map/MapEngine';
import { getFilterStats, resetFilterStats } from '@/services/workerManager';
import { getCacheStats } from '@/services/dataManager';
import type { Restaurant } from '@/types/livemap';

// Generate large dataset for testing
function generateTestRestaurants(count: number): Restaurant[] {
  const restaurants: Restaurant[] = [];
  const kosherTypes = ['MEAT', 'DAIRY', 'PAREVE'] as const;
  const agencies = ['OU', 'Kof-K', 'Star-K', 'CRC', 'OK'];
  
  for (let i = 0; i < count; i++) {
    restaurants.push({
      id: `test-${i}`,
      name: `Test Restaurant ${i}`,
      pos: {
        lat: 25.7 + (Math.random() - 0.5) * 0.2, // Miami area
        lng: -80.2 + (Math.random() - 0.5) * 0.2,
      },
      rating: Math.random() * 2 + 3, // 3-5 stars
      kosher: kosherTypes[Math.floor(Math.random() * kosherTypes.length)],
      openNow: Math.random() > 0.5,
      agencies: agencies.slice(0, Math.floor(Math.random() * 3) + 1),
    });
  }
  
  return restaurants;
}

export default function WorkerPerformanceTestPage() {
  const [filterStats, setFilterStats] = useState(getFilterStats());
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  const [testDataset, setTestDataset] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { setRestaurants, setFilters, setMap } = useLivemapStore();

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setFilterStats(getFilterStats());
      setCacheStats(getCacheStats());
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

  const handleLoadDataset = (size: number) => {
    setIsLoading(true);
    
    // Generate dataset in chunks to avoid blocking UI
    setTimeout(() => {
      const dataset = generateTestRestaurants(size);
      setTestDataset(dataset);
      setRestaurants(dataset);
      setIsLoading(false);
    }, 100);
  };

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
      case 'open-now':
        setFilters({ openNow: true });
        break;
      case 'clear':
        setFilters({});
        break;
    }
  };

  const handleResetStats = () => {
    resetFilterStats();
    setFilterStats(getFilterStats());
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Worker Performance Test - PR-4 Architecture
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Testing worker filtering performance with large datasets
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Dataset Controls */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Test Datasets</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLoadDataset(1000)}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                1K Restaurants
              </button>
              <button
                onClick={() => handleLoadDataset(5000)}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                5K Restaurants
              </button>
              <button
                onClick={() => handleLoadDataset(10000)}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                10K Restaurants
              </button>
              <button
                onClick={() => handleLoadDataset(25000)}
                disabled={isLoading}
                className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 disabled:opacity-50"
              >
                25K Restaurants
              </button>
            </div>
          </div>

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
                onClick={() => handleTestFilter('open-now')}
                className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
              >
                Open Now
              </button>
              <button
                onClick={() => handleTestFilter('clear')}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Filter Performance</div>
            <div className="space-y-1 text-gray-600">
              <div>Operations: {filterStats.filterCount}</div>
              <div>Total Time: {filterStats.totalFilterTime.toFixed(1)}ms</div>
              <div>Avg Time: {filterStats.averageFilterTime.toFixed(1)}ms</div>
              <button
                onClick={handleResetStats}
                className="mt-2 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                Reset Stats
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Cache Performance</div>
            <div className="space-y-1 text-gray-600">
              <div>Entries: {cacheStats.size}</div>
              <div>Fetches: {cacheStats.fetchCount}</div>
              <div>Cache Hits: {cacheStats.cacheHits}</div>
              <div>Hit Rate: {Math.round(cacheStats.hitRate * 100)}%</div>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700 mb-2">Dataset Info</div>
            <div className="space-y-1 text-gray-600">
              <div>Loaded: {testDataset.length.toLocaleString()}</div>
              <div>Status: {isLoading ? 'Loading...' : 'Ready'}</div>
              <div>Memory: {Math.round(testDataset.length * 0.5)}KB</div>
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
          <div className="font-medium">Performance Test Instructions:</div>
          <div>1. <strong>Load datasets</strong> - Start with 1K, then test 5K, 10K, 25K</div>
          <div>2. <strong>Apply filters</strong> - Test different filter combinations</div>
          <div>3. <strong>Monitor performance</strong> - Watch filter times and memory usage</div>
          <div>4. <strong>Performance targets</strong> - Filter operations should complete in &lt;100ms</div>
          <div>5. <strong>Memory limits</strong> - Should handle 25K restaurants without issues</div>
        </div>
      </div>
    </div>
  );
}
