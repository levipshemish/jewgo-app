/**
 * Triggers Tests
 * 
 * Tests the debounced trigger functions.
 */

import { onBoundsChanged, onFiltersChanged, onSearchChanged } from '@/services/triggers';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import { loadRestaurantsInBounds } from '@/services/dataManager';
import { runFilter } from '@/services/workerManager';

// Mock the data manager
jest.mock('@/services/dataManager', () => ({
  loadRestaurantsInBounds: jest.fn(),
}));

// Mock the worker manager
jest.mock('@/services/workerManager', () => ({
  runFilter: jest.fn(),
}));

// Mock the store
jest.mock('@/lib/stores/livemap-store', () => ({
  useLivemapStore: {
    getState: jest.fn(() => ({
      setMap: jest.fn(),
      setFilters: jest.fn(),
    })),
  },
}));

describe('Triggers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('onBoundsChanged', () => {
    it('should debounce bounds changes', () => {
      const bounds = {
        ne: { lat: 25.8, lng: -80.1 },
        sw: { lat: 25.7, lng: -80.2 },
      };

      // Call multiple times rapidly
      onBoundsChanged(bounds);
      onBoundsChanged(bounds);
      onBoundsChanged(bounds);

      // Should not have been called yet
      expect(useLivemapStore.getState().setMap).not.toHaveBeenCalled();
      expect(loadRestaurantsInBounds).not.toHaveBeenCalled();

      // Fast forward past debounce time
      jest.advanceTimersByTime(250);

      // Should have been called once
      expect(useLivemapStore.getState().setMap).toHaveBeenCalledTimes(1);
      expect(loadRestaurantsInBounds).toHaveBeenCalledTimes(1);
    });

    it('should call setMap and loadRestaurantsInBounds', () => {
      const bounds = {
        ne: { lat: 25.8, lng: -80.1 },
        sw: { lat: 25.7, lng: -80.2 },
      };

      onBoundsChanged(bounds);
      jest.advanceTimersByTime(250);

      expect(useLivemapStore.getState().setMap).toHaveBeenCalledWith({ bounds });
      expect(loadRestaurantsInBounds).toHaveBeenCalledWith(bounds);
    });
  });

  describe('onFiltersChanged', () => {
    it('should debounce filter changes', () => {
      // Call multiple times rapidly
      onFiltersChanged();
      onFiltersChanged();
      onFiltersChanged();

      // Should not have been called yet
      expect(runFilter).not.toHaveBeenCalled();

      // Fast forward past debounce time
      jest.advanceTimersByTime(150);

      // Should have been called once
      expect(runFilter).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSearchChanged', () => {
    it('should debounce search changes', () => {
      const query = 'test query';

      // Call multiple times rapidly
      onSearchChanged(query);
      onSearchChanged(query);
      onSearchChanged(query);

      // Should not have been called yet
      expect(useLivemapStore.getState().setFilters).not.toHaveBeenCalled();
      expect(runFilter).not.toHaveBeenCalled();

      // Fast forward past debounce time
      jest.advanceTimersByTime(150);

      // Should have been called once
      expect(useLivemapStore.getState().setFilters).toHaveBeenCalledWith({ query });
      expect(runFilter).toHaveBeenCalledTimes(1);
    });

    it('should set search query and run filter', () => {
      const query = 'kosher restaurant';

      onSearchChanged(query);
      jest.advanceTimersByTime(150);

      expect(useLivemapStore.getState().setFilters).toHaveBeenCalledWith({ query });
      expect(runFilter).toHaveBeenCalled();
    });
  });
});
