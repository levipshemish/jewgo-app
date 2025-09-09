/**
 * GoogleMap Adapter Tests
 * 
 * Tests the GoogleMap adapter component.
 */

import React from 'react';
import { render } from '@testing-library/react';
import GoogleMap from '@/components/map/vendors/GoogleMap';
import type { Restaurant } from '@/types/livemap';

// Mock Google Maps
const mockGoogleMaps = {
  Map: jest.fn().mockImplementation(() => ({
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    getBounds: jest.fn().mockReturnValue({
      getNorthEast: () => ({ lat: () => 25.8, lng: () => -80.1 }),
      getSouthWest: () => ({ lat: () => 25.7, lng: () => -80.2 }),
    }),
    addListener: jest.fn(),
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setMap: jest.fn(),
    addListener: jest.fn(),
  })),
  LatLng: jest.fn().mockImplementation((lat, lng) => ({ lat, lng })),
  MapTypeId: {
    ROADMAP: 'roadmap',
  },
  SymbolPath: {
    CIRCLE: 'circle',
  },
  event: {
    clearInstanceListeners: jest.fn(),
  },
};

// Mock the maps loader
jest.mock('@/lib/maps/loader', () => ({
  loadMaps: jest.fn().mockResolvedValue(mockGoogleMaps),
}));

// Mock Google Maps global
declare global {
  interface Window {
    google: any;
  }
}

beforeEach(() => {
  window.google = mockGoogleMaps;
});

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

describe('GoogleMap', () => {
  const defaultProps = {
    center: { lat: 25.7617, lng: -80.1918 },
    zoom: 14,
    restaurants: [],
    selectedId: null,
    onBoundsChange: jest.fn(),
    onSelect: jest.fn(),
    onMapReady: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render map container', () => {
    render(<GoogleMap {...defaultProps} />);
    
    const mapContainer = document.querySelector('div');
    expect(mapContainer).toBeInTheDocument();
  });

  it('should initialize Google Map with correct options', async () => {
    render(<GoogleMap {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async initialization
    
    expect(mockGoogleMaps.Map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        center: defaultProps.center,
        zoom: defaultProps.zoom,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: true,
        gestureHandling: 'cooperative',
      })
    );
  });

  it('should call onMapReady when map is initialized', async () => {
    render(<GoogleMap {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(defaultProps.onMapReady).toHaveBeenCalled();
  });

  it('should update map center when center prop changes', async () => {
    const { rerender } = render(<GoogleMap {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const newCenter = { lat: 25.8, lng: -80.2 };
    rerender(<GoogleMap {...defaultProps} center={newCenter} />);
    
    const mapInstance = mockGoogleMaps.Map.mock.results[0].value;
    expect(mapInstance.setCenter).toHaveBeenCalledWith(newCenter);
  });

  it('should update map zoom when zoom prop changes', async () => {
    const { rerender } = render(<GoogleMap {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    rerender(<GoogleMap {...defaultProps} zoom={16} />);
    
    const mapInstance = mockGoogleMaps.Map.mock.results[0].value;
    expect(mapInstance.setZoom).toHaveBeenCalledWith(16);
  });

  it('should create markers for restaurants', async () => {
    render(<GoogleMap {...defaultProps} restaurants={mockRestaurants} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockGoogleMaps.Marker).toHaveBeenCalledTimes(2);
  });

  it('should create user location marker when provided', async () => {
    const userLocation = { lat: 25.7617, lng: -80.1918 };
    render(<GoogleMap {...defaultProps} userLocation={userLocation} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Should create user location marker
    expect(mockGoogleMaps.Marker).toHaveBeenCalledWith(
      expect.objectContaining({
        position: userLocation,
        title: 'Your Location',
      })
    );
  });

  it('should handle restaurant selection', async () => {
    render(<GoogleMap {...defaultProps} restaurants={mockRestaurants} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Get the marker click listener
    const markerInstance = mockGoogleMaps.Marker.mock.results[0].value;
    const clickListener = markerInstance.addListener.mock.calls.find(
      call => call[0] === 'click'
    )?.[1];
    
    // Simulate marker click
    clickListener?.();
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith('1');
  });

  it('should handle bounds changes', async () => {
    render(<GoogleMap {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Get the bounds change listener
    const mapInstance = mockGoogleMaps.Map.mock.results[0].value;
    const boundsListener = mapInstance.addListener.mock.calls.find(
      call => call[0] === 'bounds_changed'
    )?.[1];
    
    // Simulate bounds change
    boundsListener?.();
    
    expect(defaultProps.onBoundsChange).toHaveBeenCalledWith({
      ne: { lat: 25.8, lng: -80.1 },
      sw: { lat: 25.7, lng: -80.2 },
    });
  });

  it('should clean up markers on unmount', async () => {
    const { unmount } = render(<GoogleMap {...defaultProps} restaurants={mockRestaurants} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    unmount();
    
    // Check that markers were cleaned up
    const markerInstances = mockGoogleMaps.Marker.mock.results.map(r => r.value);
    markerInstances.forEach(marker => {
      expect(marker.setMap).toHaveBeenCalledWith(null);
    });
  });

  it('should clean up map on unmount', async () => {
    const { unmount } = render(<GoogleMap {...defaultProps} />);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    unmount();
    
    const mapInstance = mockGoogleMaps.Map.mock.results[0].value;
    expect(mockGoogleMaps.event.clearInstanceListeners).toHaveBeenCalledWith(mapInstance);
  });
});
