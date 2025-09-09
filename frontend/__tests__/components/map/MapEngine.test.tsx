/**
 * MapEngine Tests
 * 
 * Tests the MapEngine component integration with the store.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import MapEngine from '@/components/map/MapEngine';
import type { Restaurant } from '@/types/livemap';

// Mock the GoogleMap component
jest.mock('@/components/map/vendors/GoogleMap', () => {
  return function MockGoogleMap({ 
    restaurants, 
    selectedId, 
    onSelect, 
    onBoundsChange,
    onMapReady 
  }: any) {
    React.useEffect(() => {
      // Simulate map ready
      onMapReady?.();
    }, [onMapReady]);

    return (
      <div data-testid="google-map">
        <div data-testid="restaurant-count">{restaurants.length}</div>
        <div data-testid="selected-id">{selectedId || 'none'}</div>
        {restaurants.map((restaurant: Restaurant) => (
          <button
            key={restaurant.id}
            data-testid={`restaurant-${restaurant.id}`}
            onClick={() => onSelect?.(restaurant.id)}
          >
            {restaurant.name}
          </button>
        ))}
        <button
          data-testid="bounds-change"
          onClick={() => onBoundsChange?.({
            ne: { lat: 25.8, lng: -80.1 },
            sw: { lat: 25.7, lng: -80.2 }
          })}
        >
          Change Bounds
        </button>
      </div>
    );
  };
});

// Mock the MapErrorBoundary
jest.mock('@/components/map/MapErrorBoundary', () => {
  return function MockMapErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="map-error-boundary">{children}</div>;
  };
});

// Mock the triggers
jest.mock('@/services/triggers', () => ({
  onBoundsChanged: jest.fn(),
}));

const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Test Restaurant 1',
    pos: { lat: 25.7617, lng: -80.1918 },
    kosher: 'MEAT',
  },
  {
    id: '2',
    name: 'Test Restaurant 2',
    pos: { lat: 25.7627, lng: -80.1928 },
    kosher: 'DAIRY',
  },
];

describe('MapEngine', () => {
  beforeEach(() => {
    // Reset store state
    useLivemapStore.setState({
      restaurants: [],
      filtered: [],
      selectedId: null,
      userLoc: null,
      favorites: new Set(),
      filters: {},
      loading: { restaurants: 'idle', location: 'idle' },
      error: null,
      map: { bounds: null, center: null, zoom: 12 },
    });
  });

  it('should render with empty state', () => {
    render(<MapEngine />);
    
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.getByTestId('restaurant-count')).toHaveTextContent('0');
    expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
  });

  it('should render restaurants from store', () => {
    // Set up store state
    useLivemapStore.setState({
      restaurants: mockRestaurants,
      filtered: ['1', '2'],
    });

    render(<MapEngine />);
    
    expect(screen.getByTestId('restaurant-count')).toHaveTextContent('2');
    expect(screen.getByTestId('restaurant-1')).toBeInTheDocument();
    expect(screen.getByTestId('restaurant-2')).toBeInTheDocument();
  });

  it('should show selected restaurant', () => {
    // Set up store state
    useLivemapStore.setState({
      restaurants: mockRestaurants,
      filtered: ['1', '2'],
      selectedId: '1',
    });

    render(<MapEngine />);
    
    expect(screen.getByTestId('selected-id')).toHaveTextContent('1');
  });

  it('should handle restaurant selection', async () => {
    // Set up store state
    useLivemapStore.setState({
      restaurants: mockRestaurants,
      filtered: ['1', '2'],
    });

    render(<MapEngine />);
    
    // Click on restaurant
    fireEvent.click(screen.getByTestId('restaurant-1'));
    
    // Check that store was updated
    await waitFor(() => {
      expect(useLivemapStore.getState().selectedId).toBe('1');
    });
  });

  it('should handle bounds changes', async () => {
    render(<MapEngine />);
    
    // Click bounds change button
    fireEvent.click(screen.getByTestId('bounds-change'));
    
    // Check that bounds were updated in store
    await waitFor(() => {
      const mapState = useLivemapStore.getState().map;
      expect(mapState.bounds).toEqual({
        ne: { lat: 25.8, lng: -80.1 },
        sw: { lat: 25.7, lng: -80.2 }
      });
    });
  });

  it('should filter restaurants by IDs', () => {
    // Set up store state with more restaurants than filtered
    useLivemapStore.setState({
      restaurants: [...mockRestaurants, {
        id: '3',
        name: 'Test Restaurant 3',
        pos: { lat: 25.7637, lng: -80.1938 },
        kosher: 'PAREVE',
      }],
      filtered: ['1'], // Only show restaurant 1
    });

    render(<MapEngine />);
    
    // Should only show filtered restaurants
    expect(screen.getByTestId('restaurant-count')).toHaveTextContent('1');
    expect(screen.getByTestId('restaurant-1')).toBeInTheDocument();
    expect(screen.queryByTestId('restaurant-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('restaurant-3')).not.toBeInTheDocument();
  });

  it('should handle missing restaurant data gracefully', () => {
    // Set up store state with filtered IDs that don't exist in restaurants
    useLivemapStore.setState({
      restaurants: mockRestaurants,
      filtered: ['1', '999'], // 999 doesn't exist
    });

    render(<MapEngine />);
    
    // Should only show existing restaurants
    expect(screen.getByTestId('restaurant-count')).toHaveTextContent('1');
    expect(screen.getByTestId('restaurant-1')).toBeInTheDocument();
  });

  it('should be wrapped in error boundary', () => {
    render(<MapEngine />);
    
    expect(screen.getByTestId('map-error-boundary')).toBeInTheDocument();
  });
});
