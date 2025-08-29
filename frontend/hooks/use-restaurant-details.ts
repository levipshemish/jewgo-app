import { useState, useEffect } from 'react';
import { Restaurant } from '@/lib/types/restaurant';
import { getRestaurant } from '@/lib/api/restaurants';

interface UseRestaurantDetailsReturn {
  data: Restaurant | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRestaurantDetails(restaurantId: string | number): UseRestaurantDetailsReturn {
  const [data, setData] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const id = typeof restaurantId === 'string' ? parseInt(restaurantId) : restaurantId;
      if (isNaN(id)) {
        throw new Error('Invalid restaurant ID');
      }
      
      const restaurant = await getRestaurant(id);
      if (restaurant) {
        setData(restaurant);
      } else {
        throw new Error('Restaurant not found');
      }
    } catch (err: any) {
      // Handle specific error types
      if (err.status === 429) {
        setError('Service temporarily unavailable due to high traffic. Please try again in a few moments.');
      } else if (err.status === 404) {
        setError('Restaurant not found');
      } else if (err.message?.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurant();
    }
  }, [restaurantId]);

  return {
    data,
    loading,
    error,
    refetch: fetchRestaurant
  };
}
