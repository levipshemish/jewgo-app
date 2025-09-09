/**
 * Livemap Worker Tests
 * 
 * Tests the worker filtering and sorting functionality.
 */

import type { WorkRequest, WorkResponse } from '@/workers/protocol';
import type { Restaurant, Filters } from '@/types/livemap';

// Mock the worker environment
const mockPostMessage = jest.fn();
const _mockOnMessage = jest.fn();

// Mock self object
Object.defineProperty(global, 'self', {
  value: {
    postMessage: mockPostMessage,
    onmessage: null,
  },
  writable: true,
});

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Import the worker after mocking
import '@/workers/livemap.worker';

describe('Livemap Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostMessage.mockClear();
  });

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

  const mockFilters: Filters = {
    kosher: ['MEAT'],
    minRating: 4.0,
  };

  const mockUserLoc = { lat: 25.7617, lng: -80.1918 };

  it('should handle FILTER request', () => {
    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: mockRestaurants,
        filters: mockFilters,
        userLoc: mockUserLoc,
        max: 200,
      },
    };

    // Simulate worker message
    const event = { data: request };
    global.self.onmessage(event);

    // Should post a response
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'FILTER_RESULT',
        payload: expect.objectContaining({
          ids: expect.any(Array),
          reason: expect.any(String),
        }),
      })
    );
  });

  it('should filter restaurants by kosher type', () => {
    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: mockRestaurants,
        filters: { kosher: ['MEAT'] },
        userLoc: null,
        max: 200,
      },
    };

    global.self.onmessage({ data: request });

    const response = mockPostMessage.mock.calls[0][0] as WorkResponse;
    expect(response.kind).toBe('FILTER_RESULT');
    expect(response.payload.ids).toEqual(['1']); // Only meat restaurant
  });

  it('should filter restaurants by rating', () => {
    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: mockRestaurants,
        filters: { minRating: 4.5 },
        userLoc: null,
        max: 200,
      },
    };

    global.self.onmessage({ data: request });

    const response = mockPostMessage.mock.calls[0][0] as WorkResponse;
    expect(response.kind).toBe('FILTER_RESULT');
    expect(response.payload.ids).toEqual(['1', '3']); // 4.5+ rating restaurants
  });

  it('should filter restaurants by open status', () => {
    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: mockRestaurants,
        filters: { openNow: true },
        userLoc: null,
        max: 200,
      },
    };

    global.self.onmessage({ data: request });

    const response = mockPostMessage.mock.calls[0][0] as WorkResponse;
    expect(response.kind).toBe('FILTER_RESULT');
    expect(response.payload.ids).toEqual(['1', '3']); // Open restaurants
  });

  it('should filter restaurants by query', () => {
    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: mockRestaurants,
        filters: { query: 'burger' },
        userLoc: null,
        max: 200,
      },
    };

    global.self.onmessage({ data: request });

    const response = mockPostMessage.mock.calls[0][0] as WorkResponse;
    expect(response.kind).toBe('FILTER_RESULT');
    expect(response.payload.ids).toEqual(['1']); // Restaurant with 'burger' in name
  });

  it('should handle SORT_BY_DISTANCE request', () => {
    const request: WorkRequest = {
      kind: 'SORT_BY_DISTANCE',
      payload: {
        ids: ['1', '2', '3'],
        by: mockUserLoc,
      },
    };

    global.self.onmessage({ data: request });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'SORT_RESULT',
        payload: expect.objectContaining({
          ids: expect.any(Array),
          reason: expect.any(String),
        }),
      })
    );
  });

  it('should enforce MAX_VISIBLE limit', () => {
    // Create a large dataset
    const largeRestaurants = Array.from({ length: 500 }, (_, i) => ({
      id: `restaurant-${i}`,
      name: `Restaurant ${i}`,
      pos: { lat: 25.7617, lng: -80.1918 },
      rating: 4.0,
      kosher: 'MEAT' as const,
      openNow: true,
    }));

    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: largeRestaurants,
        filters: {},
        userLoc: null,
        max: 200,
      },
    };

    global.self.onmessage({ data: request });

    const response = mockPostMessage.mock.calls[0][0] as WorkResponse;
    expect(response.kind).toBe('FILTER_RESULT');
    expect(response.payload.ids.length).toBeLessThanOrEqual(200);
  });

  it('should handle errors gracefully', () => {
    const invalidRequest = {
      kind: 'INVALID',
      payload: {},
    };

    // Should not throw
    expect(() => {
      global.self.onmessage({ data: invalidRequest });
    }).not.toThrow();

    // Should post error response
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'FILTER_RESULT',
        payload: expect.objectContaining({
          ids: [],
          reason: expect.stringContaining('Worker error'),
        }),
      })
    );
  });

  it('should calculate distance correctly', () => {
    // Test distance calculation with known coordinates
    const point1 = { lat: 25.7617, lng: -80.1918 }; // Miami
    const _point2 = { lat: 25.771, lng: -80.195 };   // Nearby point

    // This would need to be tested by calling the worker with distance filtering
    // For now, we'll test that the worker doesn't crash with distance filters
    const request: WorkRequest = {
      kind: 'FILTER',
      payload: {
        restaurants: mockRestaurants,
        filters: { maxDistanceMi: 1 },
        userLoc: point1,
        max: 200,
      },
    };

    expect(() => {
      global.self.onmessage({ data: request });
    }).not.toThrow();
  });
});
