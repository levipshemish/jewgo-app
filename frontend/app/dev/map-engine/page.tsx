/**
 * Dev Route: MapEngine Test Page
 * 
 * This route tests the new MapEngine component with mocked data
 * to prove the architecture works before migrating existing components.
 */

'use client';

import React, { useEffect } from 'react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import MapEngine from '@/components/map/MapEngine';
import type { Restaurant } from '@/types/livemap';

// Mock data for testing
const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Kosher Deli Miami',
    pos: { lat: 25.7617, lng: -80.1918 },
    rating: 4.5,
    kosher: 'MEAT',
    openNow: true,
    agencies: ['ORB'],
  },
  {
    id: '2',
    name: 'Dairy Corner',
    pos: { lat: 25.7627, lng: -80.1928 },
    rating: 4.2,
    kosher: 'DAIRY',
    openNow: false,
    agencies: ['Kosher Miami'],
  },
  {
    id: '3',
    name: 'Pareve Paradise',
    pos: { lat: 25.7637, lng: -80.1938 },
    rating: 4.8,
    kosher: 'PAREVE',
    openNow: true,
    agencies: ['ORB', 'Kosher Miami'],
  },
  {
    id: '4',
    name: 'Meat Master',
    pos: { lat: 25.7647, lng: -80.1948 },
    rating: 4.1,
    kosher: 'MEAT',
    openNow: true,
    agencies: ['ORB'],
  },
  {
    id: '5',
    name: 'Dairy Dream',
    pos: { lat: 25.7657, lng: -80.1958 },
    rating: 4.6,
    kosher: 'DAIRY',
    openNow: false,
    agencies: ['Kosher Miami'],
  },
];

export default function MapEngineTestPage() {
  const { setRestaurants, setMap, select, toggleFavorite } = useLivemapStore();

  // Initialize with mock data
  useEffect(() => {
    // Set mock restaurants
    setRestaurants(mockRestaurants);
    
    // Set initial map state (Miami area)
    setMap({
      center: { lat: 25.7617, lng: -80.1918 },
      zoom: 14,
    });

    // Apply all restaurants as filtered (for testing)
    useLivemapStore.getState().applyFilterResults(mockRestaurants.map(r => r.id));

    console.log('🗺️ MapEngine Test: Initialized with', mockRestaurants.length, 'mock restaurants');
  }, [setRestaurants, setMap]);

  const handleSelectRestaurant = (id: string | null) => {
    select(id);
    console.log('🗺️ MapEngine Test: Selected restaurant', id);
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
    console.log('🗺️ MapEngine Test: Toggled favorite', id);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-semibold text-gray-800">
          MapEngine Test - PR-2 Architecture
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Testing new MapEngine component with mocked data
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border-b p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSelectRestaurant('1')}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
          >
            Select Restaurant 1
          </button>
          <button
            onClick={() => handleSelectRestaurant('2')}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
          >
            Select Restaurant 2
          </button>
          <button
            onClick={() => handleSelectRestaurant(null)}
            className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
          >
            Clear Selection
          </button>
          <button
            onClick={() => handleToggleFavorite('1')}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Toggle Favorite 1
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapEngine />
      </div>

      {/* Debug Info */}
      <div className="bg-gray-100 border-t p-4">
        <div className="text-xs text-gray-600">
          <div>Mock restaurants: {mockRestaurants.length}</div>
          <div>Store restaurants: {useLivemapStore.getState().restaurants.length}</div>
          <div>Filtered IDs: {useLivemapStore.getState().filtered.length}</div>
          <div>Selected ID: {useLivemapStore.getState().selectedId || 'none'}</div>
          <div>Favorites: {useLivemapStore.getState().favorites.size}</div>
        </div>
      </div>
    </div>
  );
}
