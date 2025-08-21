import { renderHook, act } from '@testing-library/react';

import { Restaurant } from '@/lib/types/restaurant';
import { useMarkerManagement } from '@/components/map/hooks/useMarkerManagement';

// Mock ESM markerclusterer to avoid relying on real Google Maps OverlayView
jest.mock('@googlemaps/markerclusterer', () => {
  class DummyClusterer {
    map: any;
    markers: any[];
    algorithm: any;
    constructor(opts: any) {
      this.map = opts.map;
      this.markers = opts.markers || [];
      this.algorithm = opts.algorithm;
    }
    clearMarkers() { this.markers = []; }
    addMarkers(ms: any[]) { this.markers.push(...ms); }
  }
  class DummyAlgorithm {
    constructor(_opts?: any) {}
  }
  return { MarkerClusterer: DummyClusterer, SuperClusterAlgorithm: DummyAlgorithm };
});

// Mock Google Maps API
const mockGoogleMaps = {
  maps: {
    LatLng: jest.fn(),
    Marker: jest.fn(),
    Size: jest.fn(),
    Point: jest.fn(),
    marker: {
      AdvancedMarkerElement: jest.fn()
    }
  }
};

// Mock window.google
Object.defineProperty(window, 'google', {
  value: mockGoogleMaps,
  writable: true
});

describe('useMarkerManagement', () => {
  const mockRestaurants: Restaurant[] = [
    {
      id: 1,
      name: 'Test Restaurant 1',
      latitude: 25.7617,
      longitude: -80.1918,
      kosher_category: 'Meat',
      rating: 4.5,
      hours: {},
      category: { name: 'Restaurant' },
      address: '123 Test St',
      city: 'Miami',
      state: 'FL',
      zip_code: '33101',
      phone_number: '305-555-0123',
      certifying_agency: 'Test Agency',
      listing_type: 'restaurant',
      status: 'open'
    },
    {
      id: 2,
      name: 'Test Restaurant 2',
      latitude: 25.7618,
      longitude: -80.1919,
      kosher_category: 'Dairy',
      rating: 4.0,
      hours: {},
      category: { name: 'Restaurant' },
      address: '456 Test Ave',
      city: 'Miami',
      state: 'FL',
      zip_code: '33102',
      phone_number: '305-555-0124',
      certifying_agency: 'Test Agency',
      listing_type: 'restaurant',
      status: 'open'
    }
  ];

  const mockUserLocation = {
    latitude: 25.7617,
    longitude: -80.1918,
    accuracy: 10
  };

  const defaultProps = {
    restaurants: mockRestaurants,
    selectedRestaurantId: undefined,
    userLocation: null,
    showRatingBubbles: true,
    enableClustering: true,
    onRestaurantSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected hook structure', () => {
    const { result } = renderHook(() => useMarkerManagement(defaultProps));

    expect(result.current).toHaveProperty('markersRef');
    expect(result.current).toHaveProperty('markersMapRef');
    expect(result.current).toHaveProperty('clustererRef');
    expect(result.current).toHaveProperty('getRestaurantKey');
    expect(result.current).toHaveProperty('cleanupMarkers');
    expect(result.current).toHaveProperty('createMarker');
    expect(result.current).toHaveProperty('applyClustering');
  });

  it('generates restaurant key correctly', () => {
    const { result } = renderHook(() => useMarkerManagement({
      ...defaultProps,
      userLocation: mockUserLocation,
      selectedRestaurantId: 1
    }));

    const restaurant = mockRestaurants[0];
    const key = result.current.getRestaurantKey(restaurant);
    expect(key).toContain(restaurant.id.toString());
    expect(key).toContain(restaurant.latitude!.toString());
    expect(key).toContain(restaurant.longitude!.toString());
    expect(key).toContain(restaurant.kosher_category);
    expect(key).toContain('true'); // isSelected
  });

  it('generates different keys for different states', () => {
    const { result } = renderHook(() => useMarkerManagement({
      ...defaultProps,
      userLocation: mockUserLocation
    }));

    const restaurant = mockRestaurants[0];
    const key1 = result.current.getRestaurantKey(restaurant);
    // Change selected restaurant
    const { result: result2 } = renderHook(() => useMarkerManagement({
      ...defaultProps,
      userLocation: mockUserLocation,
      selectedRestaurantId: 1
    }));
    
    const key2 = result2.current.getRestaurantKey(restaurant);
    expect(key1).not.toBe(key2);
  });

  it('cleanupMarkers clears markers array', () => {
    const { result } = renderHook(() => useMarkerManagement(defaultProps));

    // Mock markers in the ref
    result.current.markersRef.current = [
      { setMap: jest.fn() } as any,
      { setMap: jest.fn() } as any
    ];

    act(() => {
      result.current.cleanupMarkers();
    });

    expect(result.current.markersRef.current).toHaveLength(0);
    expect(result.current.markersMapRef.current.size).toBe(0);
  });

  it('createMarker returns null for restaurant without coordinates', () => {
    const { result } = renderHook(() => useMarkerManagement(defaultProps));

    const restaurantWithoutCoords: Restaurant = {
      id: 3,
      name: 'No Coords Restaurant',
      kosher_category: 'Meat',
      rating: 4.0,
      hours: {},
      category: { name: 'Restaurant' },
      address: '789 No Coords St',
      city: 'Miami',
      state: 'FL',
      zip_code: '33103',
      phone_number: '305-555-0125',
      certifying_agency: 'Test Agency',
      listing_type: 'restaurant',
      status: 'open'
      // No latitude/longitude
    };

    const mockMap = {} as google.maps.Map;
    const marker = result.current.createMarker(restaurantWithoutCoords, mockMap);
    expect(marker).toBeNull();
  });

  it('applyClustering handles clustering correctly', () => {
    const { result } = renderHook(() => useMarkerManagement({
      ...defaultProps,
      enableClustering: true
    }));

    // Mock markers in the ref
    result.current.markersRef.current = Array(15).fill({ setMap: jest.fn() });

    const mockMap = {} as google.maps.Map;
    
    act(() => {
      result.current.applyClustering(mockMap);
    });

    // After applying clustering, a clusterer instance should exist
    expect(result.current.clustererRef.current).not.toBeNull();
  });

  it('handles clustering disabled correctly', () => {
    const { result } = renderHook(() => useMarkerManagement({
      ...defaultProps,
      enableClustering: false
    }));

    const mockMap = {} as google.maps.Map;
    
    act(() => {
      result.current.applyClustering(mockMap);
    });

    // Should not create clusterer when disabled
    expect(result.current.clustererRef.current).toBeNull();
  });
});
