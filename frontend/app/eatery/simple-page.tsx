'use client';

import React, { useState, useEffect } from 'react';
import { fetchRestaurants } from '@/lib/api/restaurants';

export default function SimpleEateryPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchRestaurants(10);
        setRestaurants(data.restaurants || []);
      } catch (_err) {
        // // console.error('Error loading restaurants:', err);
        setError(_err instanceof Error ? _err.message : 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-screen-md mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Eatery</h1>
        </div>
      </div>

      {/* Restaurant List */}
      <div className="px-4 py-6">
        <div className="max-w-screen-md mx-auto">
          {restaurants.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">🍽️</div>
              <div className="text-gray-500 text-lg mb-3 font-medium">
                No restaurants found
              </div>
              <div className="text-gray-400 text-sm">
                Try refreshing the page
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {restaurants.map((restaurant: any) => (
                <div key={restaurant.id} className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {restaurant.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {restaurant.city}, {restaurant.state}
                  </p>
                  <p className="text-xs text-gray-500">
                    {restaurant.kosher_category} • {restaurant.certifying_agency}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
