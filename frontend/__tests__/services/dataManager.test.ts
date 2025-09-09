/**
 * Data Manager Tests
 * 
 * Unit tests for data loading and caching functionality.
 */

import { loadRestaurantsInBounds, clearCache, getCacheStats } from '@/services/dataManager';
import type { Restaurant, Bounds } from '@/types/livemap';

// Mock fetch
global.fetch = jest.fn();

// Mock useLivemapStore
jest.mock('@/lib/stores/livemap-store', () => ({
  useLivemapStore: {
    getState: jest.fn(() => ({
      setRestaurants: jest.fn(),
      setMap: jest.fn(),
    })),
    setState: jest.fn(),
  },
}));

const mockBounds: Bounds = {
  ne: { lat: 25.8, lng: -80.1 },
  sw: { lat: 25.7, lng: -80.2 },
};

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Test Restaurant',
    pos: { lat: 25.75, lng: -80.15 },
    kosher: 'MEAT',
  },
];

describe('DataManager', () => {
  beforeEach(() => {
    clearCache();
    jest.clearAllMocks();
  });

  describe('loadRestaurantsInBounds', () => {
    it('should fetch restaurants from API', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurants,
      });

      await loadRestaurantsInBounds(mockBounds);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/restaurants?bounds=')
      );
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await loadRestaurantsInBounds(mockBounds);

      expect(useLivemapStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: expect.objectContaining({ restaurants: 'error' }),
          error: 'HTTP 500: Internal Server Error',
        })
      );
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await loadRestaurantsInBounds(mockBounds);

      expect(useLivemapStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: expect.objectContaining({ restaurants: 'error' }),
          error: 'Network error',
        })
      );
    });
  });

  describe('Caching', () => {
    it('should cache results', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurants,
      });

      // First load
      await loadRestaurantsInBounds(mockBounds);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second load should use cache
      await loadRestaurantsInBounds(mockBounds);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should respect TTL', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRestaurants,
      });

      // First load
      await loadRestaurantsInBounds(mockBounds);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Mock time passing beyond TTL
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000); // 6 minutes

      // Should fetch again
      await loadRestaurantsInBounds(mockBounds);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Stats', () => {
    it('should track cache statistics', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRestaurants,
      });

      const initialStats = getCacheStats();
      expect(initialStats.fetchCount).toBe(0);
      expect(initialStats.cacheHits).toBe(0);

      // First load
      await loadRestaurantsInBounds(mockBounds);
      let stats = getCacheStats();
      expect(stats.fetchCount).toBe(1);
      expect(stats.cacheHits).toBe(0);

      // Second load (cache hit)
      await loadRestaurantsInBounds(mockBounds);
      stats = getCacheStats();
      expect(stats.fetchCount).toBe(1);
      expect(stats.cacheHits).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });
});
