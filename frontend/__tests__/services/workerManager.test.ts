/**
 * Worker Manager Tests
 * 
 * Unit tests for worker communication and filtering.
 */

import { runFilter, runDistanceSort, getFilterStats, resetFilterStats } from '@/services/workerManager';

// Mock the worker
jest.mock('@/lib/workers/makeWorker', () => ({
  makeWorker: jest.fn(() => ({
    post: jest.fn(),
    terminate: jest.fn(),
  })),
}));

// Mock useLivemapStore
const mockSetState = jest.fn();
const mockGetState = jest.fn();

jest.mock('@/lib/stores/livemap-store', () => ({
  useLivemapStore: {
    getState: mockGetState,
    setState: mockSetState,
  },
}));

describe('WorkerManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFilterStats();
    
    mockGetState.mockReturnValue({
      restaurants: [],
      filters: {},
      userLoc: null,
    });
  });

  describe('runFilter', () => {
    it('should call worker with correct parameters', () => {
      const mockRestaurants = [
        { id: '1', name: 'Restaurant 1', pos: { lat: 25.7617, lng: -80.1918 }, kosher: 'MEAT' as const },
      ];
      const mockFilters = { kosher: ['MEAT'] };
      const mockUserLoc = { lat: 25.7617, lng: -80.1918 };

      mockGetState.mockReturnValue({
        restaurants: mockRestaurants,
        filters: mockFilters,
        userLoc: mockUserLoc,
      });

      runFilter(100);

      // Verify worker was called with correct request structure
      const { makeWorker } = require('@/lib/workers/makeWorker');
      const mockWorker = makeWorker();
      expect(mockWorker.post).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'FILTER',
          payload: expect.objectContaining({
            restaurants: mockRestaurants,
            filters: mockFilters,
            userLoc: mockUserLoc,
            max: 100,
          }),
        }),
        expect.any(Function)
      );
    });

    it('should use default max visible limit', () => {
      runFilter();

      const { makeWorker } = require('@/lib/workers/makeWorker');
      const mockWorker = makeWorker();
      expect(mockWorker.post).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            max: 200, // PERFORMANCE_LIMITS.MAX_VISIBLE
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('runDistanceSort', () => {
    it('should call worker with correct parameters', () => {
      const mockIds = ['1', '2', '3'];
      const mockUserLoc = { lat: 25.7617, lng: -80.1918 };

      runDistanceSort(mockIds, mockUserLoc);

      const { makeWorker } = require('@/lib/workers/makeWorker');
      const mockWorker = makeWorker();
      expect(mockWorker.post).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'SORT_BY_DISTANCE',
          payload: expect.objectContaining({
            ids: mockIds,
            by: mockUserLoc,
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should track filter statistics', () => {
      const initialStats = getFilterStats();
      expect(initialStats.filterCount).toBe(0);
      expect(initialStats.totalFilterTime).toBe(0);
      expect(initialStats.averageFilterTime).toBe(0);

      // Mock a filter operation
      runFilter();
      
      // Note: In a real test, we'd need to mock the worker response
      // to actually trigger the performance tracking
    });

    it('should reset statistics', () => {
      // Mock some stats
      runFilter();
      
      resetFilterStats();
      
      const stats = getFilterStats();
      expect(stats.filterCount).toBe(0);
      expect(stats.totalFilterTime).toBe(0);
    });
  });
});
