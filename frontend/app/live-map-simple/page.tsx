'use client';

import { useEffect, useState } from 'react';
import { fetchRestaurants } from '@/lib/api/restaurants';
import { Restaurant } from '@/lib/types/restaurant';

export default function SimpleLiveMapPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchRestaurants({ limit: 50 });
        
        if (data && data.restaurants) {
          setRestaurants(data.restaurants);
        } else {
          setError('No restaurant data received');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Live Map - Simple Test</h1>
        
        {loading && (
          <div className="text-center py-8">
            <div className="text-blue-600 text-lg">Loading restaurants...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-600 text-lg mb-4">⚠️ Error: {error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && restaurants.length > 0 && (
          <div>
            <div className="mb-4 text-green-600 font-semibold">
              ✅ Successfully loaded {restaurants.length} restaurants!
            </div>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">API Response Details:</h3>
              <div className="text-sm text-gray-600">
                <p>Total restaurants: {restaurants.length}</p>
                <p>First restaurant: {restaurants[0]?.name}</p>
                <p>Has coordinates: {restaurants.filter(r => r.latitude && r.longitude).length}/{restaurants.length}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {restaurants.slice(0, 12).map((restaurant) => (
                <div key={restaurant.id} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold text-gray-800">{restaurant.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{restaurant.address}</p>
                  {restaurant.kosher_category && (
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {restaurant.kosher_category}
                    </span>
                  )}
                  {restaurant.latitude && restaurant.longitude && (
                    <p className="text-green-600 text-xs mt-2">
                      📍 {restaurant.latitude.toFixed(4)}, {restaurant.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {restaurants.length > 12 && (
              <div className="text-center mt-6 text-gray-600">
                ... and {restaurants.length - 12} more restaurants
              </div>
            )}
          </div>
        )}

        {!loading && !error && restaurants.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-600 text-lg">No restaurants found</div>
          </div>
        )}
      </div>
    </div>
  );
}